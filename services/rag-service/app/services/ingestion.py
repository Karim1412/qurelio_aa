import copy
import io
import logging
from typing import Tuple, List, Any

import httpx
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone, ServerlessSpec

from app.config import get_settings
from app.models.schemas import IngestRequest
from app.services.storage import StorageService
from app.services.structure_openai import flatten_for_search, structure_content
from app.services.segment_patterns import merge_iso_sections, segment_by_numbered_headings

logger = logging.getLogger(__name__)
settings = get_settings()

_MAX_STORED_SECTIONS = 150
_MAX_STORED_SECTION_CONTENT = 12_000


def _trim_structured_for_storage(structured: dict) -> dict:
    """Cap section size/count so RAG→document-service JSON stays under body limits and jsonb is practical."""
    s = copy.deepcopy(structured)
    secs = s.get("sections")
    if isinstance(secs, list):
        out: List[dict] = []
        for item in secs[:_MAX_STORED_SECTIONS]:
            if not isinstance(item, dict):
                continue
            c = str(item.get("content") or "")
            if len(c) > _MAX_STORED_SECTION_CONTENT:
                c = c[:_MAX_STORED_SECTION_CONTENT] + "…"
            bullets = item.get("bullets") if isinstance(item.get("bullets"), list) else []
            bullets = [str(b)[:4000] for b in bullets[:60]]
            out.append(
                {
                    "clauseNumber": item.get("clauseNumber"),
                    "heading": str(item.get("heading") or "")[:512],
                    "content": c,
                    "bullets": bullets,
                }
            )
        s["sections"] = out
    kps = s.get("keyPoints")
    if isinstance(kps, list):
        s["keyPoints"] = [str(x)[:4000] for x in kps[:200]]
    return s


