"""Structured extraction (JSON) via OpenAI-compatible API, mirrors former document-service OCR step."""
from __future__ import annotations

import asyncio
import json
import logging
import re
import io
from typing import Any, Dict, List, Optional, Tuple

from openai import AsyncOpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

MIN_TEXT_FOR_SKIP_VISION = 80
STANDARD_CHUNK_CHARS = 3500
STANDARD_CHUNK_OVERLAP = 400
# Standards PDFs: LARGER chunks + higher overlap to keep clauses intact (ISO clauses often 2000–3000 chars).
# Increased overlap (600 chars) ensures clause boundaries are visible in adjacent chunks.
ISO_STRUCTURE_CHUNK_CHARS = 7500
ISO_STRUCTURE_CHUNK_OVERLAP = 800
ISO_CHUNK_CONCURRENCY = 4
PRODUCT_CHUNK_CONCURRENCY = 3
# Long manuals / datasheets: multi-pass structuring so traceabilityRows + sections are not lost to truncation.
PRODUCT_CHUNK_CHARS = 9000
PRODUCT_CHUNK_OVERLAP = 550
MAX_STRUCTURE_CHUNKS = 64
MAX_INLINE_IMAGE_BYTES = 60_000

BASE_SHAPE = """{
  "title": string or null,
  "documentTypeGuess": string or null,
  "classification": string or null,
  "sections": [ { 
    "clauseNumber": string or null, 
    "heading": string, 
    "content": string, 
    "bullets": string[] (optional),
    "summary": string or null,
    "importantNotes": string[] or null
  } ],
  "keyPoints": string[]
}"""

PRODUCT_EXTRA = """
For PRODUCT_DOC or EVIDENCE, set "fileSummary" (one rich paragraph: purpose of the document, product family/models, scope of information, like a datasheet overview; for product photos, still give a concise overview of what the image shows) and "visualDescription" (for PDFs: describe figures, diagrams, dimension drawings, label photos, and layout; for photos of products: include warning stickers, hazard plates, pictograms, and legible label text; for pure text PDFs summarise layout and any visible structure; use null only when truly N/A).
Also include "productProfile" (use null for unknown fields, never use empty strings, always null):
"productProfile": {
  "basicInformation": {
    "reference": string or null,
    "modelNumber": string or null,
    "serialNumber": string or null,
    "revision": string or null,
    "category": string or null,
    "subCategory": string or null,
    "tradeMark": string or null,
    "manufacturer": string or null,
    "countryOfOrigin": string or null
  },
  "certifications": {
    "marks": string[] or null,
    "standards": string[] or null,
    "approvalNumbers": string[] or null
  },
  "usage": {
    "environment": string or null,
    "users": string or null,
    "tempHumidity": string or null,
    "ipRating": string or null,
    "voltageFrequency": string or null
  },
  "generalDescription": string or null,
  "applications": string or null,
  "safetyWarnings": string[] or null,
  "qualitySpecificationNarrative": string or null,
  "regulatoryNotes": string or null,
  "technicalCharacteristics": string or null,
  "technicalBullets": string[] or null,
  "dimensions": string or null,
  "weight": string or null,
  "traceabilityRows": [ { "category": string or null, "parameter": string or null, "value": string or null, "unit": string or null, "notes": string or null } ] or null
}

Manual / datasheet discipline (critical for UI cards and the technical specifications table):
- "sections": one entry per logical chapter or major heading in the document (e.g. General overview, Installation, Warnings, Technical specifications, Safety, Maintenance). Use clauseNumber null unless the source uses explicit numbering (then preserve it). "heading" = short chapter title; "content" = full explanatory prose for that chapter; "bullets" = discrete facts, specs lines, warnings, or list items that belong under that heading (do not bury table rows only in prose, mirror important tables into traceabilityRows).
- "traceabilityRows": every technical table you find (electrical, weights, dimensions, speeds, materials, ordering codes, etc.), one row per table row with Category / Parameter / Value / Unit / Notes; use "-" for unit when absent.
- "keyPoints": 5–12 short bullets an engineer or QA reader would want at a glance (safety, compliance, main specs, maintenance).
- Prefer filling basicInformation (reference, modelNumber, revision, category, subCategory, manufacturer) from title blocks and body text."""

