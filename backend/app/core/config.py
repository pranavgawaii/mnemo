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

    # Logging
    log_json: bool = True
    log_level: str = "info"

    # Hardening
    # CORS allowlist as a JSON array, e.g. CORS_ALLOW_ORIGINS='["https://mnemo.dev"]'.
    cors_allow_origins: list[str] = []
    # Reject request bodies larger than this (413). Streaming bodies without a
    # Content-Length are not inspected.
    max_body_bytes: int = 1_048_576


@lru_cache
def get_settings() -> Settings:
    """Return a cached ``Settings`` instance."""
    return Settings()


settings = get_settings()
