"""Real pgvector regressions for candidate completeness and racing writes."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Barrier
from uuid import UUID

from sqlalchemy import func, select, text

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.models import AuditLog, Contradiction, Memory
from app.services import memory_service
from tests.conftest import requires_db


def vector(position=0):
    result = [0.0] * settings.embedding_dim
    result[position] = 1.0
    return result


@requires_db
def test_recognized_fact_finds_conflict_beyond_five_semantic_neighbours(
    client, namespace, monkeypatch
):
    monkeypatch.setattr(
        memory_service,
        "embed",
        lambda content: vector(1 if content == "Nora lives in Lisbon" else 0),
    )
    original = client.post(
        "/v1/memories", json={"content": "Nora lives in Lisbon", "namespace": namespace}
    ).json()["memory"]
    for i in range(9):
        assert (
            client.post(
                "/v1/memories", json={"content": f"Unrelated note {i}", "namespace": namespace}
            ).status_code
            == 201
        )
    result = client.post(
        "/v1/memories", json={"content": "Nora lives in Porto now", "namespace": namespace}
    )
    assert result.status_code == 201
    flags = result.json()["contradictions"]
    assert len(flags) == 1 and flags[0]["existing_memory"]["id"] == original["id"]
    assert flags[0]["similarity"] == 0
    with SessionLocal() as db:
        db.execute(text("ANALYZE memories"))
        db.execute(text("SET LOCAL enable_seqscan = off"))
        plan = db.scalars(
            text(
                "EXPLAIN SELECT id FROM memories WHERE namespace=:namespace "
                "AND is_active IS TRUE AND fact_subject='nora' AND fact_attribute='residence'"
            ),
            {"namespace": namespace},
        ).all()
        assert "ix_memories_fact_lookup" in " ".join(plan)


@requires_db
def test_concurrent_first_writes_cannot_both_miss_the_other(client, namespace, monkeypatch):
    monkeypatch.setattr(memory_service, "embed", lambda content: vector())
    barrier = Barrier(8)

    def write(i):
        barrier.wait(timeout=10)
        with SessionLocal() as db:
            memory, flags, _ = memory_service.add_memory(
                db, content=f"Nora lives in City{i}", namespace=namespace, importance=3
            )
            return memory.id, len(flags)

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(write, range(8)))
    assert sum(count for _, count in results) == 28  # all unordered pairs
    with SessionLocal() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(Contradiction)
                .where(Contradiction.namespace == namespace)
            )
            == 28
        )
        assert (
            db.scalar(select(func.count()).select_from(Memory).where(Memory.namespace == namespace))
            == 8
        )


@requires_db
def test_archiving_disputed_fact_unblocks_context_but_preserves_history(client, namespace):
    old = client.post(
        "/v1/memories", json={"content": "Nora lives in Lisbon", "namespace": namespace}
    ).json()["memory"]
    new = client.post(
        "/v1/memories", json={"content": "Nora lives in Porto now", "namespace": namespace}
    ).json()["memory"]
    assert client.delete(f"/v1/memories/{old['id']}").status_code == 200
    context = client.post(
        "/v1/context",
        json={"query": "Where does Nora live?", "namespace": namespace, "min_similarity": -1},
    ).json()
    assert context["status"] == "ready" and not context["has_pending_review"]
    assert [citation["memory_id"] for citation in context["citations"]] == [new["id"]]
    listed = client.get("/v1/contradictions", params={"namespace": namespace}).json()
    assert listed["total"] == 0 and listed["items"] == []
    assert client.get(f"/v1/namespaces/{namespace}/stats").json()["open_contradictions"] == 0
    with SessionLocal() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(Contradiction)
                .where(Contradiction.namespace == namespace)
            )
            == 1
        )


@requires_db
def test_overlapping_reviews_do_not_leave_winner_blocked_by_obsolete_pair(client, namespace):
    memories = []
    flags = []
    for city in ["Lisbon", "Porto", "Braga"]:
        result = client.post(
            "/v1/memories", json={"content": f"Nora lives in {city}", "namespace": namespace}
        ).json()
        memories.append(result["memory"])
        flags.extend(result["contradictions"])
    winner = memories[-1]
    for conflict in flags:
        if winner["id"] in {conflict["new_memory"]["id"], conflict["existing_memory"]["id"]}:
            response = client.post(
                "/v1/contradictions/resolve",
                json={"contradiction_id": conflict["id"], "winner_memory_id": winner["id"]},
            )
            assert response.status_code == 200
    result = client.post(
        "/v1/context",
        json={"query": "Where does Nora live?", "namespace": namespace, "min_similarity": -1},
    ).json()
    assert result["status"] == "ready" and not result["has_pending_review"]
    assert [citation["memory_id"] for citation in result["citations"]] == [winner["id"]]


@requires_db
def test_expired_opponent_is_not_an_actionable_conflict(client, namespace):
    old = client.post(
        "/v1/memories", json={"content": "Nora lives in Lisbon", "namespace": namespace}
    ).json()["memory"]
    new = client.post(
        "/v1/memories", json={"content": "Nora lives in Porto", "namespace": namespace}
    ).json()["memory"]
    assert (
        client.patch(
            f"/v1/memories/{old['id']}",
            json={"expires_at": (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()},
        ).status_code
        == 200
    )
    context = client.post(
        "/v1/context", json={"query": "Nora", "namespace": namespace, "min_similarity": -1}
    ).json()
    assert not context["has_pending_review"] and context["citations"][0]["memory_id"] == new["id"]


@requires_db
def test_capacity_failure_rolls_back_the_memory_and_audit(client, namespace, monkeypatch):
    monkeypatch.setattr(memory_service, "_FACT_CANDIDATE_LIMIT", 1)
    for city in ["Lisbon", "Porto"]:
        assert (
            client.post(
                "/v1/memories", json={"content": f"Nora lives in {city}", "namespace": namespace}
            ).status_code
            == 201
        )
    result = client.post(
        "/v1/memories", json={"content": "Nora lives in Braga", "namespace": namespace}
    )
    assert result.status_code == 409
    with SessionLocal() as db:
        assert (
            db.scalar(select(func.count()).select_from(Memory).where(Memory.namespace == namespace))
            == 2
        )
        assert (
            db.scalar(
                select(func.count())
                .select_from(AuditLog)
                .where(AuditLog.namespace == namespace, AuditLog.action == "memory.created")
            )
            == 2
        )


@requires_db
def test_namespace_queue_is_bounded_and_other_namespaces_are_independent(
    client, namespace, monkeypatch
):
    monkeypatch.setattr(memory_service, "embed", lambda content: vector())
    monkeypatch.setattr(memory_service, "_NAMESPACE_LOCK_TIMEOUT_MS", 50)
    with SessionLocal() as holder:
        holder.execute(text("SET LOCAL lock_timeout = '543ms'"))
        memory_service._lock_namespace(holder, namespace)
        assert holder.scalar(text("SELECT current_setting('lock_timeout')")) == "543ms"
        unrelated = client.post(
            "/v1/memories", json={"content": "Independent note", "namespace": namespace + "-other"}
        )
        assert unrelated.status_code == 201
        blocked = client.post(
            "/v1/memories", json={"content": "Queued note", "namespace": namespace}
        )
        assert blocked.status_code == 503 and blocked.headers["Retry-After"] == "1"
        holder.rollback()
    retry = client.post("/v1/memories", json={"content": "Queued note", "namespace": namespace})
    assert retry.status_code == 201
    with SessionLocal() as db:
        assert (
            db.scalar(select(func.count()).select_from(Memory).where(Memory.namespace == namespace))
            == 1
        )


@requires_db
def test_edit_reindexes_fact_and_unknown_content_clears_derived_keys(client, namespace):
    original = client.post(
        "/v1/memories", json={"content": "Nora lives in Lisbon", "namespace": namespace}
    ).json()["memory"]
    assert (
        client.patch(
            f"/v1/memories/{original['id']}", json={"content": "Nora's employer is Atlas"}
        ).status_code
        == 200
    )
    with SessionLocal() as db:
        row = db.get(Memory, UUID(original["id"]))
        assert (row.fact_subject, row.fact_attribute, row.fact_value) == (
            "nora",
            "employer",
            "atlas",
        )
    assert (
        client.patch(
            f"/v1/memories/{original['id']}", json={"content": "A free-form note"}
        ).status_code
        == 200
    )
    with SessionLocal() as db:
        row = db.get(Memory, UUID(original["id"]))
        assert row.fact_subject is row.fact_attribute is row.fact_value is None


@requires_db
def test_context_readers_share_locks_without_blocking_each_other(client, namespace, monkeypatch):
    monkeypatch.setattr(memory_service, "_NAMESPACE_LOCK_TIMEOUT_MS", 50)
    with SessionLocal() as first, SessionLocal() as second:
        memory_service._lock_namespace(first, namespace, shared=True)
        memory_service._lock_namespace(second, namespace, shared=True)
        blocked = client.post(
            "/v1/memories", json={"content": "A queued fact", "namespace": namespace}
        )
        assert blocked.status_code == 503
        read = client.post("/v1/context", json={"query": "Unknown fact", "namespace": namespace})
        assert read.status_code == 200 and read.json()["status"] == "empty"


@requires_db
def test_past_expiry_writes_do_not_create_new_actionable_flags(client, namespace):
    client.post("/v1/memories", json={"content": "Nora lives in Lisbon", "namespace": namespace})
    result = client.post(
        "/v1/memories",
        json={
            "content": "Nora lives in Porto",
            "namespace": namespace,
            "expires_at": (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat(),
        },
    )
    assert result.status_code == 201 and result.json()["contradictions"] == []


@requires_db
def test_fact_lookup_never_crosses_namespace_boundary(client, namespace):
    client.post("/v1/memories", json={"content": "Nora lives in Lisbon", "namespace": namespace})
    response = client.post(
        "/v1/memories", json={"content": "Nora lives in Porto", "namespace": namespace + "-other"}
    )
    assert response.status_code == 201 and response.json()["contradictions"] == []


@requires_db
def test_equivalent_assertions_do_not_exhaust_the_conflict_candidate_budget(
    client, namespace, monkeypatch
):
    monkeypatch.setattr(memory_service, "_FACT_CANDIDATE_LIMIT", 1)
    for statement in [
        "Nora starts work at 9 AM",
        "Nora starts work at 09:00",
        "Nora starts work at 9:00 AM",
    ]:
        response = client.post("/v1/memories", json={"content": statement, "namespace": namespace})
        assert response.status_code == 201 and response.json()["contradictions"] == []