STANDARD_EXTRA = """
=== COMPREHENSIVE STANDARDS EXTRACTION (ISO, EN, IEC, ASTM, ANSI, DIN, BSI, Regulations, and all variants) ===

The category ISO_NORM means **any normative standards document**: ISO pure and technical committee drafts, EN (European), EN ISO / ISO/IEC (harmonised), IEC (electrotechnical), IEEE, ASTM (American Society for Testing & Materials), ANSI (American National Standards Institute), BSI (British), DIN (German), NF (French), CSA (Canadian/CSN), national adoptions, EU harmonised standards, Regulations (e.g., GDPR, FDA, MDR), Directives, and similar normative or regulatory references.

**CRITICAL: Extract ALL clauses, not just some.** If a clause spans your chunk boundary, include its beginning and mark continuation or flag incompleteness in "importantNotes".

=== Standard Type & Reference Handling ===
For "standardMetadata":
- "reference": Full designation as printed (e.g., "EN ISO 9001:2015", "IEC 60601-1:2005+AMD1:2012", "BS EN 1090-2:2018", "FDA 21 CFR 820", "ASTM D256-23", "DIN EN ISO 13849-1:2023", "Regulation (EU) 2016/679").
- "categories": Exact standard family type: "ISO", "EN", "EN ISO", "ISO/IEC", "IEC", "ASTM", "ANSI", "IEEE", "BSI", "DIN", "NF", "Regulation", "Directive", "FDA", "MDR", or the specific national code (e.g., "GOST" for Russia, "JIS" for Japan, "GB" for China). For harmonised with annexes (e.g. "EN 61010-1:2010/A12:2019 + Annex ZA"), still use "EN" and "IEC" as separate categories.
- "effectiveDate": Year or YYYY-MM-DD format from title block.

=== Clause/Section Extraction Rules: ALL Standard Families ===

**1. Numbering & Clause ID ("clauseNumber")**
  ISO-style dotted: "1", "4.1", "4.1.2", "5.2.3.4"
  EN front matter: "Foreword", "Introduction", "0", "1", "2", etc.
  Annexes: "Annex A", "Annex B", "Annex ZA" (national annex), "Annex ZA.1", "Annex ZA.2", etc. (use exactly)
  IEC sections: Use IEC clause numbering as printed; if mixed (e.g., "61010-1:2010" with "IEC 61010-1" in heading, extract "61010-1" as reference in metadata and keep clause numbers as ISO-style within)
  ASTM / ANSI sections: "Scope", "Normative References", "Terms and Definitions", "Test Method", "Report", use section name as clauseNumber if no numbers; if numbered (e.g., "1.", "1.1", "2."), use them.
  Regulations (FDA, GDPR, etc.): "Article 5", "Section 820.3", "21 CFR 820.20(a)", use the official article/section number.
  Tables, Figures: If numbered and titled, treat as own clause (e.g., "Table 1", "Figure 2.1"); else skip unless critical context.

**2. Heading ("heading")**
  Short title words ONLY (no clause number repeated, no dotted leaders "………", no page numbers, no right-aligned columns).
  Example: clauseNumber="4.1", heading="Management responsibility" (not "4.1 Management responsibility ……… 45").
  For TOC entries with only page: heading="[Section Title]", and put "Printed page: 45" as first line in "content".
  Preserve language mix if source uses multiple languages in same clause.

**3. Content ("content"): COMPLETENESS IS CRITICAL**
  Every SHALL / MUST / SHALL NOT requirement must be included in full.
  Numbered sub-requirements: a) b) c) d) ... and all nested bullets / sub-lists: preserve exact numbering.
  All NOTES, examples, annexes text for that clause.
  Tables: Convert to readable text (rows as "Row N: Col1 value, Col2 value, Col3 value...").
  Cross-references: Keep as printed (e.g., "See 4.2" or "Per Annex C").
  If chunk boundary splits a clause: Include what you have; add to "importantNotes": ["This clause content may be incomplete due to document chunk boundary, full text includes continuation"].
  When TOC shows "Printed page: 45", put it as first line: "Printed page: 45\n\n" then body text.
  Minimum length: If a clause has only 1–2 sentences, still include fully; do not skip short clauses.

**4. Bullets ("bullets")**
  Use for:
    - Numbered list items (a), b), c), …) when they are distinct requirements
    - Dashed or bulleted lists ("—", "•", "·")
    - NOTE paragraphs (prefix each: "NOTE: …")
    - Definition lists (Term: definition)
    - Examples (when enumerated)
  Each bullet = one list item (do NOT flatten multiple items into one).
  Cap at ~80 bullets per clause; if more, summarise in "content" and highlight top bullets.

**5. Summary ("summary"): NEW FIELD**
  One concise sentence (max ~200 chars) answering: "What does this clause mandate / establish?"
  Examples:
    - Clause 4.1 (Context of org): "Organization must determine internal/external issues affecting QMS ability to achieve objectives."
    - Clause 7.1.3 (Awareness): "Personnel must be aware of QMS policy, objectives, contribution to effectiveness, non-conformity consequences."
    - IEC 61010-1:2010 Clause 3.1 (Terms): "Defines key terminology for safety, construction, markings, testing."
    - FDA 21 CFR 820.3 (Management responsibility): "Manufacturer must establish quality policy and assign responsibility for QMS compliance."
  Use null only if clause is purely structural (e.g., "Table of Contents", blank annex introduction).

**6. Important Notes ("importantNotes"): NEW FIELD**
  Array of strings (max ~5 items), each highlighting:
    - Regulatory criticality ("This is a SHALL requirement; non-compliance = product recall risk")
    - Cross-clause dependencies ("Depends on 4.2 and 4.3 being in place")
    - Effective dates, amendments, or special rules ("Applies from 2024-01-01 onwards")
    - Scope limitations ("N/A if product is not classified as medical device")
    - Audit focus points ("Auditors specifically check this in management reviews")
    - Incompleteness warnings ("Chunk boundary may truncate; see continuation in next chunk")
  Use null if no special notes apply.

=== Structure / Order ===
- Emit one section per clause/subclause/annex/article (no merging; preserve document order).
- Foreword, Introduction, Scope, Terms come before numbered clauses.
- Normative annexes (Annex A, Annex B, …) and informative annexes (Appendix, Annex ZA for EU harmonised) in order.
- Do NOT skip clauses or annexes; even short ones.
- If two chunks show the same clause, keep both; the backend will merge by clauseNumber.

=== Language & Terminology ===
- Preserve exact clause labels as printed (inc. "Annex ZA", not "Annex 26" or "Annex National").
- Keep original language if document mixes languages (e.g., French requirement in EN standard with Annex ZA).
- Expand acronyms on first mention (e.g., "QMS (Quality Management System)") unless acronym is standard term (ISO, EN, IEC, etc.)."""


def system_prompt_for(doc_type: str) -> str:
    core = f"""You are a document analysis assistant for compliance and product documentation.
Return ONLY valid JSON (no markdown) with this exact shape:
{BASE_SHAPE}"""
    if doc_type in ("PRODUCT_DOC", "EVIDENCE"):
        core += PRODUCT_EXTRA
    elif doc_type == "ISO_NORM":
        core += STANDARD_EXTRA
    core += """
Use concise headings; put narrative in content; use bullets for lists when appropriate.
If the source text is empty or unreadable, infer what you reasonably can from the filename and hints only, and set sections to a single item explaining limitations.
Always include "sections" as an array (may be empty only if impossible).
For PRODUCT_DOC/EVIDENCE, always include top-level keys "fileSummary" and "visualDescription" (use null when not applicable).
For ISO_NORM (standards library: ISO, EN, IEC, etc.), always include "standardMetadata" and structure "sections" so each clause has an explicit clauseNumber, a title-only heading, and content/bullets split per clause like a standards Table of Contents (TOC page numbers go in content, not heading)."""
    return core


