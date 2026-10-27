"""FastAPI application entrypoint."""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.routes import router as api_router
from app.core.logging_setup import configure_logging
from app.db.session import get_db

configure_logging()

app = FastAPI(
    title="Mnemo",
    version="0.1.0",
    description="Semantic memory API for AI agents: pgvector search, decay "
    "scoring, and contradiction detection.",
)

app.include_router(api_router)


@app.middleware("http")
async def attach_request_id_and_log(
    request: Request, call_next
) -> Response:
    """Give every request an id and log the outcome as one structured line.

    Honours an incoming ``X-Request-ID`` (correlates across service hops) and
    always echoes the id back in the response header.
    """
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        _request_logger().error(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": 500,
                "duration_ms": round(duration_ms, 2),
            },
        )
        raise
    response.headers["X-Request-ID"] = request_id
    duration_ms = (time.perf_counter() - start) * 1000
    _request_logger().info(
        "request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 2),
        },
    )
    return response


def _request_logger() -> logging.Logger:
    return logging.getLogger("mnemo.request")


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
