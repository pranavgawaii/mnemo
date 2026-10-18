"""FastAPI application entrypoint."""

from __future__ import annotations

from fastapi import FastAPI

from app.api.routes import router as api_router

app = FastAPI(
    title="Mnemo",
    version="0.1.0",
    description="Semantic memory API for AI agents: pgvector search, decay "
    "scoring, and contradiction detection.",
)

app.include_router(api_router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
