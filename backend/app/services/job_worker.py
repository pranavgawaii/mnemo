"""Background job worker.

A daemon thread that polls the outbox every second and runs claimed jobs
through their registered handlers. Sync by design: the handlers (HTTP webhooks,
maintenance sweeps) and the DB session are all sync, and a thread avoids the
async/sync bridge entirely.

The FastAPI lifespan starts one worker; ``MNEMO_JOB_WORKER_ENABLED=false``
turns it off for CLI-only or externally-supervised deployments (run the same
loop from cron via ``mnemo jobs run --once``).
"""

from __future__ import annotations

import threading

from app.db.session import SessionLocal
from app.services import job_service


class JobWorker(threading.Thread):
    """Poll-and-run loop. One job per tick keeps claims short and restarts safe."""

    def __init__(self, interval_seconds: float = 1.0) -> None:
        super().__init__(name="mnemo-job-worker", daemon=True)
        self.interval_seconds = interval_seconds
        # Deliberately NOT named ``_stop``: that name shadows threading.Thread's
        # private ``_stop()`` method, which ``join()`` calls during shutdown —
        # an Event there makes every join explode with "'Event' object is not
        # callable" (observed intermittently, whenever the thread had not yet
        # fully exited when join polled it).
        self._stop_requested = threading.Event()

    def stop(self) -> None:
        self._stop_requested.set()

    def run(self) -> None:
        while not self._stop_requested.is_set():
            try:
                processed = self._tick()
            except Exception:  # noqa: BLE001 - the loop must survive anything
                processed = False
            if not processed:
                self._stop_requested.wait(self.interval_seconds)

    def _tick(self) -> bool:
        with SessionLocal() as db:
            outcome = job_service.process_next(db)
        return outcome is not None


def start_worker(enabled: bool, interval_seconds: float = 1.0) -> JobWorker | None:
    """Start the worker thread when enabled; returns it (or None)."""
    if not enabled:
        return None
    worker = JobWorker(interval_seconds=interval_seconds)
    worker.start()
    return worker
