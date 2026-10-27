"""FastAPI application entrypoint."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.logging_setup import configure_logging
from app.core.metrics import registry
from app.db.session import get_db
from app.services import job_worker

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Start/stop the background job worker with the process."""
    worker = job_worker.start_worker(
        enabled=settings.job_worker_enabled,
        interval_seconds=settings.job_worker_interval_seconds,
    )
    try:
        yield
    finally:
        if worker is not None:
            worker.stop()
            worker.join(timeout=5)


app = FastAPI(
    title="Mnemo",
    version="1.0.0",
    description="Semantic memory API for AI agents: pgvector search, decay "
    "scoring, and contradiction detection.",
    lifespan=lifespan,
)

def _install_cors(application: FastAPI, origins: list[str]) -> None:
    """Add CORS only when an allowlist is configured.

    With no origins the API is same-origin only, which is the safe default.
    Split out so tests can exercise the middleware on a fresh app instance.
    """
    if origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_methods=["*"],
            allow_headers=["*"],
        )


_install_cors(app, settings.cors_allow_origins)
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.include_router(api_router)


@app.middleware("http")
async def harden_and_observe(request: Request, call_next) -> Response:
    """Request-id + metrics + logging + body cap + security headers.

    One middleware keeps ordering explicit: reject oversized bodies before the
    route runs, decorate every response with the hardening headers, then
    observe and log the outcome.
    """
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > settings.max_body_bytes:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Request body too large."},
        )

    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    request.state.request_id = request_id
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        _observe_metrics(request, 500, duration_ms / 1000)
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
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    state = getattr(request.state, "rate_limit", None)
    if state is not None:
        response.headers.setdefault("X-RateLimit-Limit", str(state.limit))
        response.headers.setdefault("X-RateLimit-Remaining", str(state.remaining))
        response.headers.setdefault("X-RateLimit-Reset", str(state.reset_epoch))
    duration_ms = (time.perf_counter() - start) * 1000
    _observe_metrics(request, response.status_code, duration_ms / 1000)
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


def _route_path(request: Request) -> str:
    """Route template when the request matched a route, else the raw path."""
    route = request.scope.get("route")
    return getattr(route, "path", None) or request.url.path


def _observe_metrics(request: Request, status_code: int, duration_s: float) -> None:
    registry.counter("http_requests_total", "Total HTTP requests.").inc(
        {
            "method": request.method,
            "path": _route_path(request),
            "status": str(status_code),
        }
    )
    registry.histogram(
        "http_request_duration_seconds", "HTTP request latency in seconds."
    ).observe({"method": request.method}, duration_s)


def _request_logger() -> logging.Logger:
    return logging.getLogger("mnemo.request")


@app.get("/metrics", tags=["meta"])
def metrics() -> Response:
    """Prometheus text-format metrics. Unauthenticated, like /health."""
    return Response(content=registry.render(), media_type="text/plain; version=0.0.4")


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
