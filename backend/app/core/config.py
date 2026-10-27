"""Application configuration, loaded from the environment / .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings.

    Values come from environment variables (see ``.env.example``). Field names
    are case-insensitive; ``MNEMO_API_KEY`` maps to ``mnemo_api_key`` etc.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+psycopg://mnemo:mnemo@localhost:5432/mnemo"

    # API
    mnemo_api_key: str = "dev-local-key-change-me"

    # Embeddings — model name and vector dimension MUST stay in sync with the
    # Vector(...) size in the Alembic migration.
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384

    # Decay scoring
    decay_half_life_days: float = 180.0
    decay_floor: float = 0.7

    # Contradiction detection
    contradiction_sim_threshold: float = 0.82

    # Hybrid search: keyword evidence boosts relevance modestly; the vector
    # path stays the source of truth (see app/core/hybrid.py).
    keyword_weight: float = 0.25

    # ANN (HNSW) query-time recall knob. The index itself is created by
    # migration 0009 with m=16, ef_construction=64. Higher ef_search = better
    # recall, slower scan. Guarded: only sent to Postgres when it accepts it.
    ann_ef_search: int = 100

    # Near-duplicate detection on write. "flag" reports deduplicated_of in the
    # response; "reject" answers 409; "off" skips the check.
    dedup_mode: str = "flag"
    dedup_threshold: float = 0.97

    # LLM verdict hook for contradiction confirmation. Empty = heuristic only.
    # "openai" uses any OpenAI-compatible chat-completions endpoint (self-hosted
    # vLLM/Ollama work: set CONTRADICTION_LLM_BASE_URL).
    contradiction_llm_provider: str = ""
    contradiction_llm_api_key: str = ""
    contradiction_llm_base_url: str = "https://api.openai.com/v1"
    contradiction_llm_model: str = "gpt-4o-mini"
    contradiction_llm_timeout_seconds: float = 10.0

    # Logging
    log_json: bool = True
    log_level: str = "info"

    # Hardening
    # CORS allowlist as a JSON array, e.g. CORS_ALLOW_ORIGINS='["https://mnemo.dev"]'.
    cors_allow_origins: list[str] = []
    # Reject request bodies larger than this (413). Streaming bodies without a
    # Content-Length are not inspected.
    max_body_bytes: int = 1_048_576

    # Rate limiting (per API key, fixed-minute window in Postgres). Off by
    # default so existing deployments and CI don't get throttled on upgrade.
    rate_limit_enabled: bool = False
    rate_limit_per_minute: int = 120


@lru_cache
def get_settings() -> Settings:
    """Return a cached ``Settings`` instance."""
    return Settings()


settings = get_settings()
