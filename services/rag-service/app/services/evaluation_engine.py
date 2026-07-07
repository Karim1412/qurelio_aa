import asyncio
import json
import logging
import re
from typing import Any, List, Optional

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

from app.config import get_settings
from app.models.schemas import ClauseResult, EvaluateResponse, EvidenceExcerpt
from app.services.event_bus import get_event_bus
from app.services.ingestion import IngestionService

logger = logging.getLogger(__name__)
settings = get_settings()


UUID_PATTERN = re.compile(
    r"\[?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]?,?\s*[:;]?\s*\d*\s*",
    re.IGNORECASE,
)
PATH_ENCODED = re.compile(r"/[a-z0-9]{2,4}(?:/[a-z0-9]{2,4})+\s*", re.IGNORECASE)


def _clean_excerpt(text: str) -> str:
    """Remove UUIDs, path-encoded noise, and page-number markers from raw chunk text."""
    s = (text or "").strip()
    s = UUID_PATTERN.sub("", s).strip()
    s = PATH_ENCODED.sub("", s).strip()
    s = re.sub(r"^\d{1,2}/\d{1,2}\s*$", "", s).strip()
    s = re.sub(r"^\d+$", "", s).strip()
    s = re.sub(r"\n{2,}", "\n", s)
    return s.strip()

ISO_9001_CLAUSES = [
    ("4.1", "Context of the Organization"),
    ("4.2", "Interested Parties"),
    ("4.4", "Quality Management System"),
    ("5.1", "Leadership Commitment"),
    ("5.2", "Quality Policy"),
    ("6.1", "Risks and Opportunities"),
    ("6.2", "Quality Objectives"),
    ("7.1", "Resources"),
    ("7.2", "Competence"),
    ("7.5", "Documented Information"),
    ("8.1", "Operational Planning"),
    ("8.4", "External Providers"),
    ("8.5", "Production/Service Provision"),
    ("9.1", "Monitoring & Measurement"),
    ("9.2", "Internal Audit"),
    ("9.3", "Management Review"),
    ("10.2", "Nonconformity & CA"),
    ("10.3", "Continual Improvement"),
]

PROMPT = ChatPromptTemplate.from_template(
    """You are an ISO 9001 lead auditor performing a rigorous clause-by-clause conformity assessment.

STANDARD CLAUSE: {clause_reference}

REQUIREMENT TEXT (excerpt):
{standard_excerpt}

EVIDENCE CHUNKS (retrieved by semantic similarity from approved evidence documents):
{evidence_chunks}

TASK - Perform systematic analysis:
1. BREAK DOWN the clause into specific requirement elements (what exactly must be satisfied)
2. For EACH evidence chunk, assess: relevance (high/medium/low), whether it supports or contradicts, which requirement elements it covers
3. MAP each requirement element to supporting/contradicting evidence
4. IDENTIFY gaps where evidence is missing, insufficient, or contradictory
5. PROVIDE specific, actionable recommendations for each gap
6. DETERMINE overall verdict with confidence

RESPOND ONLY WITH VALID JSON:
{{
  "reasoning": "Step-by-step analysis: how you broke down the clause, which evidence supports which elements, where gaps exist",
  "requirement_elements": [
    {{"element": "specific requirement from clause text", "evidence_refs": [1,3], "status": "covered|partial|missing", "notes": "explanation of coverage"}}
  ],
  "confidence": 0.0-1.0,
  "verdict": "SATISFIED|PARTIALLY_SATISFIED|NOT_SATISFIED",
  "clause_title": "Clear short title (e.g., 'Context of the Organization', not 'Clause 4.1')",
  "clause_summary": "One concise sentence (<30 words) describing what this clause requires",
  "gaps": ["specific gap 1 with clause reference", "specific gap 2"],
  "suggestions": ["actionable recommendation 1", "actionable recommendation 2"],
  "evidence_assessment": [
    {{"chunk_id": 1, "relevance": "high|medium|low", "supports": true, "covers_elements": ["element description"]}}
  ]
}}

RULES:
- clause_title: Clear short title based on standard text. NEVER write "Clause X.X"
- clause_summary: ONE proper sentence (<30 words) describing the requirement
- SATISFIED: ALL requirement elements clearly addressed by evidence
- PARTIALLY_SATISFIED: Some elements covered, others partial/missing
- NOT_SATISFIED: Critical elements missing or contradicted
- confidence: Your certainty (0.0-1.0)
- reasoning: Transparent audit trail for your conclusion
- evidence_refs: 1-based indices matching the evidence chunks provided
- status values MUST be exactly: "covered", "partial", or "missing" """
)