class IngestionService:
    def __init__(self):
        self.storage = StorageService()
        embedding_api_key = (settings.EMBEDDING_API_KEY or "").strip() or settings.OPENAI_API_KEY
        embedding_base_url = (settings.EMBEDDING_BASE_URL or "").strip() or settings.OPENAI_BASE_URL
        self.embeddings = OpenAIEmbeddings(
            api_key=embedding_api_key,
            openai_api_base=embedding_base_url,
            model=settings.EMBEDDING_MODEL,
        )
        logger.info(
            "Embeddings configured with base_url=%s model=%s",
            embedding_base_url,
            settings.EMBEDDING_MODEL,
        )
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
        # Pinecone connection is best-effort at startup. If DNS/api.pinecone.io is
        # unreachable when the container boots (e.g. transient network glitch on
        # the Docker host), don't crash the whole rag-service — defer the index
        # attach to the first call that actually needs it. Routes that don't use
        # vectors (health, SSE evaluation streams) keep working in the meantime.
        self._pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.index = None
        try:
            self._ensure_pinecone_index()
        except Exception as e:
            logger.warning(
                "Pinecone unreachable at startup (%s) — service started in degraded mode; "
                "indexing/search will retry connecting on first call.",
                e,
            )

    def _ensure_pinecone_index(self):
        """Lazily attach the Pinecone index. Safe to call repeatedly."""
        if self.index is not None:
            return self.index
        existing = [i.name for i in self._pc.list_indexes()]
        if settings.PINECONE_INDEX_NAME not in existing:
            self._pc.create_index(
                name=settings.PINECONE_INDEX_NAME,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        self.index = self._pc.Index(settings.PINECONE_INDEX_NAME)
        return self.index

    def _extract(self, data: bytes, mime: str) -> Tuple[str, int]:
        if "pdf" in mime:
            from pypdf import PdfReader

            try:
                from app.services.pdf_text_normalize import normalize_pdf_extracted_text, pick_best_pypdf_page_text
            except Exception:  # pragma: no cover
                pick_best_pypdf_page_text = None  # type: ignore[assignment]
                normalize_pdf_extracted_text = None  # type: ignore[assignment]

            r = PdfReader(io.BytesIO(data))
            if pick_best_pypdf_page_text and normalize_pdf_extracted_text:
                raw = "\n\n".join(pick_best_pypdf_page_text(p) for p in r.pages)
                text = normalize_pdf_extracted_text(raw)
            else:
                text = "\n\n".join(p.extract_text() or "" for p in r.pages)
            return text, len(r.pages)

        if "openxmlformats" in mime or "docx" in mime:
            from docx import Document

            d = Document(io.BytesIO(data))
            return "\n".join(p.text for p in d.paragraphs if p.text.strip()), 1

        if "msword" in mime:
            try:
                text = data.decode("latin-1", errors="ignore")
                import re

                text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", " ", text)
                text = re.sub(r"\s+", " ", text).strip()
                if not text:
                    raise ValueError("No readable text in .doc file")
                return text, 1
            except Exception as e:
                raise ValueError(f"Cannot extract .doc file: {e}")

        if "spreadsheetml.sheet" in mime or mime.endswith("ms-excel"):
            try:
                from openpyxl import load_workbook
            except ImportError as e:
                raise ValueError("openpyxl is required for XLSX") from e
            wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
            lines: List[str] = []
            for sheet in wb.worksheets:
                lines.append(f"## {sheet.title}")
                for row in sheet.iter_rows(max_row=500, max_col=50, values_only=True):
                    cells = [str(c).strip() for c in row if c is not None and str(c).strip()]
                    if cells:
                        lines.append("\t".join(cells))
            wb.close()
            text = "\n".join(lines).strip()
            if not text:
                raise ValueError("No readable cells in spreadsheet")
            return text, 1

        if mime.startswith("image/"):
            import pytesseract
            from PIL import Image

            return pytesseract.image_to_string(Image.open(io.BytesIO(data))), 1

        raise ValueError(f"Unsupported mime type: {mime}")

    async def _patch_document_extraction(
        self,
        document_id: str,
        company_id: str,
        status: str,
        extracted_text: str | None = None,
        extracted_structured: dict | None = None,
        processing_error: str | None = None,
    ) -> None:
        base = settings.DOCUMENT_SERVICE_URL.rstrip("/")
        url = f"{base}/api/documents/internal/extraction/{document_id}"
        token = (settings.DOCUMENT_INTERNAL_TOKEN or "").strip()
        if not token:
            logger.warning("DOCUMENT_INTERNAL_TOKEN not set; callback to document-service may fail")
        payload: dict[str, Any] = {
            "company_id": company_id,
            "status": status,
            "extracted_text": extracted_text,
            "extracted_structured": extracted_structured,
            "processing_error": processing_error,
        }
        async with httpx.AsyncClient() as client:
            r = await client.patch(
                url,
                json=payload,
                headers={"X-Internal-Token": token},
                timeout=60.0,
            )
            if r.is_error:
                body = (r.text or "")[:500]
                logger.error(
                    "document-service callback failed: %s %s — %s (set matching DOCUMENT_INTERNAL_TOKEN on both services)",
                    r.status_code,
                    url,
                    body,
                )
            r.raise_for_status()

    async def _embed_document_chunks(self, chunks: List[str]) -> List[List[float]] | None:
        """Embed in small batches; OpenRouter sometimes returns null `data` for wrong model names."""
        if not chunks:
            return []
        out: List[List[float]] = []
        batch_size = 16
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            try:
                vecs = await self.embeddings.aembed_documents(batch)
            except (TypeError, ValueError) as e:
                logger.warning("Embedding API error (batch %s-%s): %s", i, i + len(batch), e)
                return None
            except Exception as e:
                logger.warning("Embedding failed (batch %s-%s): %s", i, i + len(batch), e)
                return None
            if not vecs or len(vecs) != len(batch):
                logger.warning(
                    "Embedding response invalid: got %s vectors for %s chunks — check EMBEDDING_MODEL "
                    "(OpenRouter: use openai/text-embedding-3-small)",
                    len(vecs or []),
                    len(batch),
                )
                return None
            out.extend(vecs)
        return out

    async def _index_vectors(
        self,
        document_id: str,
        company_id: str,
        text: str,
        doc_type: str,
        iso_standard: str | None,
    ) -> int:
        text = (text or "").strip()
        if not text:
            logger.info("Skipping Pinecone upsert: no text for doc %s", document_id)
            return 0

        chunks = self.splitter.split_text(text)
        if not chunks:
            return 0

        vectors = await self._embed_document_chunks(chunks)
        if vectors is None:
            logger.error(
                "Vector indexing skipped for %s — document stays READY but not searchable. "
                "Set EMBEDDING_MODEL=openai/text-embedding-3-small when using OpenRouter.",
                document_id,
            )
            return 0

        batch = [
            {
                "id": f"{company_id}::{document_id}::c{i}",
                "values": v,
                "metadata": {
                    "company_id": company_id,
                    "document_id": document_id,
                    "doc_type": doc_type,
                    "iso_standard": iso_standard or "",
                    "chunk_index": i,
                    "text": chunks[i][:800],
                },
            }
            for i, v in enumerate(vectors)
        ]
        # Pinecone (and gRPC) reject payloads > ~4MB; large PDFs can produce thousands of vectors in one call.
        upsert_chunk = 40
        index = self._ensure_pinecone_index()
        for start in range(0, len(batch), upsert_chunk):
            index.upsert(vectors=batch[start : start + upsert_chunk], namespace=company_id)
        logger.info("Indexed %s chunks for doc %s", len(batch), document_id)
        return len(batch)

    async def run_full_pipeline(self, req: IngestRequest) -> None:
        """Download → extract text → OpenAI JSON structure → callback document-service → Pinecone."""
        doc_id = req.document_id
        company_id = req.company_id
        mime = req.mime_type
        doc_type = req.doc_type.value if hasattr(req.doc_type, "value") else str(req.doc_type)
        file_name = req.file_name or "document"
        description = req.description or ""

        try:
            raw = self.storage.download(req.storage_key)
        except Exception as e:
            logger.exception("Download failed for %s", doc_id)
            try:
                await self._patch_document_extraction(
                    doc_id,
                    company_id,
                    "FAILED",
                    processing_error=f"Could not fetch file from storage: {e}",
                )
            except Exception:
                logger.exception("Callback after download failure failed")
            return

        raw_text = ""
        extract_err: Exception | None = None
        for attempt in range(3):
            try:
                raw_text, _pages = self._extract(raw, mime)
                raw_text = (raw_text or "").strip()
                extract_err = None
                break
            except Exception as e:
                extract_err = e
                logger.warning("Extract attempt %s/3 for %s: %s", attempt + 1, doc_id, e)
        if extract_err is not None:
            try:
                await self._patch_document_extraction(
                    doc_id,
                    company_id,
                    "FAILED",
                    processing_error=f"Extraction failed after 3 attempts: {extract_err}"[:2000],
                )
            except Exception:
                logger.exception("Callback after extraction failure failed")
            return

        structured: dict | None = None
        struct_err: Exception | None = None
        for attempt in range(3):
            try:
                structured = await structure_content(
                    raw_text=raw_text,
                    buffer=raw,
                    mime_type=mime,
                    file_name=file_name,
                    doc_type=doc_type,
                    iso_hint=req.iso_standard,
                    description_hint=description or None,
                )
                struct_err = None
                break
            except Exception as e:
                struct_err = e
                logger.warning("structure_content attempt %s/3 for %s: %s", attempt + 1, doc_id, e)
        if struct_err is not None or structured is None:
            try:
                await self._patch_document_extraction(
                    doc_id,
                    company_id,
                    "FAILED",
                    processing_error=str(struct_err)[:2000] if struct_err else "Structure failed",
                )
            except Exception:
                logger.exception("Callback after structure failure failed")
            return

        if doc_type == "ISO_NORM":
            pattern_secs = segment_by_numbered_headings(raw_text)
            merged = merge_iso_sections(structured.get("sections"), pattern_secs)
            structured["sections"] = merged

        structured = _trim_structured_for_storage(structured)
        flattened = flatten_for_search(raw_text, structured)
        extracted_text = flattened[:65000] if flattened else None

        try:
            await self._patch_document_extraction(
                doc_id,
                company_id,
                "READY",
                extracted_text=extracted_text,
                extracted_structured=structured,
            )
        except Exception as e:
            logger.exception("Callback to document-service failed for %s: %s", doc_id, e)
            return

        # STD-006: ISO norms are indexed only after QM activates (see /api/index-standard).
        if doc_type != "ISO_NORM":
            try:
                await self._index_vectors(
                    doc_id,
                    company_id,
                    flattened or raw_text,
                    doc_type,
                    req.iso_standard,
                )
            except Exception as e:
                logger.exception("Vector indexing failed for %s (document already READY): %s", doc_id, e)

    async def index_standard_clause_text(
        self,
        document_id: str,
        company_id: str,
        text: str,
        doc_type: str,
        iso_standard: str | None,
        file_name: str | None = None,
        version: int | None = None,
    ) -> int:
        """Replace vectors for a standard with clause-aligned text (activation)."""
        await self.delete(document_id, company_id)
        return await self._index_vectors(document_id, company_id, text, doc_type, iso_standard)

    async def search(
        self,
        query: str,
        company_id: str,
        top_k: int = 6,
        filter: dict | None = None,
        document_ids_in: list[str] | None = None,
    ) -> list:
        qv = await self.embeddings.aembed_query(query)
        if document_ids_in is not None and len(document_ids_in) > 0:
            if len(document_ids_in) == 1:
                pf = {"document_id": {"$eq": document_ids_in[0]}}
            else:
                pf = {"document_id": {"$in": document_ids_in}}
        elif filter:
            pf = {k: {"$eq": v} for k, v in filter.items()}
        else:
            pf = None
        index = self._ensure_pinecone_index()
        results = index.query(
            vector=qv,
            top_k=top_k,
            namespace=company_id,
            include_metadata=True,
            filter=pf,
        )
        return results.matches or []

    async def delete(self, document_id: str, company_id: str):
        try:
            index = self._ensure_pinecone_index()
            index.delete(
                filter={"document_id": {"$eq": document_id}},
                namespace=company_id,
            )
            logger.info("Vectors deleted for doc %s", document_id)
        except Exception as e:
            logger.warning("Vector delete failed for %s: %s", document_id, e)
