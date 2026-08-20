import copy
import io
import logging
import re
from typing import Tuple, List, Any

import httpx
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone, ServerlessSpec

from app.config import get_settings
from app.models.schemas import IngestRequest
from app.services.storage import StorageService
from app.services.structure_openai import extract_onboarding, flatten_for_search, structure_content
from app.services.copyright_scan import scan_for_licensed_content, describe as describe_copyright
from app.services.segment_patterns import merge_iso_sections, segment_by_numbered_headings

logger = logging.getLogger(__name__)
settings = get_settings()

_MAX_STORED_SECTIONS = 150
_MAX_STORED_SECTION_CONTENT = 12_000
# Vector width of the configured embedding model. text-embedding-3-small (and ada-002)
# emit 1536; the Pinecone index must match or every upsert is rejected.
EMBEDDING_DIMENSION = 1536
# Upper bound on the extracted text persisted on the document row. Must comfortably
# hold a full standard: this text is what a standard is re-indexed from.
_MAX_EXTRACTED_TEXT = 2_000_000


def _clean_clause_ref(ref: str) -> str:
    """Collapse a clause id the heading regex captured more than once.

    PDF annex pages repeat their header on consecutive lines, and the greedy
    heading pattern swallows every copy — "ANNEX X ANNEX X ANNEX X ANNEX X".
    Handles any repeat count, not just doubling.
    """
    r = " ".join((ref or "").split())
    if not r:
        return ""
    words = r.split(" ")
    n = len(words)
    # Smallest repeating unit that tiles the whole sequence wins.
    for size in range(1, n // 2 + 1):
        if n % size:
            continue
        unit = [w.lower() for w in words[:size]]
        if all(
            [w.lower() for w in words[i : i + size]] == unit for i in range(0, n, size)
        ):
            return " ".join(words[:size])
    return r


# A numbered point inside a section: "1.", "2)", "3.1", "3.1." — these carry the
# actual requirements, and their numbers are the clause versions an auditor cites.
_NUMBERED_POINT = re.compile(r"^\s*(\d{1,2}(?:\.\d{1,3}){0,3})\s*[.)]?\s+(?=\S)")
# Lettered sub-item: "(a) …" / "a) …"
_LETTER_POINT = re.compile(r"^\s*\(?([a-z])\)\s+(?=\S)")


def _split_numbered_points(body: str) -> List[Tuple[str, str]]:
    """Split a section body into its numbered points.

    Returns [(ref, text)] where ref is "1", "3.1", "3.1 (a)" … Empty when the body
    carries no numbering, in which case the caller indexes the section whole.
    """
    lines = (body or "").splitlines()
    points: List[Tuple[str, List[str]]] = []
    for line in lines:
        m = _NUMBERED_POINT.match(line)
        if m:
            points.append((m.group(1), [line[m.end() :].strip()]))
            continue
        lm = _LETTER_POINT.match(line)
        if lm and points:
            parent = points[-1][0].split(" ")[0]
            points.append((f"{parent} ({lm.group(1)})", [line[lm.end() :].strip()]))
            continue
        if points:
            points[-1][1].append(line)
    out: List[Tuple[str, str]] = []
    for ref, chunk in points:
        text = "\n".join(chunk).strip()
        if len(text) >= 40:  # skip stray numbering with no requirement behind it
            out.append((ref, text))
    return out


def _clean_clause_title(ref: str, heading: str) -> str:
    """Heading text with its own clause number stripped off.

    The segmenter returns the whole header line when a heading carries no text
    after the number, which rendered as "ANNEX II ANNEX II" in the worksheet.
    """
    t = (heading or "").strip()
    r = (ref or "").strip()
    if not t or not r:
        return t[:300]
    if t.lower().startswith(r.lower()):
        t = t[len(r):].strip(" .:-—–\t")
    return "" if t.lower() == r.lower() else t[:300]


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
        # Kept for log messages: an embedding 401 is almost always a key/base-url
        # mismatch, and naming the endpoint in the error saves the whole diagnosis.
        self._embedding_base_url = embedding_base_url
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
        """Lazily attach the Pinecone index. Safe to call repeatedly.

        The dimension is only applied when this process CREATES the index. An index
        that already exists keeps whatever dimension it was created with, so it is
        checked here: attaching to a mismatched index made every upsert fail while
        ingestion still reported success, and the whole corpus stayed unsearchable
        with nothing in the logs pointing at the cause.
        """
        if self.index is not None:
            return self.index
        existing = {i.name: i for i in self._pc.list_indexes()}
        if settings.PINECONE_INDEX_NAME not in existing:
            self._pc.create_index(
                name=settings.PINECONE_INDEX_NAME,
                dimension=EMBEDDING_DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        else:
            found = getattr(existing[settings.PINECONE_INDEX_NAME], "dimension", None)
            if found and int(found) != EMBEDDING_DIMENSION:
                raise RuntimeError(
                    f"Pinecone index '{settings.PINECONE_INDEX_NAME}' has dimension "
                    f"{found}, but embedding model '{settings.EMBEDDING_MODEL}' emits "
                    f"{EMBEDDING_DIMENSION}. Every upsert would be rejected. Point "
                    "PINECONE_INDEX_NAME at an index of the right dimension (or delete "
                    "the mismatched one so it can be recreated)."
                )
        self.index = self._pc.Index(settings.PINECONE_INDEX_NAME)
        return self.index

    def _extract_page_texts(self, data: bytes, mime: str) -> list[str] | None:
        """Per-page text for PDFs, so each vector can carry the page it came from.

        Audit justifications must cite evidence as "<file>, p. N"; without a page on
        the chunk the model can only name the file. Returns None for formats with no
        meaningful pagination (docx, plain text), where chunking stays whole-document.
        """
        if "pdf" not in mime:
            return None
        try:
            from pypdf import PdfReader

            try:
                from app.services.pdf_text_normalize import (
                    normalize_pdf_extracted_text,
                    pick_best_pypdf_page_text,
                )
            except Exception:  # pragma: no cover
                pick_best_pypdf_page_text = None  # type: ignore[assignment]
                normalize_pdf_extracted_text = None  # type: ignore[assignment]

            reader = PdfReader(io.BytesIO(data))
            pages: list[str] = []
            for p in reader.pages:
                if pick_best_pypdf_page_text and normalize_pdf_extracted_text:
                    pages.append(normalize_pdf_extracted_text(pick_best_pypdf_page_text(p)))
                else:
                    pages.append(p.extract_text() or "")
            return pages
        except Exception as e:
            logger.warning("Per-page PDF extraction failed (%s) — indexing without pages", e)
            return None

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
        copyright_finding: str | None = None,
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
            # Set when the OCR'd text looks like a reproduced licensed standard.
            "copyright_finding": copyright_finding,
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
                # error(), not warning(): nothing downstream can work without vectors,
                # and this was previously easy to miss in a healthy-looking log.
                logger.error(
                    "Embedding API error (batch %s-%s) with base_url=%s model=%s: %s",
                    i, i + len(batch), self._embedding_base_url, settings.EMBEDDING_MODEL, e,
                )
                return None
            except Exception as e:
                logger.error(
                    "Embedding failed (batch %s-%s) with base_url=%s model=%s: %s — a 401 here "
                    "usually means EMBEDDING_BASE_URL and EMBEDDING_API_KEY belong to different "
                    "providers; leave both blank to inherit the working OPENAI_* pair.",
                    i, i + len(batch), self._embedding_base_url, settings.EMBEDDING_MODEL, e,
                )
                return None
            if not vecs or len(vecs) != len(batch):
                logger.error(
                    "Embedding response invalid: got %s vectors for %s chunks — check EMBEDDING_MODEL "
                    "(OpenRouter: use openai/text-embedding-3-small)",
                    len(vecs or []),
                    len(batch),
                )
                return None
            width = len(vecs[0]) if vecs and vecs[0] else 0
            if width != EMBEDDING_DIMENSION:
                logger.error(
                    "Embedding model '%s' returned %d-dimension vectors but the index expects "
                    "%d — refusing to upsert vectors Pinecone would reject.",
                    settings.EMBEDDING_MODEL, width, EMBEDDING_DIMENSION,
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
        file_name: str | None = None,
        page_texts: list[str] | None = None,
        clause_aware: bool = False,
    ) -> int:
        text = (text or "").strip()
        if not text and not page_texts:
            logger.info("Skipping Pinecone upsert: no text for doc %s", document_id)
            return 0

        chunks: list[str] = []
        chunk_pages: list[int] = []
        chunk_refs: list[str] = []
        chunk_titles: list[str] = []

        # Standards are indexed clause-by-clause so a clause's own text can be
        # fetched by exact reference. Retrieving it by semantic similarity pulls in
        # cross-references from neighbouring clauses, which made the auditor title
        # clauses after whatever number appeared in the noise.
        if clause_aware and text:
            for sec in segment_by_numbered_headings(text) or []:
                ref = _clean_clause_ref(sec.get("clauseNumber") or "")
                # A real clause id is short; long "refs" are cross-reference
                # sentences the heading regex mistook for a heading.
                if not ref or len(ref) > 24:
                    continue
                title = _clean_clause_title(ref, _clean_clause_ref(sec.get("heading") or ""))
                body = (sec.get("content") or "").strip()

                # Prefer the numbered points inside the section: those are the
                # auditable requirements, and their numbers ("3.1", "3.1 (a)") are
                # the clause versions an auditor cites — not the section header.
                points = _split_numbered_points(body)
                if points:
                    section_title = title or _clean_clause_ref(ref)
                    for point_ref, point_text in points:
                        for c in self.splitter.split_text(
                            f"{point_ref} {section_title}\n{point_text}".strip()
                        ):
                            chunks.append(c)
                            chunk_pages.append(0)
                            chunk_refs.append(point_ref)
                            chunk_titles.append(section_title[:300])
                    continue

                # Heading-only section: keep it so the worksheet still shows the
                # non-normative title row.
                for c in self.splitter.split_text(f"{ref} {title}\n{body}".strip()):
                    chunks.append(c)
                    chunk_pages.append(0)
                    chunk_refs.append(ref)
                    chunk_titles.append(title[:300])
            if chunks:
                logger.info(
                    "Clause-aligned index for doc %s: %d clause chunk(s)", document_id, len(chunks)
                )

        # Chunk page-by-page when pagination is known, so every chunk keeps its page.
        if not chunks and page_texts:
            for page_no, page_text in enumerate(page_texts, start=1):
                for c in self.splitter.split_text((page_text or "").strip()):
                    chunks.append(c)
                    chunk_pages.append(page_no)
                    chunk_refs.append("")
                    chunk_titles.append("")
        if not chunks:
            chunks = self.splitter.split_text(text)
            chunk_pages = [0] * len(chunks)
            chunk_refs = [""] * len(chunks)
            chunk_titles = [""] * len(chunks)
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
                    # Carried so audit justifications can cite the source document by
                    # name and page rather than by opaque UUID. page 0 = unpaginated.
                    "file_name": file_name or "",
                    "page": chunk_pages[i] if i < len(chunk_pages) else 0,
                    # Exact clause this chunk belongs to (standards only).
                    "clause_ref": chunk_refs[i] if i < len(chunk_refs) else "",
                    "clause_title": chunk_titles[i] if i < len(chunk_titles) else "",
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

        # Product-wizard pre-fill: its own pass, so the provider's max_tokens ceiling
        # on the main structuring response cannot truncate it away.
        if doc_type in ("PRODUCT_DOC", "EVIDENCE"):
            try:
                onboarding = await extract_onboarding(
                    raw_text=raw_text,
                    file_name=file_name,
                    description_hint=description or None,
                )
            except Exception:
                logger.exception("Onboarding pre-fill failed for %s", doc_id)
                onboarding = None
            if onboarding:
                profile = structured.get("productProfile")
                if not isinstance(profile, dict):
                    profile = {}
                profile["onboarding"] = onboarding
                structured["productProfile"] = profile
                logger.info(
                    "Onboarding pre-fill for %s: %s field(s)", doc_id, len(onboarding)
                )

        structured = _trim_structured_for_storage(structured)
        flattened = flatten_for_search(raw_text, structured)
        # Standards are re-indexed from this stored text on activation, so a tight
        # cap silently truncated them to the preamble — the normative clauses and
        # annexes never reached the vector store and evaluations found no clauses.
        # extracted_text is a Postgres `text` column and the callback body limit is
        # 25 MB, so this bound only guards against pathological files.
        extracted_text = flattened[:_MAX_EXTRACTED_TEXT] if flattened else None
        if flattened and len(flattened) > _MAX_EXTRACTED_TEXT:
            logger.warning(
                "Extracted text for %s truncated from %d to %d characters",
                doc_id,
                len(flattened),
                _MAX_EXTRACTED_TEXT,
            )

        # ── Copyright guardrail ───────────────────────────────────────────────
        # Runs before any vector write: a reproduced licensed standard must not
        # reach Pinecone. The title check at upload cannot see inside a
        # mislabelled scan, so this reads the extracted text instead.
        finding = scan_for_licensed_content(raw_text)
        copyright_note = describe_copyright(finding) if finding else None
        if finding:
            logger.warning(
                "Copyright guardrail: quarantining %s — rule=%s evidence=%r",
                doc_id, finding.rule, finding.evidence[:120],
            )

        try:
            await self._patch_document_extraction(
                doc_id,
                company_id,
                "READY",
                extracted_text=extracted_text,
                extracted_structured=structured,
                copyright_finding=copyright_note,
            )
        except Exception as e:
            logger.exception("Callback to document-service failed for %s: %s", doc_id, e)
            return

        if copyright_note:
            # Quarantined: no vectors. A Quality Manager must accept responsibility
            # (or delete it) before it can be indexed or activated.
            logger.warning("Skipping vector indexing for quarantined document %s", doc_id)
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
                    file_name=file_name,
                    # PDFs index page-by-page so evidence can be cited as "<file>, p. N".
                    page_texts=self._extract_page_texts(raw, mime),
                    clause_aware=(doc_type == "ISO_NORM"),
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
        return await self._index_vectors(
            document_id,
            company_id,
            text,
            doc_type,
            iso_standard,
            file_name=file_name,
            clause_aware=True,
        )

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
        """Remove every vector of a document.

        Serverless Pinecone indexes do NOT support delete-by-metadata-filter, so
        the old filter call silently left the vectors in place and each re-index
        stacked a fresh copy on top of the previous one. Vector ids are
        deterministic (``{company}::{document}::c{n}``), so delete by id prefix and
        keep the filter form only as a fallback for pod-based indexes.
        """
        index = self._ensure_pinecone_index()
        prefix = f"{company_id}::{document_id}::"
        deleted = 0
        try:
            ids: list[str] = []
            for page in index.list(prefix=prefix, namespace=company_id):
                ids.extend(page if isinstance(page, list) else [page])
            for start in range(0, len(ids), 1000):
                index.delete(ids=ids[start : start + 1000], namespace=company_id)
                deleted += len(ids[start : start + 1000])
            if deleted:
                logger.info("Deleted %d vector(s) for doc %s", deleted, document_id)
                return
        except Exception as e:
            logger.warning("Prefix delete unavailable for %s (%s) — trying filter", document_id, e)

        try:
            index.delete(filter={"document_id": {"$eq": document_id}}, namespace=company_id)
            logger.info("Vectors deleted by filter for doc %s", document_id)
        except Exception as e:
            logger.warning("Vector delete failed for %s: %s", document_id, e)