def _is_standard_doc(doc_type: str, iso_hint: Optional[str], file_name: str, description_hint: Optional[str]) -> bool:
    if (doc_type or "").upper() == "ISO_NORM":
        return True
    probe = " ".join(
        x for x in [iso_hint or "", file_name or "", description_hint or ""] if x
    ).lower()
    # Comprehensive standards families: ISO, EN, IEC, ASTM, ANSI, IEEE, DIN, BSI, NF, Regulations, US/EU/national standards.
    # Also match common patterns: numbered references (e.g., "61010", "21 CFR"), titles containing "standard", etc.
    patterns = [
        r"\b(iso|en\s*iso|en|iec|ieee|astm|ansi|din|bsi|nf|bs\s*en|regulation|directive|norm|csa|csn|jis|gb|gost)\b",
        r"\b(21\s+cfr|fda|gdpr|mdr|ce\s+mark|ul\s+\d+)\b",
        r"\d{4,5}[-:]?\d+",  # Numbered standards like "61010" or "9001:2015"
        r"(standard|norm|specification|regulation|requirements|mandatory)\s+(document|text|for|requirement)",
        r"(appendix|annex|scope|normative|informative|conformance)",
    ]
    return any(re.search(pattern, probe) for pattern in patterns)


def _chunk_text(text: str, size: int = STANDARD_CHUNK_CHARS, overlap: int = STANDARD_CHUNK_OVERLAP) -> List[str]:
    t = (text or "").strip()
    if not t:
        return []
    if len(t) <= size:
        return [t]
    out: List[str] = []
    start = 0
    step = max(1, size - overlap)
    while start < len(t):
        end = min(len(t), start + size)
        out.append(t[start:end])
        if end >= len(t):
            break
        start += step
    return out


def _normalize_section(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "clauseNumber": item.get("clauseNumber"),
        "heading": (item.get("heading") or "").strip(),
        "content": (item.get("content") or "").strip(),
        "bullets": item.get("bullets") if isinstance(item.get("bullets"), list) else [],
        "summary": (item.get("summary") or "").strip() or None,
        "importantNotes": item.get("importantNotes") if isinstance(item.get("importantNotes"), list) else None,
    }


def _merge_long_strings(a: Optional[str], b: Optional[str]) -> Optional[str]:
    sa = (a or "").strip()
    sb = (b or "").strip()
    if not sb:
        return sa or None
    if not sa:
        return sb or None
    if sb in sa:
        return sa
    if sa in sb:
        return sb
    joined = f"{sa}\n\n---\n{sb}".strip()
    return joined[:14_000] if len(joined) > 14_000 else joined


def _str_pick_longer(a: Any, b: Any) -> Optional[str]:
    sa = "" if a is None else str(a).strip()
    sb = "" if b is None else str(b).strip()
    if len(sb) > len(sa):
        return sb or None
    return sa or None


def _uniq_str_list(items: List[Any], cap: int = 200) -> List[str]:
    out: List[str] = []
    for x in items:
        s = str(x).strip()
        if s and s not in out:
            out.append(s)
        if len(out) >= cap:
            break
    return out


def _merge_product_profiles(acc: Any, part: Any) -> Dict[str, Any]:
    a = acc if isinstance(acc, dict) else {}
    b = part if isinstance(part, dict) else {}
    out: Dict[str, Any] = dict(a)

    def merge_bi(av: Any, bv: Any) -> Dict[str, Any]:
        x = dict(av if isinstance(av, dict) else {})
        y = bv if isinstance(bv, dict) else {}
        for k, v in y.items():
            if v is None:
                continue
            cur = x.get(k)
            picked = _str_pick_longer(cur, v)
            x[k] = picked if picked is not None else (cur if cur is not None else v)
        return x

    out["basicInformation"] = merge_bi(a.get("basicInformation"), b.get("basicInformation"))

    ac = a.get("certifications") if isinstance(a.get("certifications"), dict) else {}
    bc = b.get("certifications") if isinstance(b.get("certifications"), dict) else {}
    marks = _uniq_str_list([*(ac.get("marks") if isinstance(ac.get("marks"), list) else []), *(bc.get("marks") if isinstance(bc.get("marks"), list) else [])])
    stds = _uniq_str_list(
        [*(ac.get("standards") if isinstance(ac.get("standards"), list) else []), *(bc.get("standards") if isinstance(bc.get("standards"), list) else [])]
    )
    appr = _uniq_str_list(
        [
            *(ac.get("approvalNumbers") if isinstance(ac.get("approvalNumbers"), list) else []),
            *(bc.get("approvalNumbers") if isinstance(bc.get("approvalNumbers"), list) else []),
        ]
    )
    if marks or stds or appr:
        out["certifications"] = {"marks": marks or None, "standards": stds or None, "approvalNumbers": appr or None}

    out["usage"] = merge_bi(a.get("usage"), b.get("usage"))

    for fld in (
        "generalDescription",
        "applications",
        "qualitySpecificationNarrative",
        "regulatoryNotes",
        "technicalCharacteristics",
        "dimensions",
        "weight",
    ):
        if b.get(fld):
            out[fld] = _merge_long_strings(str(a.get(fld) or ""), str(b.get(fld) or ""))

    rows_a = a.get("traceabilityRows") if isinstance(a.get("traceabilityRows"), list) else []
    rows_b = b.get("traceabilityRows") if isinstance(b.get("traceabilityRows"), list) else []
    merged_rows: List[Dict[str, Any]] = []
    seen: set[tuple[str, str, str, str, str]] = set()
    for src in (rows_a, rows_b):
        for r in src:
            if not isinstance(r, dict):
                continue
            tup = tuple(str(r.get(k) or "").strip() for k in ("category", "parameter", "value", "unit", "notes"))
            if any(tup) and tup not in seen:
                seen.add(tup)
                merged_rows.append(
                    {
                        "category": r.get("category"),
                        "parameter": r.get("parameter"),
                        "value": r.get("value"),
                        "unit": r.get("unit"),
                        "notes": r.get("notes"),
                    }
                )
            if len(merged_rows) >= 200:
                break
    if merged_rows:
        out["traceabilityRows"] = merged_rows

    bullets = _uniq_str_list(
        [
            *(a.get("technicalBullets") if isinstance(a.get("technicalBullets"), list) else []),
            *(b.get("technicalBullets") if isinstance(b.get("technicalBullets"), list) else []),
        ],
        cap=120,
    )
    if bullets:
        out["technicalBullets"] = bullets
    sw = _uniq_str_list(
        [
            *(a.get("safetyWarnings") if isinstance(a.get("safetyWarnings"), list) else []),
            *(b.get("safetyWarnings") if isinstance(b.get("safetyWarnings"), list) else []),
        ],
        cap=80,
    )
    if sw:
        out["safetyWarnings"] = sw

    onboarding = _merge_onboarding(a.get("onboarding"), b.get("onboarding"))
    if onboarding:
        out["onboarding"] = onboarding

    return out


