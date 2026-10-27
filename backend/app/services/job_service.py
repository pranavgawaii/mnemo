"""Outbox job queue: enqueue, claim, run.

The outbox pattern keeps background work consistent with the change that
triggered it: the caller writes the ``jobs`` row inside the same transaction as
the domain change, and the worker delivers it later. Nothing is lost if the
process dies mid-delivery — the job simply stays ``pending``.

Handlers are registered per ``kind`` with :func:`register`; they receive the
payload dict and may raise, which schedules an exponential backoff retry
(1s, 2s, 4s, ... capped at 60s) until ``max_attempts`` is exhausted.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.models import Job

logger = logging.getLogger("mnemo.jobs")

Handler = Callable[[dict[str, Any]], None]

_handlers: dict[str, Handler] = {}

# Exponential backoff for retries, capped.
_BACKOFF_BASE_SECONDS = 1.0
_BACKOFF_CAP_SECONDS = 60.0


def register(kind: str, handler: Handler) -> None:
    """Register the handler for a job kind (idempotent)."""
    _handlers[kind] = handler


def handler_for(kind: str) -> Handler | None:
    return _handlers.get(kind)


def backoff_for(attempts: int) -> timedelta:
    """Backoff after ``attempts`` failed attempts (1s, 2s, 4s, ... capped)."""
    delay = min(_BACKOFF_CAP_SECONDS, _BACKOFF_BASE_SECONDS * (2 ** max(0, attempts - 1)))
    return timedelta(seconds=delay)


def enqueue(
    db: Session,
    *,
    kind: str,
    payload: dict[str, Any],
    run_after: datetime | None = None,
    max_attempts: int = 5,
) -> Job:
    """Queue one job. Commits — the caller's transaction stays intact."""
    job = Job(
        kind=kind,
        payload=payload,
        run_after=run_after or datetime.now(timezone.utc),
        max_attempts=max_attempts,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def claim_next(db: Session, *, now: datetime | None = None) -> Job | None:
    """Atomically claim the next runnable job (FOR UPDATE SKIP LOCKED)."""
    moment = now or datetime.now(timezone.utc)
    claimed = db.execute(
        select(Job)
        .where(Job.status == "pending", Job.run_after <= moment)
        .order_by(Job.run_after)
        .limit(1)
        .with_for_update(skip_locked=True)
    ).scalar_one_or_none()
    if claimed is None:
        return None
    claimed.status = "running"
    db.commit()
    db.refresh(claimed)
    return claimed


def complete(db: Session, *, job: Job) -> None:
    job.status = "done"
    job.last_error = None
    db.commit()


def fail(db: Session, *, job: Job, error: str, now: datetime | None = None) -> None:
    """Record a failure: retry with backoff, or park as ``failed`` when exhausted."""
    job.attempts += 1
    job.last_error = error[:2000]
    if job.attempts >= job.max_attempts:
        job.status = "failed"
    else:
        moment = now or datetime.now(timezone.utc)
        job.status = "pending"
        job.run_after = moment + backoff_for(job.attempts)
    db.commit()


def process_next(db: Session, *, now: datetime | None = None) -> str | None:
    """Claim and run one job. Returns the job status after the attempt, or None
    when nothing was runnable. Used by the worker loop and the CLI."""
    job = claim_next(db, now=now)
    if job is None:
        return None
    handler = handler_for(job.kind)
    if handler is None:
        fail(db, job=job, error=f"no handler registered for kind '{job.kind}'", now=now)
        return "failed:no-handler"
    try:
        handler(job.payload)
    except Exception as exc:  # noqa: BLE001 - job handlers may fail in any way
        logger.info("job %s (%s) attempt %s failed: %s", job.id, job.kind, job.attempts + 1, exc)
        fail(db, job=job, error=str(exc), now=now)
        return "failed"
    complete(db, job=job)
    return "done"


def stats(db: Session) -> dict[str, int]:
    """Job counts grouped by status."""
    counts = db.execute(select(Job.status, func.count()).group_by(Job.status)).all()
    result = {status: int(count) for status, count in counts}
    for known in ("pending", "running", "done", "failed"):
        result.setdefault(known, 0)
    return result


def enqueue_many(db: Session, jobs: list[dict[str, Any]]) -> list[Job]:
    """Queue several jobs in one commit (used by importers/tests)."""
    rows = [Job(kind=j["kind"], payload=j.get("payload", {})) for j in jobs]
    db.add_all(rows)
    db.commit()
    return rows
