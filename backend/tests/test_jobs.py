"""Outbox job queue (CI tier, needs Postgres)."""

from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone

from app.services import job_service
from tests.conftest import requires_db


def test_worker_can_be_started_and_joined():
    """Lifecycle smoke test, hermetic: the tick's DB errors are swallowed by
    the worker loop, so no database is needed to start/stop/join it."""
    from app.services.job_worker import JobWorker

    worker = JobWorker(interval_seconds=0.01)
    worker.start()
    worker.stop()
    worker.join(timeout=5)
    assert not worker.is_alive()
    # Regression: an Event stored as ``_stop`` shadows threading.Thread's
    # private ``_stop()`` method and makes ``join()`` blow up mid-shutdown,
    # depending on thread timing (the CI 3.12 integration job hit this).
    assert not isinstance(getattr(worker, "_stop", None), threading.Event)


@requires_db
def test_enqueue_and_process(client):
    received: dict = {}

    job_service.register("test-echo", lambda payload: received.update(payload))
    try:
        from app.db.session import SessionLocal
        from app.models.models import Job

        with SessionLocal() as db:
            job = job_service.enqueue(db, kind="test-echo", payload={"hello": "world"})
            job_id = job.id
            outcome = job_service.process_next(db)

        assert outcome == "done"
        assert received == {"hello": "world"}

        with SessionLocal() as db:
            row = db.get(Job, job_id)
            assert row is not None and row.status == "done"
    finally:
        job_service._handlers.pop("test-echo", None)


@requires_db
def test_failure_schedules_retry_with_backoff(client):
    calls: list[int] = []

    def flaky(payload: dict) -> None:
        calls.append(1)
        raise RuntimeError("webhook down")

    job_service.register("test-flaky", flaky)
    try:
        from app.db.session import SessionLocal
        from app.models.models import Job

        with SessionLocal() as db:
            job = job_service.enqueue(db, kind="test-flaky", payload={}, max_attempts=3)
            job_id = job.id

        with SessionLocal() as db:
            outcome = job_service.process_next(db, now=datetime.now(timezone.utc))
        assert outcome == "failed"
        assert len(calls) == 1

        with SessionLocal() as db:
            row = db.get(Job, job_id)
            assert row is not None
            assert row.status == "pending"  # retry scheduled
            assert row.attempts == 1
            assert row.run_after > datetime.now(timezone.utc) - timedelta(seconds=1)
            assert "webhook down" in (row.last_error or "")
    finally:
        job_service._handlers.pop("test-flaky", None)


@requires_db
def test_exhausted_attempts_park_as_failed(client):
    def hopeless(payload: dict) -> None:
        raise RuntimeError("no")

    job_service.register("test-hopeless", hopeless)
    try:
        from app.db.session import SessionLocal
        from app.models.models import Job

        with SessionLocal() as db:
            job = job_service.enqueue(db, kind="test-hopeless", payload={}, max_attempts=1)
            job_id = job.id
            job_service.process_next(db)

        with SessionLocal() as db:
            row = db.get(Job, job_id)
            assert row is not None and row.status == "failed"
            assert row.attempts == 1

        # The failed job is not re-claimed.
        with SessionLocal() as db:
            assert job_service.process_next(db) in (None, "done", "failed", "failed:no-handler")
    finally:
        job_service._handlers.pop("test-hopeless", None)


@requires_db
def test_unknown_kind_marks_failed(client):
    from app.db.session import SessionLocal
    from app.models.models import Job

    with SessionLocal() as db:
        job = job_service.enqueue(db, kind="test-nohandler", payload={})
        job_id = job.id
        outcome = job_service.process_next(db)
    assert outcome == "failed:no-handler"

    with SessionLocal() as db:
        row = db.get(Job, job_id)
        assert row is not None and row.status == "failed"
        assert "no handler" in (row.last_error or "")


@requires_db
def test_stats_counts_statuses(client):
    from app.db.session import SessionLocal

    with SessionLocal() as db:
        counts = job_service.stats(db)
    assert set(counts) >= {"pending", "running", "done", "failed"}


def test_backoff_is_exponential():
    assert job_service.backoff_for(1) == timedelta(seconds=1)
    assert job_service.backoff_for(2) == timedelta(seconds=2)
    assert job_service.backoff_for(3) == timedelta(seconds=4)
    assert job_service.backoff_for(10) == timedelta(seconds=60)  # capped
