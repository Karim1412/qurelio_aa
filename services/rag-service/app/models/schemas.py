from pydantic import BaseModel
from typing  import Optional, List
from enum    import Enum


class DocType(str, Enum):
    ISO_NORM       = "ISO_NORM"
    PRODUCT_DOC    = "PRODUCT_DOC"
    PROCEDURE      = "PROCEDURE"
    EVIDENCE       = "EVIDENCE"
    WORKSPACE_FILE = "WORKSPACE_FILE"


class IngestRequest(BaseModel):
    document_id:  str
    company_id:   str
    storage_key:  str
    mime_type:    str
    doc_type:     DocType
    iso_standard: Optional[str] = None
    file_name:    Optional[str] = None
    version:      Optional[int] = None
    description:  Optional[str] = None


class IngestResponse(BaseModel):
    document_id:    str
    chunks_indexed: int
    status:         str


class IndexStandardRequest(BaseModel):
    """STD-006: index clause text after QM activates a standard (tenant namespace)."""
    document_id: str
    company_id: str
    text: str
    iso_standard: Optional[str] = None
    file_name: Optional[str] = None
    version: Optional[int] = None
    doc_type: str = "ISO_NORM"


class EvaluateRequest(BaseModel):
    evaluation_id:         str
    company_id:            str
    iso_document_id:       str
    product_document_id:   str
    iso_standard:          str
    evidence_document_ids: Optional[List[str]] = None
    scoring_method:        str = "AI_AUTOMATIC"
    clause_weights:        Optional[dict] = None


class EvidenceExcerpt(BaseModel):
    document_id:       str
    excerpt:           str
    similarity_score:  float
    source_label:      Optional[str] = None


class ClauseResult(BaseModel):
    clause_reference:      str
    clause_title:          str   = ""
    clause_summary:        str   = ""
    clause_text_excerpt:   str
    verdict:               str   # SATISFIED | PARTIALLY_SATISFIED | NOT_SATISFIED
    confidence:            float
    supporting_evidence:   List[EvidenceExcerpt]
    gaps:                  List[str]
    suggestions:           List[str]
    legacy_score:          float
    legacy_status:         str
    reasoning:             str   = ""
    requirement_elements:  List[dict] = []
    evidence_assessment:   List[dict] = []


class EvaluateResponse(BaseModel):
    evaluation_id:    str
    conformity_score: float
    summary:          str
    results:          List[ClauseResult]


class ChatMessage(BaseModel):
    role:    str
    content: str


class ChatRequest(BaseModel):
    company_id: str
    question:   str
    history:    Optional[List[ChatMessage]] = []


class SourceDoc(BaseModel):
    document_id: str
    chunk_text:  str
    score:       float
    metadata:    dict


class ChatResponse(BaseModel):
    answer:  str
    sources: List[SourceDoc]


# ── CAPA-008 / CAPA-009 (NC AI helpers; tenant history supplied by evaluation-service) ──


class ProbableCauseItem(BaseModel):
    id: str
    title: str
    rationale: str
    confidence: float = 0.5


class NcRootCauseAiRequest(BaseModel):
    title: str
    description: str = ""
    iso_clause: Optional[str] = None
    classification: Optional[str] = None
    history_lines: List[str] = []


class NcRootCauseAiResponse(BaseModel):
    probable_causes: List[ProbableCauseItem]
    model: Optional[str] = None


class NcIshikawaAiRequest(BaseModel):
    title: str
    description: str = ""
    iso_clause: Optional[str] = None
    history_lines: List[str] = []


class NcIshikawaAiResponse(BaseModel):
    man: str
    machine: str
    material: str
    method: str
    measurement: str
    environment: str
    model: Optional[str] = None


class AuditChecklistScoreRequest(BaseModel):
    """One audit checklist criterion — evaluation-service loads DB row and forwards text to RAG."""
    question: str
    answer: Optional[str] = None
    notes: Optional[str] = None
    iso_clause: Optional[str] = None
    iso_standard: Optional[str] = None
    evidence_checklist_text: Optional[str] = None


class AuditChecklistScoreResponse(BaseModel):
    score: int
    # CONFORMANT | NON_CONFORMANT | OBSERVATION | STRENGTH (optional for backward compatibility)
    answer: Optional[str] = None
    rationale: Optional[str] = None
    model: Optional[str] = None


class AuditClauseEvidenceItemsRequest(BaseModel):
    question: str
    iso_clause: Optional[str] = None
    iso_standard: Optional[str] = None
    existing_labels: Optional[list[str]] = None


class AuditClauseEvidenceItemsResponse(BaseModel):
    items: list[str]
    model: Optional[str] = None
