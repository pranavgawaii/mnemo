"""Concurrency stress test for contradiction flagging (CI tier, needs Postgres).

The race: two API workers PATCH the same memory at the same moment; both run
the contradiction re-check and both try to insert the identical pair. The
``uq_contradictions_pair`` unique index plus ``ON CONFLICT DO NOTHING`` makes
the loser a silent no-op instead of a 500 or a duplicate row.
"""

from __future__ import annotations

import threading
import uuid

from app.db.session import SessionLocal
from app.models.models import Contradiction, Memory
from app.services import memory_service
from tests.conftest import requires_db

WORKERS = 8


@requires_db
def test_racing_pair_inserts_land_once(client, namespace):
    from sqlalchemy import select

    first = client.post(
        "/v1/memories", json={"content": "Riya lives in Pune", "namespace": namespace}
    ).json()["memory"]
    second = client.post(
        "/v1/memories",
        json={"content": "Riya no longer lives in Pune", "namespace": namespace},
    ).json()["memory"]
    new_id, existing_id = uuid.UUID(second["id"]), uuid.UUID(first["id"])

    # Sanity: the normal write path already flagged this pair once.
    with SessionLocal() as db:
        initial = len(
            db.execute(
                select(Contradiction).where(
                    Contradiction.new_memory_id == new_id,
                    Contradiction.existing_memory_id == existing_id,
                )
            ).all()
        )
    assert initial == 1

    # Now hammer the same pair from WORKERS threads concurrently. First one
    # inserts; the rest must come back as None (no-op), never raise.
    barrier = threading.Barrier(WORKERS)
    outcomes: list[str] = []
    lock = threading.Lock()

    def worker() -> None:
        barrier.wait()
        try:
            with SessionLocal() as db:
                inserted = memory_service._insert_contradiction(
                    db,
                    namespace=namespace,
                    new_memory_id=new_id,
                    existing_memory_id=existing_id,
                    similarity=0.99,
                    reason="race probe",
                )
                db.commit()
            with lock:
                outcomes.append("noop" if inserted is None else "inserted")
        except Exception as exc:  # pragma: no cover - the assertion catches this
            with lock:
                outcomes.append(f"raised {exc!r}")

    threads = [threading.Thread(target=worker) for _ in range(WORKERS)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert outcomes.count("noop") == WORKERS - 1, outcomes
    assert outcomes.count("inserted") in (0, 1), outcomes  # the seeded row exists

    with SessionLocal() as db:
        rows = db.execute(
            select(Contradiction).where(
                Contradiction.new_memory_id == new_id,
                Contradiction.existing_memory_id == existing_id,
            )
        ).all()
        assert len(rows) == 1, "the unique index must keep exactly one pair row"


@requires_db
def test_stale_recheck_never_duplicates(client, namespace):
    """_flag_contradictions re-runs (e.g. on update) must stay idempotent."""
    client.post(
        "/v1/memories", json={"content": "Omar lives in Kyoto", "namespace": namespace}
    ).json()["memory"]
    second = client.post(
        "/v1/memories",
        json={"content": "Omar no longer lives in Kyoto", "namespace": namespace},
    )
    assert second.status_code == 201

    memory_id = uuid.UUID(second.json()["memory"]["id"])
    for _ in range(3):
        with SessionLocal() as db:
            memory = db.get(Memory, memory_id)
            memory_service._flag_contradictions(
                db,
                memory=memory,
                vector=list(memory.embedding),
                namespace=namespace,
                llm_check=None,
            )
            db.commit()

    from sqlalchemy import func, select

    with SessionLocal() as db:
        count = db.execute(
            select(func.count())
            .select_from(Contradiction)
            .where(Contradiction.namespace == namespace)
        ).scalar_one()
    assert count == 1