ONBOARDING_SCALARS = (
    "productName",
    "sku",
    "brandName",
    "productFamily",
    "category",
    "productType",
    "description",
    "intendedUse",
    "physicalForm",
    "hsTariffCode",
    "countryOfOrigin",
)

ONBOARDING_LISTS = (
    "targetUsers",
    "keyMaterials",
    "targetMarkets",
    "requiredCertifications",
    "applicableRegulations",
    "industryLabels",
    "productionSites",
    "productionProcesses",
    "criticalSuppliers",
)

CERT_FIELDS = ("standardName", "certifyingBody", "certificateNumber", "marketScope", "issueDate", "expiryDate")


def _merge_onboarding(acc: Any, part: Any) -> Dict[str, Any]:
    """Union the wizard pre-fill draft across chunks: richest scalar wins, lists are unioned."""
    a = acc if isinstance(acc, dict) else {}
    b = part if isinstance(part, dict) else {}
    if not a and not b:
        return {}
    out: Dict[str, Any] = {}

    for fld in ONBOARDING_SCALARS:
        # Enum-ish fields must not be lengthened by concatenation, pick the richer single value.
        picked = _str_pick_longer(a.get(fld), b.get(fld))
        if picked:
            out[fld] = picked

    for fld in ONBOARDING_LISTS:
        merged = _uniq_str_list(
            [
                *(a.get(fld) if isinstance(a.get(fld), list) else []),
                *(b.get(fld) if isinstance(b.get(fld), list) else []),
            ],
            cap=60,
        )
        if merged:
            out[fld] = merged

    certs: List[Dict[str, Any]] = []
    seen_certs: set[tuple[str, str]] = set()
    for src in (a.get("productCertifications"), b.get("productCertifications")):
        for row in src if isinstance(src, list) else []:
            if not isinstance(row, dict):
                continue
            name = str(row.get("standardName") or "").strip()
            number = str(row.get("certificateNumber") or "").strip()
            if not name and not number:
                continue
            key = (name.lower(), number.lower())
            if key in seen_certs:
                continue
            seen_certs.add(key)
            certs.append({k: row.get(k) for k in CERT_FIELDS})
            if len(certs) >= 25:
                break
    if certs:
        out["productCertifications"] = certs

    return out


