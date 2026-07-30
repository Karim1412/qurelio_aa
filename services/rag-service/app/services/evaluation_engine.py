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

# Verdict used when a clause could not be assessed at all (retrieval down, LLM 401,
# timeout…). It is NOT a compliance finding: it never becomes an NC draft and is
# excluded from the conformity score.
VERDICT_INCONCLUSIVE = "INCONCLUSIVE"

# NOTE: there is intentionally no built-in clause list here. Clauses always come
# from the standard selected in the Standards & Regulations Portal (see
# EvaluationEngine._derive_clauses). A hardcoded ISO 9001 list previously acted as
# a silent fallback, which meant every standard was audited as if it were ISO 9001.

PROMPT = ChatPromptTemplate.from_template(
    """You are a lead auditor performing a rigorous clause-by-clause conformity assessment.
Assess ONLY against the requirement text supplied below — do not import requirements
from any other standard you happen to know.

STANDARD CLAUSE: {clause_reference}

REQUIREMENT TEXT (excerpt):
{standard_excerpt}

EVIDENCE CHUNKS (retrieved by semantic similarity from approved evidence documents):
{evidence_chunks}

TASK — produce a conformity matrix for this clause:
1. SPLIT the clause into each SEPARATE normative requirement (every distinct "SHALL"
   / "DOIT" statement). One clause often states several — emit ONE row per requirement.
   Lettered or numbered sub-items become their own rows ("7.2.3 (a)", "7.2.3 (b)").
2. For each requirement, decide whether it APPLIES to this product at all.
3. Judge each applicable requirement against the evidence and justify it.

RESPOND ONLY WITH VALID JSON:
{{
  "clause_title": "Short title from the standard text. NEVER write 'Clause X.X'",
  "reasoning": "Audit trail: how you split the clause and weighed the evidence",
  "requirements": [
    {{
      "reference": "{clause_reference}",
      "summary": "The requirement restated as one normative sentence",
      "applicable_if": "IF: <condition>  — empty when unconditional",
      "conditional_clauses": "clauses whose conditions gate this one, else empty",
      "references": "cross-references cited, e.g. '7.2.10' or 'IEC 60364-5-52:2009, 524', else empty",
      "status": "PASS|FAIL|N/A|MISSING_INFO",
      "justification": "<STATUS>: rationale citing the source document and page",
      "confidence": 0.0-1.0,
      "evidence_refs": [1, 3]
    }}
  ]
}}

STATUS — choose exactly one per requirement:
- "PASS": the evidence positively demonstrates conformity.
- "FAIL": the evidence shows the requirement is NOT met, or contradicts it.
- "N/A": the requirement does not apply to this product (condition not met, feature
  absent), OR the clause is a heading with no normative content.
- "MISSING_INFO": the requirement applies but the file does not contain enough
  information to decide, or the information is contradictory. Do NOT guess PASS or
  FAIL when the evidence is simply absent.

RULES:
- A heading-only clause yields exactly one row: status "N/A", justification
  "N/A: heading clause, not normative" (in the language of the standard).
- "reference": repeat the clause number; append the sub-item marker when the
  requirement comes from a lettered item, e.g. "{clause_reference} (a)".
- "justification" MUST start with the status followed by ": ", and MUST cite the
  evidence exactly as given in its source="…" field, copying the page when present,
  e.g. 'PASS: the wiring diagram (Manuel_FA1002.pdf, p. 26) shows …'. Never cite a
  chunk by its index ("Evidence Chunk 1") and never cite a UUID.
- "clause_title" is the clause's SUBJECT taken from the standard text (e.g.
  "Overcurrent protection"), never a repeat of the number ("Article 6").
- Write summary and justification in the SAME LANGUAGE as the requirement text above.
- Never invent evidence. Absent evidence is "MISSING_INFO", never "PASS".
- evidence_refs: 1-based indices into the evidence chunks provided.
- Emit at least one requirement row. """
)


STATUS_PASS = "PASS"
STATUS_FAIL = "FAIL"
STATUS_NA = "N/A"
STATUS_MISSING_INFO = "MISSING_INFO"

# Statuses that carry no conformity judgement and are therefore excluded from the
# score: N/A means the requirement does not apply, INCONCLUSIVE means the engine
# itself failed. MISSING_INFO *is* scored — an undemonstrated requirement is not a
# conforming one.
_UNSCORED_STATUSES = {STATUS_NA, VERDICT_INCONCLUSIVE}