def _verdict_weight(v: str) -> float:
    u = (v or "").upper()
    if u == "SATISFIED":
        return 1.0
    if u == "PARTIALLY_SATISFIED":
        return 0.5
    return 0.0


def _resolve_clause_weight(ref: str, clause_weights: Optional[dict[str, Any]]) -> float:
    """EVAL-004: exact id, `4.*`, section `4`, or `group:4.1` — most specific match wins."""
    if not clause_weights:
        return 1.0
    if ref in clause_weights:
        return float(clause_weights[ref])
    best_spec = -1
    best_w = 1.0
    for k, v in clause_weights.items():
        if not isinstance(k, str):
            continue
        try:
            w = float(v)
        except (TypeError, ValueError):
            continue
        spec = -1
        if k.endswith(".*"):
            p = k[:-2]
            if ref == p or ref.startswith(p + "."):
                spec = len(p)
        elif k.startswith("group:"):
            g = k[6:]
            if ref == g or ref.startswith(g + "."):
                spec = 1000 + len(g)
        elif "." not in k:
            if ref == k or ref.startswith(k + "."):
                spec = len(k)
        if spec > best_spec:
            best_spec = spec
            best_w = w
    return best_w if best_spec >= 0 else 1.0


def _weighted_overall(
    results: List[ClauseResult],
    clause_weights: Optional[dict[str, Any]],
) -> float:
    if not results:
        return 0.0
    if clause_weights:
        tw = 0.0
        acc = 0.0
        for r in results:
            w = _resolve_clause_weight(r.clause_reference, clause_weights)
            tw += w
            acc += w * _verdict_weight(r.verdict)
        return round(100.0 * acc / tw, 2) if tw else 0.0
    n = len(results)
    acc = sum(_verdict_weight(r.verdict) for r in results)
    return round(100.0 * acc / n, 2) if n else 0.0


def _parse_llm_json(content: str) -> dict[str, Any]:
    text = (content or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9]*\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text).strip()
    return json.loads(text)


def _validate_llm_response(data: dict[str, Any]) -> tuple[bool, str]:
    """Validate LLM response structure and content."""
    required_fields = ["confidence", "verdict", "clause_title", "clause_summary", "gaps", "suggestions"]
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    verdict = str(data.get("verdict", "")).upper()
    if verdict not in ("SATISFIED", "PARTIALLY_SATISFIED", "NOT_SATISFIED"):
        return False, f"Invalid verdict: {verdict}"
    
    confidence = data.get("confidence")
    if not isinstance(confidence, (int, float)) or not (0.0 <= float(confidence) <= 1.0):
        return False, f"Invalid confidence: {confidence}"
    
    gaps = data.get("gaps")
    if not isinstance(gaps, list):
        return False, "gaps must be a list"
    
    suggestions = data.get("suggestions")
    if not isinstance(suggestions, list):
        return False, "suggestions must be a list"
    
    req_elements = data.get("requirement_elements")
    if req_elements is not None and not isinstance(req_elements, list):
        return False, "requirement_elements must be a list"
    
    evidence_assessment = data.get("evidence_assessment")
    if evidence_assessment is not None and not isinstance(evidence_assessment, list):
        return False, "evidence_assessment must be a list"
    
    return True, "OK"


CLAUSE_CONCURRENCY = 6