def _merge_structured(acc: Dict[str, Any], part: Dict[str, Any], doc_type: str) -> Dict[str, Any]:
    if not acc:
        acc = {
            "title": part.get("title"),
            "documentTypeGuess": part.get("documentTypeGuess"),
            "classification": part.get("classification"),
            "sections": [],
            "keyPoints": [],
        }
        if doc_type in ("PRODUCT_DOC", "EVIDENCE"):
            acc["fileSummary"] = part.get("fileSummary")
            acc["visualDescription"] = part.get("visualDescription")
            if isinstance(part.get("productProfile"), dict):
                acc["productProfile"] = part.get("productProfile")
        if doc_type == "ISO_NORM" and isinstance(part.get("standardMetadata"), dict):
            acc["standardMetadata"] = part.get("standardMetadata")

    acc["title"] = acc.get("title") or part.get("title")
    acc["documentTypeGuess"] = acc.get("documentTypeGuess") or part.get("documentTypeGuess")
    acc["classification"] = acc.get("classification") or part.get("classification")

    # Merge sections by (clauseNumber, heading) while preserving order.
    seen: Dict[tuple[str, str], int] = {}
    merged_sections: List[Dict[str, Any]] = list(acc.get("sections") or [])
    for idx, s in enumerate(merged_sections):
        key = ((s.get("clauseNumber") or "").strip(), (s.get("heading") or "").strip().lower())
        seen[key] = idx

    for raw in part.get("sections") or []:
        if not isinstance(raw, dict):
            continue
        s = _normalize_section(raw)
        key = ((s.get("clauseNumber") or "").strip(), (s.get("heading") or "").strip().lower())
        pos = seen.get(key)
        if pos is None:
            seen[key] = len(merged_sections)
            merged_sections.append(s)
            continue
        cur = merged_sections[pos]
        if not (cur.get("content") or "").strip() and s.get("content"):
            cur["content"] = s["content"]
        elif s.get("content") and s["content"] not in (cur.get("content") or ""):
            cur["content"] = ((cur.get("content") or "") + "\n\n" + s["content"]).strip()
        existing_b = [str(x) for x in (cur.get("bullets") or [])]
        for b in s.get("bullets") or []:
            bs = str(b)
            if bs and bs not in existing_b:
                existing_b.append(bs)
        cur["bullets"] = existing_b
        # Merge summary (prefer longer if both present)
        if s.get("summary") and (not cur.get("summary") or len(s["summary"]) > len(cur.get("summary") or "")):
            cur["summary"] = s["summary"]
        # Merge importantNotes
        existing_notes = [str(x) for x in (cur.get("importantNotes") or [])]
        for note in s.get("importantNotes") or []:
            ns = str(note).strip()
            if ns and ns not in existing_notes:
                existing_notes.append(ns)
        cur["importantNotes"] = existing_notes if existing_notes else None

    acc["sections"] = merged_sections

    kp = [str(x) for x in (acc.get("keyPoints") or [])]
    for p in part.get("keyPoints") or []:
        ps = str(p)
        if ps and ps not in kp:
            kp.append(ps)
    acc["keyPoints"] = kp

    if doc_type in ("PRODUCT_DOC", "EVIDENCE"):
        if isinstance(part.get("productProfile"), dict):
            acc["productProfile"] = _merge_product_profiles(acc.get("productProfile"), part["productProfile"])
        if part.get("fileSummary") is not None and str(part.get("fileSummary") or "").strip():
            acc["fileSummary"] = _merge_long_strings(
                str(acc.get("fileSummary") or "") if acc.get("fileSummary") is not None else None,
                str(part.get("fileSummary") or ""),
            )
        if part.get("visualDescription") is not None and str(part.get("visualDescription") or "").strip():
            acc["visualDescription"] = _merge_long_strings(
                str(acc.get("visualDescription") or "") if acc.get("visualDescription") is not None else None,
                str(part.get("visualDescription") or ""),
            )

    if doc_type == "ISO_NORM" and isinstance(part.get("standardMetadata"), dict):
        sm = dict(acc.get("standardMetadata") or {})
        for k, v in part["standardMetadata"].items():
            if k == "categories":
                cur_cats = sm.get("categories") if isinstance(sm.get("categories"), list) else []
                new_cats = v if isinstance(v, list) else []
                merged_cats: List[str] = []
                for c in [*cur_cats, *new_cats]:
                    cs = str(c).strip()
                    if cs and cs not in merged_cats:
                        merged_cats.append(cs)
                sm["categories"] = merged_cats or None
            elif not sm.get(k) and v is not None:
                sm[k] = v
        acc["standardMetadata"] = sm

    return acc


def _client() -> AsyncOpenAI:
    base = (settings.OPENAI_BASE_URL or "").strip() or None
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY or "dummy", base_url=base)


def _shrink_image_for_inline(buffer: bytes) -> bytes:
    """Best-effort shrink to keep JSON body under proxy limits."""
    try:
        from PIL import Image
    except Exception:
        return buffer

    try:
        img = Image.open(io.BytesIO(buffer))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Downscale very large images first.
        max_side = 1024
        w, h = img.size
        if max(w, h) > max_side:
            if w >= h:
                nw, nh = max_side, int(h * (max_side / w))
            else:
                nh, nw = max_side, int(w * (max_side / h))
            img = img.resize((max(nw, 1), max(nh, 1)))

        # Try JPEG qualities until below target.
        for quality in (70, 55, 45, 35, 25):
            out = io.BytesIO()
            img.save(out, format="JPEG", quality=quality, optimize=True)
            data = out.getvalue()
            if len(data) <= MAX_INLINE_IMAGE_BYTES:
                return data
        return data
    except Exception:
        return buffer


def flatten_for_search(raw_text: str, structured: Dict[str, Any]) -> str:
    parts: List[str] = []
    if raw_text:
        parts.append(raw_text)
    if structured.get("title"):
        parts.append(f"Title: {structured['title']}")
    if structured.get("documentTypeGuess"):
        parts.append(f"Type: {structured['documentTypeGuess']}")
    if structured.get("classification"):
        parts.append(f"Classification: {structured['classification']}")
    pp = structured.get("productProfile")
    if isinstance(pp, dict):
        for k, v in pp.items():
            if v is None:
                continue
            if isinstance(v, dict):
                parts.append(f"{k}: " + json.dumps(v, ensure_ascii=False))
            elif isinstance(v, list):
                parts.append(f"{k}: " + "\n".join(str(x) for x in v))
            else:
                parts.append(f"{k}: {v}")
    sm = structured.get("standardMetadata")
    if isinstance(sm, dict):
        parts.append("Standard: " + json.dumps(sm, ensure_ascii=False))
    for s in structured.get("sections") or []:
        if isinstance(s, dict):
            cn = s.get("clauseNumber")
            if cn:
                parts.append(str(cn))
            parts.append(s.get("heading") or "")
            parts.append(s.get("content") or "")
            bullets = s.get("bullets") or []
            if bullets:
                parts.append("\n".join(str(b) for b in bullets))
    for k in structured.get("keyPoints") or []:
        parts.append(str(k))
    if structured.get("fileSummary"):
        parts.append(f"Summary: {structured['fileSummary']}")
    if structured.get("visualDescription"):
        parts.append(f"Visual: {structured['visualDescription']}")
    return "\n\n".join(p for p in parts if p).strip()


def _strip_code_fence(raw: str) -> str:
    """Some providers wrap JSON in ```json … ``` despite response_format=json_object."""
    s = (raw or "").strip()
    if not s.startswith("```"):
        return s
    s = re.sub(r"^```[a-zA-Z]*\s*", "", s)
    return re.sub(r"\s*```$", "", s).strip()


