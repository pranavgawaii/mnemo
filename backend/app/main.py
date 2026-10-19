"""FastAPI application entrypoint."""

from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.routes import router as api_router
from app.db.session import get_db

app = FastAPI(
    title="Mnemo",
    version="0.1.0",
    description="Semantic memory API for AI agents: pgvector search, decay "
    "scoring, and contradiction detection.",
)

app.include_router(api_router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    """Liveness probe: the process is serving. Does not touch the database."""
    return {"status": "ok"}


@app.get("/ready", tags=["meta"])
def ready(db: Session = Depends(get_db)) -> dict[str, str]:
    """Readiness probe: the service can reach its database.

    Unlike ``/health`` this actually queries Postgres, so an orchestrator can
    refuse to route traffic to a process that is up but cannot serve.
    """
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - depends on infrastructure
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not reachable.",
        ) from exc
    return {"status": "ready"}