def _normalise_status(raw: str) -> str:
    """Map free-form model output onto the four worksheet statuses."""
    u = (raw or "").strip().upper().replace("-", "_").replace(" ", "_")
    if u in {"PASS", "PASSED", "CONFORM", "CONFORME", "SATISFIED"}:
        return STATUS_PASS
    if u in {"FAIL", "FAILED", "NON_CONFORME", "NOT_SATISFIED"}:
        return STATUS_FAIL
    if u in {"N/A", "NA", "N_A", "NOT_APPLICABLE", "NON_APPLICABLE"}:
        return STATUS_NA
    if u in {"MISSING_INFO", "MISSING", "INFO_MANQUANTE", "UNKNOWN", "PARTIALLY_SATISFIED"}:
        return STATUS_MISSING_INFO
    return STATUS_MISSING_INFO


def _status_to_verdict(status: str) -> str:
    """Legacy verdict kept so existing consumers (NC drafts, UI) keep working."""
    if status == STATUS_PASS:
        return "SATISFIED"
    if status == STATUS_FAIL:
        return "NOT_SATISFIED"
    if status == STATUS_MISSING_INFO:
        return "PARTIALLY_SATISFIED"
    return VERDICT_INCONCLUSIVE  # N/A — carries no conformity judgement


def _verdict_weight(v: str) -> float:
    u = (v or "").upper()
    if u == "SATISFIED":
        return 1.0
    if u == "PARTIALLY_SATISFIED":
        return 0.5
    return 0.0


def _status_weight(status: str) -> float:
    """PASS counts fully; FAIL and MISSING_INFO count as zero (undemonstrated)."""
    return 1.0 if status == STATUS_PASS else 0.0


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
    """Weighted conformity over *assessable* requirements only.

    Excluded from both numerator and denominator: N/A (the requirement does not
    apply to this product) and INCONCLUSIVE (the engine itself failed). Counting
    either as 0 would penalise the product for requirements it was never subject
    to, or report an infrastructure outage as a compliance failure.

    MISSING_INFO is deliberately scored as 0 rather than excluded: the requirement
    applies and the file does not demonstrate conformity.
    """
    scored = [r for r in results if (r.status or "") not in _UNSCORED_STATUSES]
    if not scored:
        return 0.0
    if clause_weights:
        tw = 0.0
        acc = 0.0
        for r in scored:
            w = _resolve_clause_weight(r.clause_reference, clause_weights)
            tw += w
            acc += w * _status_weight(r.status)
        return round(100.0 * acc / tw, 2) if tw else 0.0
    n = len(scored)
    acc = sum(_status_weight(r.status) for r in scored)
    return round(100.0 * acc / n, 2) if n else 0.0


def _parse_json_array_lenient(text: str) -> list:
    """Parse a JSON array, salvaging the complete items when it was truncated.

    A cut-off response is still useful — the clauses that did arrive are valid —
    so trim back to the last complete object and close the array.
    """
    s = (text or "").strip()
    if not s:
        return []
    try:
        out = json.loads(s)
        return out if isinstance(out, list) else []
    except json.JSONDecodeError:
        pass
    end = s.rfind("}")
    if end == -1:
        return []
    try:
        out = json.loads(s[: end + 1] + "]")
        return out if isinstance(out, list) else []
    except json.JSONDecodeError:
        return []


def _parse_llm_json(content: str) -> dict[str, Any]:
    text = (content or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9]*\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text).strip()
    return json.loads(text)


_VALID_STATUSES = {STATUS_PASS, STATUS_FAIL, STATUS_NA, STATUS_MISSING_INFO}


def _validate_llm_response(data: dict[str, Any]) -> tuple[bool, str]:
    """Validate the conformity-matrix response: a clause title plus requirement rows."""
    if "clause_title" not in data:
        return False, "Missing required field: clause_title"

    requirements = data.get("requirements")
    if not isinstance(requirements, list):
        return False, "requirements must be a list"
    if not requirements:
        return False, "requirements must contain at least one row"

    for i, item in enumerate(requirements):
        if not isinstance(item, dict):
            return False, f"requirements[{i}] must be an object"
        for field in ("summary", "status", "justification"):
            if field not in item:
                return False, f"requirements[{i}] missing field: {field}"
        if _normalise_status(str(item.get("status"))) not in _VALID_STATUSES:
            return False, f"requirements[{i}] invalid status: {item.get('status')}"
        conf = item.get("confidence")
        if conf is not None and (
            not isinstance(conf, (int, float)) or not (0.0 <= float(conf) <= 1.0)
        ):
            return False, f"requirements[{i}] invalid confidence: {conf}"

    evidence_assessment = data.get("evidence_assessment")
    if evidence_assessment is not None and not isinstance(evidence_assessment, list):
        return False, "evidence_assessment must be a list"

    return True, "OK"