def _parse_json(raw: str, doc_type: str) -> Dict[str, Any]:
    try:
        o = json.loads(_strip_code_fence(raw))
        raw_secs = o.get("sections") if isinstance(o.get("sections"), list) else []
        norm_secs: List[Dict[str, Any]] = []
        for item in raw_secs:
            if not isinstance(item, dict):
                continue
            norm_secs.append(
                {
                    "clauseNumber": item.get("clauseNumber"),
                    "heading": item.get("heading") or "",
                    "content": item.get("content") or "",
                    "bullets": item.get("bullets") if isinstance(item.get("bullets"), list) else [],
                    "summary": (item.get("summary") or "").strip() or None,
                    "importantNotes": item.get("importantNotes") if isinstance(item.get("importantNotes"), list) else None,
                }
            )
        out: Dict[str, Any] = {
            "title": o.get("title"),
            "documentTypeGuess": o.get("documentTypeGuess"),
            "classification": o.get("classification"),
            "sections": norm_secs,
            "keyPoints": o.get("keyPoints") if isinstance(o.get("keyPoints"), list) else [],
        }
        if doc_type in ("PRODUCT_DOC", "EVIDENCE"):
            out["fileSummary"] = o.get("fileSummary")
            out["visualDescription"] = o.get("visualDescription")
            if isinstance(o.get("productProfile"), dict):
                out["productProfile"] = o["productProfile"]
        if doc_type == "ISO_NORM" and isinstance(o.get("standardMetadata"), dict):
            out["standardMetadata"] = o["standardMetadata"]
        return out
    except Exception as exc:
        # Silent here means the document lands with no productProfile and nothing to
        # pre-fill the product wizard with. The usual cause is STRUCTURE_MAX_TOKENS
        # cutting the JSON mid-object, so log enough to tell truncation apart.
        logger.warning(
            "structure: could not parse model JSON (%s): doc_type=%s, raw_len=%s, ends_with=%r",
            exc,
            doc_type,
            len(raw or ""),
            (raw or "")[-60:],
        )
        base: Dict[str, Any] = {
            "title": None,
            "documentTypeGuess": None,
            "classification": None,
            "sections": [{"heading": "Extraction", "content": raw[:2000] or "Could not parse model output.", "bullets": []}],
            "keyPoints": [],
        }
        if doc_type in ("PRODUCT_DOC", "EVIDENCE"):
            base["fileSummary"] = None
            base["visualDescription"] = None
        return base


ONBOARDING_SYSTEM = """You read a product document and pre-fill a product onboarding form that a quality manager then verifies.

Return ONLY this JSON object: no prose, no markdown fence:
{
  "productName": string|null, "sku": string|null, "brandName": string|null,
  "productFamily": string|null, "category": string|null,
  "productType": "finished"|"semi_finished"|"component"|"raw_material"|"service"|null,
  "description": string|null, "intendedUse": string|null,
  "targetUsers": string[]|null, "keyMaterials": string[]|null,
  "physicalForm": "Solid"|"Liquid"|"Gas"|"Powder"|"Paste"|"Other"|null,
  "hsTariffCode": string|null, "countryOfOrigin": string|null,
  "targetMarkets": string[]|null, "requiredCertifications": string[]|null,
  "applicableRegulations": string[]|null, "industryLabels": string[]|null,
  "productionSites": string[]|null, "productionProcesses": string[]|null,
  "criticalSuppliers": string[]|null,
  "productCertifications": [{"standardName": string, "certifyingBody": string|null, "certificateNumber": string|null, "marketScope": string|null, "issueDate": "YYYY-MM-DD"|null, "expiryDate": "YYYY-MM-DD"|null}]|null
}

Rules: a wrong value costs the user more than a missing one:
- Use null for anything the document does not state. Never guess, never return an empty string.
- productName = the commercial designation as printed, not the file name. sku = manufacturer reference or model number. brandName = trade mark. productFamily = range/series.
- productType: "finished" = ready to sell, "semi_finished" = needs further processing, "component" = supplied into another product, "raw_material" = feedstock, "service" = a service.
- intendedUse: 2-3 sentences: what it is, who uses it, how and where, and any hazard or special condition. Ground every clause in the document.
- description: one sentence. Keep every list to at most 8 entries, shortest useful wording.
- targetUsers ONLY from: ["B2B (Industrial)","B2B (Commercial)","B2C (General consumers)","B2C (Children / Minors)","Medical professionals","Food service / Catering","Government / Public sector"]
- targetMarkets ONLY from: ["European Union","USA (FDA-regulated)","USA (General)","Gulf (GCC / GSO)","North Africa / Maghreb","Sub-Saharan Africa","United Kingdom","Domestic (Tunisia)"]. Infer from declared markets, languages, market-specific marks, or the regulations cited.
- industryLabels ONLY from: ["CE Marking","FDA Registration","Halal","Kosher","REACH compliant","RoHS compliant","Ecolabel","OEKO-TEX"]. Only what the document actually claims.
- productionProcesses ONLY from: ["Production / Assembly","Quality Control","Procurement","Dyeing & Finishing","Packaging","Logistics / Warehousing"]
- applicableRegulations = regulation/directive references cited (e.g. "Regulation (EU) 2017/745", "REACH", "21 CFR 820"). requiredCertifications = certification schemes required or targeted.
- productCertifications: only certificates the document actually evidences; null otherwise."""

ONBOARDING_INPUT_CHARS = 12_000


