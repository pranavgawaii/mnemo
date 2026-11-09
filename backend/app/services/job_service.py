"""Outbox job queue: enqueue, claim, run.

The outbox pattern keeps background work consistent with the change that
triggered it: the caller writes the ``jobs`` row inside the same transaction as
the domain change, and the worker delivers it later. A job abandoned mid-delivery
is reclaimed after its lease expires. Delivery is at least once, so webhook
consumers deduplicate stable event IDs.

Handlers are registered per ``kind`` with :func:`register`; they receive the
payload dict and may raise, which schedules an exponential backoff retry
(1s, 2s, 4s, ... capped at 60s) until ``max_attempts`` is exhausted.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
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
    """Queue inside the caller's transaction; the caller owns the commit."""
    job = Job(
        kind=kind,
        payload=payload,
        run_after=run_after or datetime.now(timezone.utc),
        max_attempts=max_attempts,
    )
    db.add(job)
    db.flush()
    return job


def claim_next(db: Session, *, now: datetime | None = None) -> Job | None:
    """Claim pending work or recover an expired lease, using SKIP LOCKED.

    Delivery is at least once. A fresh token fences completion by a worker
    whose lease was reclaimed; receivers must deduplicate stable event IDs.
    """
    moment = now or datetime.now(timezone.utc)
    expired = and_(
        Job.status == "running",
        or_(Job.lease_expires_at.is_(None), Job.lease_expires_at <= moment),
    )
    db.execute(
        update(Job).where(expired, Job.attempts >= Job.max_attempts).values(
            status="failed", lease_token=None, lease_expires_at=None,
            last_error="Worker lease expired after the final attempt.",
        )
    )
    claimed = db.execute(
        select(Job)
        .where(
            or_(and_(Job.status == "pending", Job.run_after <= moment), expired),
            Job.attempts < Job.max_attempts,
        )
        .order_by(Job.run_after, Job.id)
        .limit(1)
        .with_for_update(skip_locked=True)
        .execution_options(populate_existing=True)
    ).scalar_one_or_none()
    if claimed is None:
        db.commit()
        return None
    claimed.status = "running"
    claimed.attempts += 1
    claimed.lease_token = uuid.uuid4()
    claimed.lease_expires_at = moment + timedelta(seconds=settings.job_lease_seconds)
    db.commit()
    db.refresh(claimed)
    return claimed


def _finish(db: Session, job: Job, values: dict[str, Any]) -> bool:
    result = db.execute(
        update(Job).where(
            Job.id == job.id, Job.status == "running", Job.lease_token == job.lease_token,
        ).values(**values, lease_token=None, lease_expires_at=None)
        .execution_options(synchronize_session=False)
    )
    db.commit()
    return bool(result.rowcount)  # type: ignore[attr-defined]


def complete(db: Session, *, job: Job) -> bool:
    return _finish(db, job, {"status": "done", "last_error": None})


def fail(db: Session, *, job: Job, error: str, now: datetime | None = None) -> bool:
    """Record a failure: retry with backoff, or park as ``failed`` when exhausted."""
    values: dict[str, Any] = {"last_error": error[:2000]}
    if job.attempts >= job.max_attempts:
        values["status"] = "failed"
    else:
        moment = now or datetime.now(timezone.utc)
        values.update(status="pending", run_after=moment + backoff_for(job.attempts))
    return _finish(db, job, values)


def process_next(db: Session, *, now: datetime | None = None) -> str | None:
    """Claim and run one job. Returns the job status after the attempt, or None
    when nothing was runnable. Used by the worker loop and the CLI."""
    job = claim_next(db, now=now)
    if job is None:
        return None
    handler = handler_for(job.kind)
    if handler is None:
        # No handler can ever run this kind within this build; retrying would
        # just churn, so park it terminally instead of backing off.
        _finish(db, job, {
            "status": "failed", "last_error": f"no handler registered for kind '{job.kind}'",
        })
        return "failed:no-handler"
    try:
        handler(job.payload)
    except Exception as exc:  # noqa: BLE001 - job handlers may fail in any way
        logger.info("job %s (%s) attempt %s failed: %s", job.id, job.kind, job.attempts, exc)
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