class EvaluationEngine:
    def __init__(self, ingestion: IngestionService):
        self.ingestion = ingestion
        self.llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            model=settings.OPENAI_MODEL,
            temperature=0.1,
            max_tokens=settings.LLM_MAX_TOKENS,
        )

    async def evaluate(
        self,
        evaluation_id: str,
        company_id: str,
        iso_document_id: str,
        product_document_id: str,
        iso_standard: str,
        evidence_document_ids: Optional[List[str]] = None,
        scoring_method: str = "AI_AUTOMATIC",
        clause_weights: Optional[dict] = None,
    ) -> EvaluateResponse:
        del scoring_method  # reserved for future templates; weights drive scoring when set
        evidence_ids = evidence_document_ids or [product_document_id]
        clauses = ISO_9001_CLAUSES
        sem = asyncio.Semaphore(CLAUSE_CONCURRENCY)

        bus = get_event_bus()
        try:
            await bus.publish(
                evaluation_id,
                "started",
                iso_standard=iso_standard,
                iso_document_id=iso_document_id,
                product_document_id=product_document_id,
                evidence_document_ids=evidence_ids,
                total_clauses=len(clauses),
            )
        except Exception:
            logger.exception("event_bus publish 'started' failed")

        async def _one(clause_id: str) -> ClauseResult:
            async with sem:
                try:
                    return await self._eval_clause(
                        evaluation_id,
                        company_id,
                        clause_id,
                        iso_document_id,
                        evidence_ids,
                    )
                except Exception as e:
                    logger.warning("Clause %s failed: %s", clause_id, e)
                    try:
                        await bus.publish(
                            evaluation_id,
                            "clause_failed",
                            clause_reference=clause_id,
                            error=str(e)[:300],
                        )
                    except Exception:
                        logger.exception("event_bus publish 'clause_failed' failed")
                    return ClauseResult(
                        clause_reference=clause_id,
                        clause_title="",
                        clause_summary="",
                        clause_text_excerpt="",
                        verdict="NOT_SATISFIED",
                        confidence=0.0,
                        supporting_evidence=[],
                        gaps=["Evaluation failed — manual review required"],
                        suggestions=[],
                        legacy_score=0.0,
                        legacy_status="CRITICAL_NC",
                    )

        results: List[ClauseResult] = list(
            await asyncio.gather(*[_one(cid) for cid, _title in clauses])
        )

        conformity_score = _weighted_overall(results, clause_weights)
        try:
            await bus.publish(
                evaluation_id,
                "summary_started",
                conformity_score=conformity_score,
            )
        except Exception:
            logger.exception("event_bus publish 'summary_started' failed")

        summary = await self._summary(conformity_score, results, iso_standard)

        try:
            await bus.publish(
                evaluation_id,
                "done",
                conformity_score=conformity_score,
                summary=summary,
            )
            await bus.close(evaluation_id)
        except Exception:
            logger.exception("event_bus publish/close 'done' failed")

        return EvaluateResponse(
            evaluation_id=evaluation_id,
            conformity_score=conformity_score,
            summary=summary,
            results=results,
        )

    async def _eval_clause(
        self,
        evaluation_id: str,
        company_id: str,
        clause_id: str,
        iso_doc_id: str,
        evidence_ids: List[str],
    ) -> ClauseResult:
        bus = get_event_bus()
        try:
            await bus.publish(
                evaluation_id,
                "clause_started",
                clause_reference=clause_id,
            )
        except Exception:
            logger.exception("event_bus publish 'clause_started' failed")

        try:
            await bus.publish(
                evaluation_id,
                "clause_retrieving",
                clause_reference=clause_id,
                source="ISO_NORM",
            )
        except Exception:
            logger.exception("event_bus publish 'clause_retrieving' failed")
        iso_m = await self.ingestion.search(
            f"clause {clause_id}",
            company_id,
            top_k=4,
            filter={"document_id": iso_doc_id},
        )
        try:
            await bus.publish(
                evaluation_id,
                "clause_retrieving",
                clause_reference=clause_id,
                source="EVIDENCE",
            )
        except Exception:
            logger.exception("event_bus publish 'clause_retrieving' (evidence) failed")
        
        # Multi-query retrieval for better evidence coverage
        search_queries = [
            f"clause {clause_id} requirement",
            f"clause {clause_id} evidence compliance",
            f"{clause_id} audit conformity",
            f"{clause_id} implementation proof",
        ]
        all_chunks = []
        seen = set()
        for query in search_queries:
            chunks = await self.ingestion.search(
                query,
                company_id,
                top_k=5,
                document_ids_in=evidence_ids,
            )
            for chunk in chunks:
                meta = chunk.metadata or {}
                doc_id = meta.get("document_id", "")
                text = (meta.get("text") or "")[:200]
                key = f"{doc_id}:{hash(text)}"
                if key not in seen:
                    seen.add(key)
                    all_chunks.append(chunk)
        
        # Re-rank by similarity score and take top 10
        all_chunks.sort(key=lambda c: float(getattr(c, "score", 0.0) or 0.0), reverse=True)
        prod_m = all_chunks[:10]

        iso_text = "\n".join(
            (m.metadata or {}).get("text", "") for m in iso_m
        ) or "Not found"
        clause_excerpt = (iso_text[:1200] + ("…" if len(iso_text) > 1200 else "")).strip()

        evidence_chunks_lines: List[str] = []
        supporting: List[EvidenceExcerpt] = []
        evidence_payload: List[dict] = []
        for i, m in enumerate(prod_m, start=1):
            meta = m.metadata or {}
            doc_id = meta.get("document_id", "?")
            raw_txt = (meta.get("text") or "")
            txt = _clean_excerpt(raw_txt)[:900]
            score = float(getattr(m, "score", 0.0) or 0.0)
            src = meta.get("file_name") or meta.get("source_file") or meta.get("title")
            evidence_chunks_lines.append(f"[{i}] doc={doc_id} :: {txt}")
            supporting.append(
                EvidenceExcerpt(
                    document_id=str(doc_id),
                    excerpt=txt,
                    similarity_score=score,
                    source_label=str(src) if src else None,
                )
            )
            evidence_payload.append(
                {
                    "document_id": str(doc_id),
                    "source_label": str(src) if src else None,
                    "excerpt": txt[:280],
                    "similarity_score": round(score, 4),
                }
            )

        try:
            await bus.publish(
                evaluation_id,
                "evidence_found",
                clause_reference=clause_id,
                count=len(evidence_payload),
                excerpts=evidence_payload[:5],
            )
        except Exception:
            logger.exception("event_bus publish 'evidence_found' failed")

        ev_block = "\n".join(evidence_chunks_lines) if evidence_chunks_lines else "(no evidence chunks retrieved)"

        logger.info(
            "Clause %s: iso_chunks=%d evidence_chunks=%d",
            clause_id, len(iso_m), len(prod_m),
        )

        try:
            await bus.publish(
                evaluation_id,
                "clause_llm_calling",
                clause_reference=clause_id,
                evidence_count=len(supporting),
            )
        except Exception:
            logger.exception("event_bus publish 'clause_llm_calling' failed")

        chain = PROMPT | self.llm
        max_retries = 3
        data = None
        
        for attempt in range(max_retries):
            result = await chain.ainvoke(
                {
                    "clause_reference": clause_id,
                    "standard_excerpt": iso_text[:2500],
                    "evidence_chunks": ev_block[:6000],
                }
            )
            try:
                data = _parse_llm_json(str(result.content))
                valid, error = _validate_llm_response(data)
                if valid:
                    break
                else:
                    logger.warning("Clause %s: LLM response validation failed (attempt %d/%d): %s", 
                                 clause_id, attempt + 1, max_retries, error)
                    if attempt == max_retries - 1:
                        raise ValueError(f"Validation failed after {max_retries} attempts: {error}")
            except (json.JSONDecodeError, TypeError, ValueError) as e:
                logger.warning("Clause %s: LLM parse/validation error (attempt %d/%d): %s", 
                             clause_id, attempt + 1, max_retries, e)
                if attempt == max_retries - 1:
                    raw_content = str(result.content)[:500]
                    logger.error("Clause %s: Final LLM response: %s", clause_id, raw_content)
                    data = {
                        "confidence": 0.35,
                        "verdict": "NOT_SATISFIED",
                        "clause_title": "",
                        "clause_summary": "",
                        "gaps": [f"Model output invalid after {max_retries} retries — manual review required"],
                        "suggestions": [],
                        "reasoning": "LLM failed to produce valid structured output",
                        "requirement_elements": [],
                        "evidence_assessment": [],
                    }
        
        verdict = str(data.get("verdict", "NOT_SATISFIED")).upper()
        if verdict not in ("SATISFIED", "PARTIALLY_SATISFIED", "NOT_SATISFIED"):
            logger.warning("Clause %s: unrecognized verdict '%s' → NOT_SATISFIED", clause_id, verdict)
            verdict = "NOT_SATISFIED"
        conf = float(data.get("confidence", 0.5))
        conf = max(0.0, min(1.0, conf))
        logger.info("Clause %s → verdict=%s confidence=%.2f", clause_id, verdict, conf)
        if verdict == "NOT_SATISFIED":
            logger.info("Clause %s raw LLM response: %s", clause_id, str(result.content)[:800])

        legacy_score = 100.0 if verdict == "SATISFIED" else 70.0 if verdict == "PARTIALLY_SATISFIED" else 30.0
        legacy_status = (
            "CONFORMANT"
            if verdict == "SATISFIED"
            else "MINOR_NC"
            if verdict == "PARTIALLY_SATISFIED"
            else "MAJOR_NC"
        )

        gaps_list = list(data.get("gaps") or [])
        suggestions_list = list(data.get("suggestions") or [])
        clause_title_text = str(data.get("clause_title") or "").strip()
        clause_summary_text = str(data.get("clause_summary") or "").strip()
        reasoning_text = str(data.get("reasoning") or "").strip()
        requirement_elements = list(data.get("requirement_elements") or [])
        evidence_assessment = list(data.get("evidence_assessment") or [])

        try:
            await bus.publish(
                evaluation_id,
                "verdict_emitted",
                clause_reference=clause_id,
                clause_title=clause_title_text,
                verdict=verdict,
                confidence=round(conf, 4),
                gaps_count=len(gaps_list),
                suggestions_count=len(suggestions_list),
                gap_preview=(gaps_list[0][:200] if gaps_list else None),
            )
        except Exception:
            logger.exception("event_bus publish 'verdict_emitted' failed")

        return ClauseResult(
            clause_reference=clause_id,
            clause_title=clause_title_text,
            clause_summary=clause_summary_text,
            clause_text_excerpt=clause_excerpt,
            verdict=verdict,
            confidence=conf,
            supporting_evidence=supporting,
            gaps=gaps_list,
            suggestions=suggestions_list,
            legacy_score=legacy_score,
            legacy_status=legacy_status,
            reasoning=reasoning_text,
            requirement_elements=requirement_elements,
            evidence_assessment=evidence_assessment,
        )

    async def _summary(self, score: float, results: list, iso_standard: str) -> str:
        nc = [r for r in results if r.verdict == "NOT_SATISFIED"]
        partial = [r for r in results if r.verdict == "PARTIALLY_SATISFIED"]
        worst = ", ".join(
            r.clause_reference for r in sorted(results, key=lambda x: x.confidence)[:3]
        )
        prompt = (
            f"Write exactly 3 short sentences (under 80 words total) for an ISO {iso_standard} compliance report. "
            f"Score: {score:.1f}%. Not satisfied: {len(nc)}. Partially satisfied: {len(partial)}. "
            f"Priority clauses: {worst or 'n/a'}."
        )
        try:
            resp = await self.llm.ainvoke(prompt)
            text = (getattr(resp, "content", None) or str(resp)).strip()
            if text:
                return text
        except Exception as e:
            logger.warning("LLM summary failed (using fallback): %s", e)
        return (
            f"ISO {iso_standard} evaluation: weighted score {score:.1f}%. "
            f"{len(nc)} clause(s) not satisfied, {len(partial)} partially satisfied. "
            f"Review priority: {worst or 'n/a'}."
        )