async def extract_onboarding(
    raw_text: str,
    file_name: str,
    description_hint: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Product-wizard pre-fill, extracted on its own.

    Kept separate from `structure_content` on purpose: the full document schema
    already saturates the provider's max_tokens ceiling (agregatech hard-caps at
    1000), so appending these fields there produced truncated, unparseable JSON
    and the wizard got nothing. A dedicated small response fits comfortably.
    """
    cfg = get_settings()
    if not (cfg.OPENAI_API_KEY or "").strip():
        return None
    text = (raw_text or "").strip()
    if not text:
        return None

    user_text = "\n\n".join(
        x
        for x in [
            f"Filename: {file_name}",
            f"Description hint: {description_hint}" if description_hint else None,
            f"Document text:\n{text[:ONBOARDING_INPUT_CHARS]}",
        ]
        if x
    )

    try:
        res = await _client().chat.completions.create(
            model=cfg.STRUCTURE_MODEL or cfg.OPENAI_MODEL,
            temperature=0.1,
            max_tokens=cfg.ONBOARDING_MAX_TOKENS,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": ONBOARDING_SYSTEM},
                {"role": "user", "content": user_text},
            ],
        )
        raw = (res.choices[0].message.content or "").strip()
        parsed = json.loads(_strip_code_fence(raw))
    except Exception as exc:
        logger.warning("extract_onboarding failed for %s: %s", file_name, exc)
        return None

    if not isinstance(parsed, dict):
        return None
    # Drop nulls/empties so the merge and the UI only see fields actually found.
    cleaned = {
        k: v
        for k, v in parsed.items()
        if v not in (None, "", [], {}) and (not isinstance(v, str) or v.strip())
    }
    return cleaned or None


async def structure_content(
    raw_text: str,
    buffer: bytes,
    mime_type: str,
    file_name: str,
    doc_type: str,
    iso_hint: Optional[str],
    description_hint: Optional[str],
) -> Dict[str, Any]:
    cfg = get_settings()
    if not (cfg.OPENAI_API_KEY or "").strip():
        raise ValueError("OPENAI_API_KEY is not configured")

    max_input_chars = max(2_000, int(cfg.STRUCTURE_MAX_INPUT_CHARS or 10_000))

    is_standard = _is_standard_doc(doc_type, iso_hint, file_name, description_hint)
    prompt_doc_type = "ISO_NORM" if is_standard else doc_type
    model = cfg.STRUCTURE_MODEL or cfg.OPENAI_MODEL
    client = _client()
    sys_prompt = system_prompt_for(prompt_doc_type)

    hints_lines = [
        f"Filename: {file_name}",
        f"Declared document category: {doc_type}",
        f"Standard / norm hint (code or family, e.g. ISO, EN, IEC): {iso_hint}" if iso_hint else None,
        f"Description hint: {description_hint}" if description_hint else None,
    ]
    hints = "\n".join(x for x in hints_lines if x)

    if mime_type.startswith("image/"):
        import base64

        inline_bytes = buffer
        if len(inline_bytes) > MAX_INLINE_IMAGE_BYTES:
            inline_bytes = _shrink_image_for_inline(inline_bytes)
        b64 = base64.b64encode(inline_bytes).decode("ascii")
        data_url = f"data:{mime_type};base64,{b64}"
        if doc_type == "ISO_NORM":
            vision_hint = (
                f"{hints}\n\nThis is an image of a standards or regulatory document page. "
                "Put designation and title from the page into standardMetadata. "
                "List every visible clause/section anchor like a Table of Contents: clauseNumber, title-only heading, "
                "content for body text (or a single \"Printed page: …\" line when only TOC + page is visible), bullets for NOTEs/lists. "
                "Use the same EN / IEC / ISO clause segmentation rules as in the system instructions. "
                "Use visualDescription for a faithful description of the page layout and text you see."
            )
        else:
            vision_hint = (
                f"{hints}\n\nThis is an image of a product or product-related document. Analyse it thoroughly:\n"
                "1. \"visualDescription\": Write a rich, detailed description of EVERYTHING visible, product shape, colours, controls, "
                "large red emergency-stop or similar safety controls, packaging, labels. "
                "Explicitly describe any warning stickers, hazard plates, pictograms (triangle exclamation, high voltage, pinch, hot surface, etc.), "
                "multilingual caution text (French/English/other), and any legible sticker text, quote short phrases verbatim when readable. "
                "If a warning symbol is present but text is unreadable, say so. Also note certification marks (CE, ISO, RoHS, UL, etc.), "
                "serial/model/reference numbers, barcodes/QR codes, languages on labels, power/voltage markings, and traceability stamps.\n"
                "2. \"fileSummary\": One concise paragraph (even for a raw product photo) summarising what the image establishes: "
                "product or machine type, apparent purpose, and the most important visible safety/UI cues.\n"
                "3. \"productProfile\": fill every field you can identify from the image. "
                "For certifications.marks list every certification logo/mark you see (CE, ISO, RoHS, UL, GS, TÜV, etc.). "
                "For safetyWarnings list every distinct hazard or safety message: copy sticker/plate wording where possible; "
                "if only a pictogram is visible, describe the symbol and location on the product. "
                "For traceabilityRows extract every spec row visible (dimensions, weight, power, voltage, speed, capacity, etc.). "
                "Use null only when genuinely not visible: do not guess."
            )
        # Some provider proxies reject large JSON bodies (413). If image is still too big,
        # fallback to OCR/text-only extraction instead of failing the whole document.
        if len(data_url) > 80_000:
            logger.warning(
                "structure_content: image payload too large for inline vision (%s chars), using OCR/text-only fallback",
                len(data_url),
            )
            ocr_hint = (
                f"{vision_hint}\n\nOCR text extracted from image (may be noisy):\n"
                f"{(raw_text or '')[:max_input_chars]}"
            )
            res = await client.chat.completions.create(
                model=model,
                temperature=0.2,
                max_tokens=cfg.STRUCTURE_MAX_TOKENS,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": ocr_hint},
                ],
            )
            return _parse_json(res.choices[0].message.content or "{}", prompt_doc_type)

        res = await client.chat.completions.create(
            model=model,
            temperature=0.2,
            max_tokens=cfg.STRUCTURE_MAX_TOKENS,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": sys_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": vision_hint,
                        },
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
        )
        return _parse_json(res.choices[0].message.content or "{}", prompt_doc_type)

    full_text = (raw_text or "").strip()
    if len(full_text) < MIN_TEXT_FOR_SKIP_VISION:
        full_text = ""

    extra_user = (
        "For PRODUCT_DOC/EVIDENCE: produce a clear fileSummary from the text. "
        "Extract every product identifier visible (reference, modelNumber, serialNumber, tradeMark, manufacturer). "
        "List all certifications (marks, standards, approvalNumbers). "
        "Fill traceabilityRows for every tabular spec (dimensions, weight, voltage, power, capacity, speed, etc.). "
        "Fill qualitySpecificationNarrative with all QA/quality-related text. "
        "List safetyWarnings for any hazard or safety statements."
    )
    if prompt_doc_type == "ISO_NORM":
        extra_user = (
            "=== STANDARDS EXTRACTION (ISO/EN/IEC/ASTM/ANSI/Regulations) ===\n"
            "1. Fill standardMetadata.reference from title block (e.g., 'EN ISO 9001:2015', 'IEC 60601-1:2005+AMD1:2012', 'FDA 21 CFR 820').\n"
            "2. standardMetadata.categories: Exact family type (ISO, EN, EN ISO, ISO/IEC, IEC, ASTM, ANSI, IEEE, DIN, BSI, NF, Regulation, FDA, etc.).\n"
            "3. Extract EVERY clause/subclause/annex: do NOT skip any, even short ones. Preserve exact numbering.\n"
            "4. For each section:\n"
            "   - clauseNumber: Exact label (4.1.2, Annex A, Article 5, Scope, etc.)\n"
            "   - heading: Title only (no numbers, no page leaders, no page numbers)\n"
            "   - content: COMPLETE body text including all SHALL/MUST requirements, sub-items a) b) c), tables, NOTES. If clause spans chunks, include continuation warning in importantNotes.\n"
            "   - bullets: Separate list items, numbered requirements, NOTEs, definition lists (max ~80 items)\n"
            "   - summary: One sentence: 'What does this mandate?' (e.g., 'Organization must establish QMS policy')\n"
            "   - importantNotes: Array of compliance highlights (SHALL requirement, audit focus, scope, dependency on other clauses, effective dates, incompleteness warnings)\n"
            "5. Keep all languages as printed; mark translations if both present.\n"
            "6. Convert tables to text: 'Row N: Col1=value, Col2=value' format.\n"
            "7. Preserve document order; do NOT merge adjacent clauses.\n"
            "8. Apply same rules to EN, EN ISO, IEC, ASTM, ANSI, IEEE, DIN, Regulations, and all variants."
        )

    async def _run_chunked_merge(
        chunks: List[str],
        intro: str,
        *,
        concurrency: int = 4,
    ) -> Optional[Dict[str, Any]]:
        use = chunks[:MAX_STRUCTURE_CHUNKS]
        if len(chunks) > MAX_STRUCTURE_CHUNKS:
            logger.warning(
                "structure_content: processing first %s/%s chunks, tail not structured (raise STRUCTURE_MAX_INPUT_CHARS or split file)",
                MAX_STRUCTURE_CHUNKS,
                len(chunks),
            )
        if len(use) <= 1:
            return None
        sem = asyncio.Semaphore(max(1, concurrency))

        async def run_one(idx: int, chunk: str) -> Tuple[int, Dict[str, Any]]:
            chunk_user_text = "\n\n".join(
                [
                    hints,
                    f"{intro} ({idx}/{len(use)}).",
                    f"Document text:\n{chunk}",
                    extra_user,
                ]
            )
            async with sem:
                res = await client.chat.completions.create(
                    model=model,
                    temperature=0.2,
                    max_tokens=cfg.STRUCTURE_MAX_TOKENS,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": chunk_user_text},
                    ],
                )
            part = _parse_json(res.choices[0].message.content or "{}", prompt_doc_type)
            return idx, part

        parts_ordered = await asyncio.gather(*(run_one(i, ch) for i, ch in enumerate(use, start=1)))
        merged: Dict[str, Any] = {}
        for _idx, part in sorted(parts_ordered, key=lambda t: t[0]):
            merged = _merge_structured(merged, part, prompt_doc_type)
        return merged or None

    # ISO: structure the full PDF text in overlapping chunks (avoids losing late clauses to a single truncation).
    if prompt_doc_type == "ISO_NORM" and full_text:
        iso_chunks = _chunk_text(
            full_text,
            size=ISO_STRUCTURE_CHUNK_CHARS,
            overlap=ISO_STRUCTURE_CHUNK_OVERLAP,
        )
        merged_iso = await _run_chunked_merge(
            iso_chunks,
            "Chunk from this standards document: keep clause anchors exactly as printed",
            concurrency=ISO_CHUNK_CONCURRENCY,
        )
        if merged_iso and merged_iso.get("sections"):
            return merged_iso

    # Long product manuals / datasheets: same multi-pass merge so traceabilityRows and sections survive token limits.
    if prompt_doc_type in ("PRODUCT_DOC", "EVIDENCE") and full_text and len(full_text) >= max_input_chars:
        pchunks = _chunk_text(full_text, size=PRODUCT_CHUNK_CHARS, overlap=PRODUCT_CHUNK_OVERLAP)
        merged_p = await _run_chunked_merge(
            pchunks,
            "Portion of this product or evidence document: extract identifiers, tables, and chapter text visible in THIS portion",
            concurrency=PRODUCT_CHUNK_CONCURRENCY,
        )
        if merged_p and (merged_p.get("sections") or merged_p.get("productProfile")):
            return merged_p

    text_block = full_text
    if len(text_block) > max_input_chars:
        logger.info(
            "structure_content: single-pass truncating text from %s to %s chars (STRUCTURE_MAX_INPUT_CHARS)",
            len(text_block),
            max_input_chars,
        )
        text_block = text_block[:max_input_chars]

    doc_hint = (
        f"Document text:\n{text_block}" if text_block else "No usable text was extracted automatically (may be scanned). Use filename and hints; keep sections honest about uncertainty."
    )
    user_text = "\n\n".join([hints, doc_hint, extra_user])

    res = await client.chat.completions.create(
        model=model,
        temperature=0.2,
        max_tokens=cfg.STRUCTURE_MAX_TOKENS,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_text},
        ],
    )
    return _parse_json(res.choices[0].message.content or "{}", prompt_doc_type)