CLAUSE_CONCURRENCY = 6


# Accepts the numbering styles real standards use: dotted ISO clauses (4.1, 7.5.3),
# EU-regulation Articles (Article 49), and Annexes (Annex X, Annex VI). Anything
# else is rejected so page numbers and stray digits cannot become "clauses".
CLAUSE_REF_RE = re.compile(
    r"^(?:(?:Article|Annex|Section|Clause|Part)\s+)?"
    r"(?:\d{1,3}(?:\.\d{1,3}){0,3}|[IVXLC]{1,6})"
    r"(?:\s*\([0-9a-z]{1,3}\))?$",
    re.IGNORECASE,
)

# Structural probes used to pull a representative sample of the standard's own
# text out of the vector store before asking the LLM for its clause list.
CLAUSE_DISCOVERY_QUERIES = [
    "table of contents clauses sections",
    "requirements shall clause",
    "scope normative references terms definitions",
    "management responsibility planning support operation",
    "performance evaluation improvement audit",
]


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
        # Clause discovery emits a whole clause list in one response, which does not
        # fit the per-clause token budget above.
        self.clause_llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            model=settings.OPENAI_MODEL,
            temperature=0.0,
            max_tokens=max(4000, settings.LLM_MAX_TOKENS),
        )
        # (company_id, iso_document_id) -> [(ref, title), …]
        self._clause_cache: dict[tuple[str, str], List[tuple[str, str]]] = {}

    @staticmethod
    def _dedupe_repeat(value: str) -> str:
        """Collapse "ANNEX VIII ANNEX VIII" → "ANNEX VIII".

        PDF annex pages repeat their header line and the heading regex captures
        both halves. Applied at read time as well as at index time so already
        indexed standards render correctly without a re-ingest.
        """
        v = " ".join((value or "").split())
        if not v:
            return ""
        words = v.split(" ")
        n = len(words)
        # Smallest repeating unit that tiles the sequence — handles any repeat
        # count, since annex headers can recur four or more times.
        for size in range(1, n // 2 + 1):
            if n % size:
                continue
            unit = [w.lower() for w in words[:size]]
            if all(
                [w.lower() for w in words[i : i + size]] == unit for i in range(0, n, size)
            ):
                return " ".join(words[:size])
        return v

    @staticmethod
    def _clause_sort_key(ref: str) -> tuple:
        """Document order for dotted refs: 7.2 before 7.10, headings before leaves."""
        parts = re.findall(r"\d+", ref or "")
        return tuple(int(p) for p in parts) if parts else (9999,)

    async def _clauses_from_index(
        self, company_id: str, iso_document_id: str
    ) -> List[tuple[str, str]]:
        """Clause list straight from the clause-aligned vectors of the standard.

        Returns [] when the standard predates clause-aware indexing, in which case
        the caller falls back to LLM extraction.
        """
        found: dict[str, str] = {}
        # Several probes because one query returns at most top_k neighbours; the
        # union covers the document far better than any single vector would.
        for q in CLAUSE_DISCOVERY_QUERIES:
            try:
                matches = await self.ingestion.search(
                    q, company_id, top_k=100, filter={"document_id": iso_document_id}
                )
            except Exception as e:
                logger.warning("Clause structure probe failed (%s): %s", q, e)
                continue
            for m in matches:
                meta = m.metadata or {}
                ref = self._dedupe_repeat(str(meta.get("clause_ref") or ""))
                if not ref or len(ref) > 24:
                    continue
                title = self._dedupe_repeat(str(meta.get("clause_title") or ""))
                # A heading with no text of its own leaves title == ref; blank it
                # so the worksheet shows the number once, not "ANNEX I ANNEX I".
                if title.lower() == ref.lower():
                    title = ""
                # Keep the most informative heading seen for this clause.
                if ref not in found or (title and len(title) > len(found[ref])):
                    found[ref] = title
        if not found:
            return []

        # Prefer the standard's numbered clauses (7.2.1, 16.4). Annexes, figures and
        # tables are only used when the document has no numbered clauses at all —
        # otherwise an annex heading crowds out the requirements that matter.
        # "7", "7.2", "7.2.3" and lettered sub-items "7.2.3 (a)" all count as
        # numbered clauses; annex/article headers do not.
        numbered = {
            ref: title
            for ref, title in found.items()
            if re.match(r"^\d{1,2}(\.\d{1,3})*(\s*\([a-z0-9]\))?$", ref.strip(), re.IGNORECASE)
        }
        selected = numbered or {
            ref: title
            for ref, title in found.items()
            if not re.match(r"^(?:figure|fig\.|table)\b", ref.strip(), re.IGNORECASE)
        }
        if numbered and len(found) > len(numbered):
            logger.info(
                "Clause list: kept %d numbered clause(s), dropped %d annex/figure heading(s)",
                len(numbered),
                len(found) - len(numbered),
            )
        ordered = sorted(selected.items(), key=lambda kv: self._clause_sort_key(kv[0]))
        return [(ref, title) for ref, title in ordered][:60]

    async def _clauses_from_model_knowledge(self, iso_standard: str) -> List[tuple[str, str]]:
        """Clause structure of a standard from the model's own knowledge of it.

        Used only when the uploaded document yields no usable numbered structure
        (scanned image, partial extract, wrong file). The clause LIST comes from
        the model; every verdict is still decided against the retrieved evidence,
        so this never invents conformity — only the skeleton to audit against.
        Callers must log that the list is not document-derived.
        """
        name = (iso_standard or "").strip()
        if not name:
            return []
        prompt = (
            f"The standard designation is: \"{name}\".\n"
            "If you recognise this designation, list its auditable, numbered clauses "
            "— the sections a lead auditor assesses conformity against.\n"
            "Rules:\n"
            "- Return ONLY a JSON array, no prose, no code fences.\n"
            '- Each item: {"reference": "<number>", "title": "<clause title>"}\n'
            "- Use the standard's real numbering, deepest level available "
            '(e.g. "7", "7.2", "7.2.1", "16.4").\n'
            "- Titles in the language the standard is normally published in.\n"
            "- Skip scope, normative references and terms/definitions.\n"
            "- Max 60 items, document order.\n"
            "- If you do NOT recognise the designation, return [] — never guess."
        )
        try:
            # A full clause list runs well past LLM_MAX_TOKENS (tuned for short
            # per-clause verdicts); at 1000 tokens the JSON array was cut mid-item
            # and every lookup silently parsed to [].
            resp = await self.clause_llm.ainvoke(prompt)
            raw = (getattr(resp, "content", None) or str(resp)).strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```[a-zA-Z0-9]*\s*\n?", "", raw)
                raw = re.sub(r"\n?```\s*$", "", raw).strip()
            parsed = _parse_json_array_lenient(raw)
        except Exception as e:
            logger.warning("Model-knowledge clause lookup failed for %s: %s", name, e)
            return []

        out: List[tuple[str, str]] = []
        seen: set[str] = set()
        if isinstance(parsed, list):
            for item in parsed:
                if not isinstance(item, dict):
                    continue
                ref = str(item.get("reference") or "").strip().rstrip(".")
                title = str(item.get("title") or "").strip()
                if not re.match(r"^\d{1,2}(\.\d{1,3}){0,3}$", ref) or ref in seen:
                    continue
                seen.add(ref)
                out.append((ref, title))
                if len(out) >= 60:
                    break
        return sorted(out, key=lambda kv: self._clause_sort_key(kv[0]))

    def _clauses_from_raw_text(self, corpus: str) -> List[tuple[str, str]]:
        """Clause headings scraped straight from the standard's text.

        Numbered headings win; annex/article headings are used only when the
        document has no numbered ones, mirroring _clauses_from_index.
        """
        numbered: dict[str, str] = {}
        other: dict[str, str] = {}
        heading = re.compile(
            r"(?:^|\n)\s*("
            r"\d{1,2}(?:\.\d{1,3}){0,3}"
            r"|(?:Annex|ANNEX|Article|Section)\s+[A-Z0-9]{1,6}"
            r")[.)]?\s+([^\n]{3,120})"
        )
        for m in heading.finditer(corpus or ""):
            ref = self._dedupe_repeat(m.group(1))
            title = self._dedupe_repeat(m.group(2)).strip(" .:-—–")
            if not ref or len(ref) > 24:
                continue
            # A "heading" whose text runs on like prose is a sentence, not a title.
            if len(title.split()) > 14:
                continue
            bucket = numbered if re.match(r"^\d", ref) else other
            if ref not in bucket or len(title) > len(bucket[ref]):
                bucket[ref] = title
        selected = numbered or other
        if not selected:
            return []
        ordered = sorted(selected.items(), key=lambda kv: self._clause_sort_key(kv[0]))
        return [(r, t) for r, t in ordered][:60]

    async def _derive_clauses(
        self,
        company_id: str,
        iso_document_id: str,
        iso_standard: str,
    ) -> List[tuple[str, str]]:
        """Clause list for the standard the user actually selected.

        Reads the indexed text of `iso_document_id` and recovers its clause
        structure. There is deliberately no ISO 9001 fallback: the product compares
        product documents against the standard picked in the Standards & Regulations
        Portal, so substituting a different standard's clauses would produce a
        confident, wrong audit. If the structure cannot be recovered we raise, and
        the evaluation is reported as FAILED with an actionable message.
        """
        cache_key = (company_id, iso_document_id)
        if cache_key in self._clause_cache:
            return self._clause_cache[cache_key]

        # Preferred path: the standard was indexed clause-by-clause, so its real
        # structure (number + heading) is already in the vector metadata. No LLM
        # guessing, no invented numbers, and the headings are the document's own.
        structural = await self._clauses_from_index(company_id, iso_document_id)
        has_numbered = any(
            re.match(r"^\d{1,2}(\.\d{1,3})*", ref) for ref, _ in structural
        )
        if structural and has_numbered:
            logger.info(
                "Derived %d clause(s) from the indexed structure of %s (doc %s)",
                len(structural),
                iso_standard,
                iso_document_id,
            )
            self._clause_cache[cache_key] = structural
            return structural

        if structural:
            # Only annex/article headers came back. Those are not the clause
            # numbering an auditor works from, so try the model's knowledge of the
            # standard first and keep the headers only as a last resort.
            from_model = await self._clauses_from_model_knowledge(iso_standard)
            if from_model:
                logger.warning(
                    "Indexed structure of %s exposed no numbered clauses; using the "
                    "model's clause list for this standard (%d clause(s)).",
                    iso_standard,
                    len(from_model),
                )
                self._clause_cache[cache_key] = from_model
                return from_model
            logger.warning(
                "Falling back to %d annex/article heading(s) for %s — the document "
                "exposes no numbered clauses and the standard was not recognised.",
                len(structural),
                iso_standard,
            )
            self._clause_cache[cache_key] = structural
            return structural

        chunks: list = []
        seen_text: set[str] = set()
        for q in CLAUSE_DISCOVERY_QUERIES:
            try:
                found = await self.ingestion.search(
                    q, company_id, top_k=6, filter={"document_id": iso_document_id}
                )
            except Exception as e:
                logger.warning("Clause discovery search failed for %s: %s", q, e)
                continue
            for c in found:
                text = ((c.metadata or {}).get("text") or "").strip()
                if text and text not in seen_text:
                    seen_text.add(text)
                    chunks.append(text)

        if not chunks:
            raise RuntimeError(
                f"The standard '{iso_standard}' has no indexed text, so its clauses "
                "cannot be determined. Re-upload or re-index it in the Standards & "
                "Regulations Portal, then run the evaluation again."
            )

        corpus = "\n\n".join(chunks)[:12000]
        prompt = (
            f"Below is text extracted from the standard '{iso_standard}'.\n"
            "Identify the numbered, auditable clauses it defines — the ones a lead "
            "auditor would assess conformity against.\n"
            "Rules:\n"
            "- Return ONLY a JSON array, no prose, no code fences.\n"
            '- Each item: {"reference": "<id>", "title": "<short title>"}\n'
            "- Go to the DEEPEST numbered subdivision the text shows. If the document "
            'has "7", "7.2" and "7.2.3", return all three — the leaf clauses are where '
            "the requirements live, and the headings are needed for context.\n"
            "- NEVER return only top-level numbers when deeper subdivisions exist.\n"
            "- Use the document's OWN numbering exactly as it appears: dotted clauses "
            'for ISO/EN-style standards ("7.2.3", "16.4"), or "Article 49" / "Annex X" '
            "only for documents that genuinely number themselves that way. Never invent "
            "clause numbers a document does not use.\n"
            '- "title" is the clause heading text ("Overcurrent protection"), NEVER a '
            'repetition of the number ("Clause 7.2" / "Article 6").\n'
            "- Never use page numbers, figure/table numbers, or cross-references to "
            "other documents as a reference.\n"
            "- Skip front matter (scope, normative references, terms and definitions).\n"
            "- Preserve document order. Max 40 items.\n"
            "- If the text contains no auditable requirement sections, return [].\n\n"
            f"TEXT:\n{corpus}"
        )
        try:
            resp = await self.llm.ainvoke(prompt)
            raw = (getattr(resp, "content", None) or str(resp)).strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```[a-zA-Z0-9]*\s*\n?", "", raw)
                raw = re.sub(r"\n?```\s*$", "", raw).strip()
            parsed = json.loads(raw)
        except Exception as e:
            logger.warning(
                "Clause extraction failed for %s (%s): %s", iso_standard, iso_document_id, e
            )
            raise RuntimeError(
                f"Could not read the clause structure of '{iso_standard}' "
                f"({type(e).__name__}). The evaluation was not run — retry once the "
                "AI service is reachable."
            ) from e

        clauses: List[tuple[str, str]] = []
        seen_refs: set[str] = set()
        if isinstance(parsed, list):
            for item in parsed:
                if not isinstance(item, dict):
                    continue
                ref = str(item.get("reference") or "").strip().rstrip(".")
                title = str(item.get("title") or "").strip()
                if not CLAUSE_REF_RE.match(ref) or ref in seen_refs:
                    continue
                seen_refs.add(ref)
                clauses.append((ref, title))
                if len(clauses) >= 40:
                    break

        if not clauses:
            # Last resort before failing: scan the standard's own text for headings.
            # Reached when the vectors predate clause-aware indexing AND the model
            # returned nothing usable — without this the engine dead-ends on
            # documents it could still audit.
            clauses = self._clauses_from_raw_text("\n\n".join(chunks))
            if clauses:
                logger.warning(
                    "Recovered %d clause(s) for %s by scanning the text directly "
                    "(re-index the standard for better structure).",
                    len(clauses),
                    iso_standard,
                )
                self._clause_cache[cache_key] = clauses
                return clauses

            # Nothing usable in the document itself — fall back to the model's
            # knowledge of this standard's clause structure. Verdicts still come
            # only from the retrieved evidence; this supplies the skeleton, not
            # the conclusions.
            clauses = await self._clauses_from_model_knowledge(iso_standard)
            if clauses:
                logger.warning(
                    "Clause list for %s came from MODEL KNOWLEDGE, not the uploaded "
                    "document (%d clause(s)) — the file yielded no usable structure.",
                    iso_standard,
                    len(clauses),
                )
                self._clause_cache[cache_key] = clauses
                return clauses
            raise RuntimeError(
                f"No auditable clauses could be identified in '{iso_standard}'. "
                "Check that the document in the Standards & Regulations Portal is the "
                "actual standard text and that its extraction succeeded."
            )

        logger.info(
            "Derived %d clause(s) from standard %s (doc %s)",
            len(clauses),
            iso_standard,
            iso_document_id,
        )
        self._clause_cache[cache_key] = clauses
        return clauses

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
        # Clauses come from the standard the user selected — not a hardcoded list.
        clauses = await self._derive_clauses(company_id, iso_document_id, iso_standard)
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

        async def _one(clause_id: str, clause_title: str = "") -> List[ClauseResult]:
            async with sem:
                try:
                    rows = await self._eval_clause(
                        evaluation_id,
                        company_id,
                        clause_id,
                        iso_document_id,
                        evidence_ids,
                    )
                    # The heading parsed from the standard beats the model's guess —
                    # that is what produced titles like "Article 11" for clause 10.
                    if clause_title:
                        for r in rows:
                            r.clause_title = clause_title
                    return rows
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
                    # An infrastructure error is not evidence of non-conformity.
                    # Reporting it as NOT_SATISFIED/CRITICAL_NC made a total auth
                    # outage look like a genuine "0% compliant" audit result.
                    return [
                        ClauseResult(
                            clause_reference=clause_id,
                            clause_title=clause_title,
                            clause_summary="",
                            clause_text_excerpt="",
                            status=VERDICT_INCONCLUSIVE,
                            justification=(
                                f"INCONCLUSIVE: clause could not be assessed — "
                                f"{type(e).__name__}: {e}"
                            )[:500],
                            verdict=VERDICT_INCONCLUSIVE,
                            confidence=0.0,
                            supporting_evidence=[],
                            gaps=[],
                            suggestions=[
                                "Re-run this evaluation once the service error is resolved."
                            ],
                            legacy_score=0.0,
                            legacy_status="ERROR",
                            reasoning=f"Clause could not be assessed — {type(e).__name__}: {e}"[:500],
                        )
                    ]

        # Each clause yields one row per requirement, so flatten to worksheet rows.
        per_clause = await asyncio.gather(*[_one(cid, title) for cid, title in clauses])
        results: List[ClauseResult] = [row for rows in per_clause for row in rows]

        inconclusive = [r for r in results if (r.status or "") == VERDICT_INCONCLUSIVE]
        if inconclusive and len(inconclusive) == len(results):
            # Nothing was assessable — surface a failed evaluation instead of
            # persisting a meaningless 0% that reads as a real audit verdict.
            raise RuntimeError(
                f"All {len(clauses)} clauses failed to evaluate — "
                f"the evaluation could not be performed. "
                f"First error: {inconclusive[0].reasoning or 'unknown'}"
            )
        if inconclusive:
            logger.warning(
                "%d/%d requirement rows inconclusive — excluded from the conformity score",
                len(inconclusive),
                len(results),
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
    ) -> List[ClauseResult]:
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
        # Exact-reference lookup first: the clause's OWN text, not whatever is
        # semantically nearby. Similarity search here used to return neighbouring
        # clauses and cross-references, so the auditor judged the wrong requirement.
        iso_m = []
        try:
            iso_m = await self.ingestion.search(
                f"clause {clause_id}",
                company_id,
                top_k=8,
                filter={"document_id": iso_doc_id, "clause_ref": clause_id},
            )
        except Exception as e:
            logger.warning("Exact clause lookup failed for %s: %s", clause_id, e)
        if not iso_m:
            # Standard indexed before clause-aware ingestion — fall back to similarity.
            iso_m = await self.ingestion.search(
                f"clause {clause_id}",
                company_id,
                top_k=4,
                filter={"document_id": iso_doc_id},
            )
            logger.info("Clause %s: no clause-aligned chunk, used similarity", clause_id)
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
            # Show the document NAME and page (not the UUID) so justifications can
            # cite a source a human auditor can look up.
            label = str(src) if src else f"doc {doc_id}"
            try:
                page_no = int(meta.get("page") or 0)
            except (TypeError, ValueError):
                page_no = 0
            cite = f'{label}, p. {page_no}' if page_no else label
            evidence_chunks_lines.append(f'[{i}] source="{cite}" :: {txt}')
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
                    # Unparseable model output is an engine failure, not a finding:
                    # report MISSING_INFO so it is never mistaken for non-conformity.
                    data = {
                        "clause_title": "",
                        "reasoning": "The AI service did not return a usable assessment.",
                        "evidence_assessment": [],
                        "requirements": [
                            {
                                "reference": clause_id,
                                "summary": "",
                                "status": STATUS_MISSING_INFO,
                                "justification": (
                                    f"MISSING_INFO: model output invalid after {max_retries} "
                                    "retries — manual review required."
                                ),
                                "confidence": 0.0,
                            }
                        ],
                    }
        
        clause_title_text = str(data.get("clause_title") or "").strip()
        reasoning_text = str(data.get("reasoning") or "").strip()
        evidence_assessment = list(data.get("evidence_assessment") or [])

        raw_requirements = data.get("requirements")
        if not isinstance(raw_requirements, list) or not raw_requirements:
            # Older/degraded output shape — treat the clause as a single requirement.
            raw_requirements = [
                {
                    "reference": clause_id,
                    "summary": str(data.get("clause_summary") or "").strip(),
                    "status": data.get("status") or data.get("verdict") or STATUS_MISSING_INFO,
                    "justification": reasoning_text,
                    "confidence": data.get("confidence", 0.5),
                }
            ]

        rows: List[ClauseResult] = []
        for item in raw_requirements:
            if not isinstance(item, dict):
                continue
            status = _normalise_status(str(item.get("status") or ""))
            verdict = _status_to_verdict(status)
            conf = float(item.get("confidence", data.get("confidence", 0.5)) or 0.0)
            conf = max(0.0, min(1.0, conf))

            justification = str(item.get("justification") or "").strip()
            # The worksheet convention is "<STATUS>: <rationale>".
            if justification and not justification.upper().startswith(status.upper()):
                justification = f"{status}: {justification}"

            ref = str(item.get("reference") or clause_id).strip() or clause_id
            legacy_score = (
                100.0 if status == STATUS_PASS
                else 0.0 if status == STATUS_FAIL
                else 50.0 if status == STATUS_MISSING_INFO
                else 0.0
            )
            legacy_status = (
                "CONFORMANT" if status == STATUS_PASS
                else "MAJOR_NC" if status == STATUS_FAIL
                else "MINOR_NC" if status == STATUS_MISSING_INFO
                else "NOT_APPLICABLE"
            )

            rows.append(
                ClauseResult(
                    clause_reference=ref,
                    clause_title=clause_title_text,
                    clause_summary=str(item.get("summary") or "").strip(),
                    clause_text_excerpt=clause_excerpt,
                    applicable_if=str(item.get("applicable_if") or "").strip(),
                    conditional_clauses=str(item.get("conditional_clauses") or "").strip(),
                    references=str(item.get("references") or "").strip(),
                    status=status,
                    justification=justification,
                    verdict=verdict,
                    confidence=conf,
                    # N/A rows carry no finding, so they show no evidence or gaps.
                    supporting_evidence=[] if status == STATUS_NA else supporting,
                    gaps=[justification] if status in (STATUS_FAIL, STATUS_MISSING_INFO) else [],
                    suggestions=[],
                    legacy_score=legacy_score,
                    legacy_status=legacy_status,
                    reasoning=reasoning_text,
                    requirement_elements=[],
                    evidence_assessment=evidence_assessment,
                )
            )

        if not rows:
            raise ValueError(f"Clause {clause_id}: no requirement rows produced")

        counts = ", ".join(
            f"{s}={sum(1 for r in rows if r.status == s)}"
            for s in (STATUS_PASS, STATUS_FAIL, STATUS_NA, STATUS_MISSING_INFO)
        )
        logger.info("Clause %s → %d requirement(s): %s", clause_id, len(rows), counts)

        try:
            await bus.publish(
                evaluation_id,
                "verdict_emitted",
                clause_reference=clause_id,
                clause_title=clause_title_text,
                verdict=rows[0].verdict,
                requirement_count=len(rows),
                confidence=round(rows[0].confidence, 4),
                gaps_count=sum(len(r.gaps) for r in rows),
                suggestions_count=0,
                gap_preview=(rows[0].gaps[0][:200] if rows[0].gaps else None),
            )
        except Exception:
            logger.exception("event_bus publish 'verdict_emitted' failed")

        return rows

    async def _summary(self, score: float, results: list, iso_standard: str) -> str:
        def count(status: str) -> int:
            return sum(1 for r in results if (r.status or "") == status)

        n_pass, n_fail = count(STATUS_PASS), count(STATUS_FAIL)
        n_na, n_missing = count(STATUS_NA), count(STATUS_MISSING_INFO)
        n_error = count(VERDICT_INCONCLUSIVE)
        scored = n_pass + n_fail + n_missing

        # Rank only requirements that carry a judgement; N/A and errors would
        # otherwise crowd out the genuine priority findings.
        judged = [r for r in results if (r.status or "") in (STATUS_FAIL, STATUS_MISSING_INFO)]
        worst = ", ".join(
            dict.fromkeys(r.clause_reference for r in sorted(judged, key=lambda x: x.confidence))
        ).split(", ")
        worst_txt = ", ".join(worst[:3]) if judged else "n/a"

        notes = f" {n_na} requirement(s) not applicable."
        if n_error:
            notes += f" {n_error} could not be assessed and are excluded from the score."

        prompt = (
            f"Write exactly 3 short sentences (under 80 words total) for a {iso_standard} "
            f"conformity report. Score: {score:.1f}% over {scored} assessed requirement(s). "
            f"PASS: {n_pass}. FAIL: {n_fail}. Missing info: {n_missing}. "
            f"Priority clauses: {worst_txt}.{notes} "
            f"Write in the same language as the standard's designation."
        )
        try:
            resp = await self.llm.ainvoke(prompt)
            text = (getattr(resp, "content", None) or str(resp)).strip()
            if text:
                return text
        except Exception as e:
            logger.warning("LLM summary failed (using fallback): %s", e)
        return (
            f"{iso_standard} evaluation: {score:.1f}% over {scored} assessed requirement(s). "
            f"{n_pass} pass, {n_fail} fail, {n_missing} missing information.{notes} "
            f"Review priority: {worst_txt}."
        )
