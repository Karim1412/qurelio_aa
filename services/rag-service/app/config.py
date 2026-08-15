from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PORT:                int  = 8000
    OPENAI_API_KEY:      str  = ""
    OPENAI_BASE_URL:     str  = "https://openai.agregatech.com/v1"
    OPENAI_MODEL:        str  = "gpt-4o-mini"
    # Completion cap — OpenRouter free/low credits reject very high max_tokens (e.g. 16384).
    LLM_MAX_TOKENS:      int  = 1000
    # JSON extraction completions — separate cap (often needs more than chat).
    STRUCTURE_MAX_TOKENS: int = 4096
    # Product-wizard pre-fill runs as its own compact pass, so it fits under providers
    # that hard-cap max_tokens (agregatech rejects anything above 1000).
    ONBOARDING_MAX_TOKENS: int = 1000
    # JSON structuring (document extraction); can match OPENAI_MODEL for OpenRouter
    STRUCTURE_MODEL:     str  = "gpt-4o-mini"
    # Max characters of extracted text sent in the structuring prompt (tokens ≈ chars/4).
    # OpenRouter free/low tiers often cap total prompt ~12k tokens; keep this conservative.
    STRUCTURE_MAX_INPUT_CHARS: int = 14_000
    # Embeddings (OpenRouter-compatible by default)
    EMBEDDING_API_KEY:   str  = ""
    EMBEDDING_BASE_URL:  str  = "https://openrouter.ai/api/v1"
    EMBEDDING_MODEL:     str  = "openai/text-embedding-3-small"
    # Chat LLM fallback when primary provider returns 429 / quota errors
    CHAT_LLM_FALLBACK_API_KEY:  str = ""
    CHAT_LLM_FALLBACK_BASE_URL: str = "https://openrouter.ai/api/v1"
    CHAT_LLM_FALLBACK_MODEL:    str = "openai/gpt-4o-mini"
    # Tenant operational data (NCs, audits, CAPA) for RAG chat
    EVALUATION_SERVICE_URL: str = "http://evaluation-service:3005"
    # Callback to document-service after extraction (writes DB + status READY)
    DOCUMENT_SERVICE_URL: str = "http://document-service:3003"
    DOCUMENT_INTERNAL_TOKEN: str = ""
    PINECONE_API_KEY:    str  = ""
    PINECONE_INDEX_NAME: str  = "qurelio-vectors"
    MINIO_ENDPOINT:      str  = "minio"
    MINIO_PORT:          int  = 9000
    MINIO_ACCESS_KEY:    str  = "minioadmin"
    MINIO_SECRET_KEY:    str  = "minioadmin123"
    MINIO_BUCKET:        str  = "qurelio-docs"
    MINIO_USE_SSL:       bool = False
    JWT_SECRET:          str  = ""
    CHUNK_SIZE:          int  = 1000
    CHUNK_OVERLAP:       int  = 200

    class Config:
        env_file = "../../.env"
        extra    = "ignore"


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    # Docker may set OPENAI_BASE_URL="" which overrides the class default; treat as unset.
    # Keep PURA endpoint as fallback when env var is empty.
    if not (s.OPENAI_BASE_URL or "").strip():
        return s.model_copy(update={"OPENAI_BASE_URL": "https://openai.agregatech.com/v1"})
    return s
