"""Cross-component and failure regressions using a disposable pgvector DB."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Barrier
from uuid import UUID

import httpx
import pytest
from mnemo import MnemoClient
from sqlalchemy import func, select, text

from app.core.config import settings
from app.core.contradiction import check_contradiction
from app.db.session import SessionLocal
from app.models.models import AuditLog, Contradiction, Job, Memory
from app.services import job_service, memory_service
from tests.conftest import requires_db


@pytest.mark.parametrize("left,right", [
    ("Riya never eats peanuts", "Riya does not eat peanuts"),
    ("Riya is notable for research", "Riya is known for research"),
])
def test_agreeing_negatives_and_word_fragments_are_not_conflicts(left, right):
    assert not check_contradiction(left, right, 0.95).is_contradiction


@requires_db
def test_sdk_consumes_real_conflict_responses(client, namespace):
    def forward(request: httpx.Request) -> httpx.Response:
        response = client.request(
            request.method, str(request.url), content=request.content,
            headers=dict(request.headers),
        )
        headers = dict(response.headers)
        headers.pop("content-encoding", None)  # TestClient already decompressed the body.
        return httpx.Response(response.status_code, content=response.content, headers=headers)

    with MnemoClient(base_url="http://testserver", api_key=settings.mnemo_api_key,
                     default_namespace=namespace, transport=httpx.MockTransport(forward)) as sdk:
        sdk.add_memory("Riya lives in Pune")
        memory, flags = sdk.add_memory("Riya no longer lives in Pune")
        assert flags and flags[0].new_memory_id == memory.id
        assert sdk.list_contradictions().total == 1
        resolved = sdk.resolve_contradiction(flags[0].id, winner_memory_id=memory.id)
        assert resolved.status == "resolved"


@requires_db
def test_route_scopes_cover_namespace_mutations_and_reads(client, namespace):
    reader = client.post("/v1/keys", json={"label": "reader", "scopes": ["read"]}).json()["key"]
    writer = client.post("/v1/keys", json={"label": "writer", "scopes": ["write"]}).json()["key"]
    assert client.post("/v1/namespaces", json={"name": namespace},
                       headers={"X-API-Key": reader}).status_code == 403
    assert client.get("/v1/memories", headers={"X-API-Key": writer}).status_code == 403
    assert client.post("/v1/memories/search", json={"query": "x"},
                       headers={"X-API-Key": writer}).status_code == 403


@requires_db
def test_bulk_preserves_expiry(client, namespace):
    expires = datetime.now(timezone.utc) + timedelta(days=1)
    response = client.post("/v1/memories/bulk", json={"items": [{
        "content": "A temporary fact", "namespace": namespace, "expires_at": expires.isoformat(),
    }]})
    actual = response.json()["results"][0]["memory"]["expires_at"]
    assert datetime.fromisoformat(actual) == expires


@requires_db
def test_bulk_recovers_session_after_database_failure(client, namespace, monkeypatch):
    add = memory_service.add_memory

    def sometimes_fails(db, **kwargs):
        if kwargs["content"] == "bad item":
            db.execute(text("SELECT 1 / 0"))
        return add(db, **kwargs)

    monkeypatch.setattr(memory_service, "add_memory", sometimes_fails)
    response = client.post("/v1/memories/bulk", json={"items": [
        {"content": content, "namespace": namespace}
        for content in ["first item", "bad item", "last item"]
    ]})
    assert response.status_code == 200
    assert response.json()["created"] == 2
    assert response.json()["errors"] == 1
    assert response.json()["results"][1]["error"] == "Database rejected this memory."


@requires_db
def test_expired_fact_does_not_block_replacement_or_create_conflict(client, namespace, monkeypatch):
    client.post("/v1/memories", json={
        "content": "Riya lives in Pune", "namespace": namespace,
        "expires_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
    })
    monkeypatch.setattr(settings, "dedup_mode", "reject")
    response = client.post("/v1/memories", json={
        "content": "Riya lives in Pune", "namespace": namespace,
    })
    assert response.status_code == 201
    # Remove the replacement so the only opposing fact left is expired.
    client.delete("/v1/memories/" + response.json()["memory"]["id"])
    response = client.post("/v1/memories", json={
        "content": "Riya no longer lives in Pune", "namespace": namespace,
    })
    assert response.json()["contradictions"] == []


@requires_db
def test_failed_webhook_enqueue_rolls_back_entire_write(client, namespace, monkeypatch):
    client.post("/v1/webhooks", json={"namespace": namespace, "url": "https://example.com/hook"})
    client.post("/v1/memories", json={"content": "Omar lives in Kyoto", "namespace": namespace})
    enqueue = job_service.enqueue

    def fail_after_enqueue(*args, **kwargs):
        enqueue(*args, **kwargs)
        raise RuntimeError("injected failure after enqueue")

    monkeypatch.setattr(job_service, "enqueue", fail_after_enqueue)
    with pytest.raises(RuntimeError, match="injected failure"):
        client.post("/v1/memories", json={
            "content": "Omar no longer lives in Kyoto", "namespace": namespace,
        })
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Memory).where(Memory.namespace == namespace)) == 1
        assert db.scalar(select(func.count()).select_from(Contradiction).where(
            Contradiction.namespace == namespace)) == 0
        assert db.scalar(select(func.count()).select_from(AuditLog).where(
            AuditLog.namespace == namespace, AuditLog.action == "memory.created")) == 1
        assert db.scalar(select(func.count()).select_from(Job).where(
            Job.payload["body"]["namespace"].as_string() == namespace)) == 0


@requires_db
def test_expired_job_lease_recovers_and_fences_old_worker(client):
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        job = job_service.enqueue(db, kind="lease-regression", payload={})
        # Keep unrelated jobs outside this test's claim window.
        job.run_after = now - timedelta(days=1)
        db.commit()
        job_id = job.id
    with SessionLocal() as first, SessionLocal() as second:
        original = job_service.claim_next(first, now=now)
        assert original is not None and original.id == job_id
        recovered = job_service.claim_next(second, now=now + timedelta(seconds=settings.job_lease_seconds + 1))
        assert recovered is not None and recovered.id == job_id
        assert recovered.attempts == 2 and recovered.lease_token != original.lease_token
        assert not job_service.complete(first, job=original)
        assert job_service.complete(second, job=recovered)


@requires_db
def test_opposite_concurrent_resolutions_keep_one_memory_active(client, namespace):
    first = client.post("/v1/memories", json={
        "content": "Anya lives in Seoul", "namespace": namespace,
    }).json()["memory"]
    second = client.post("/v1/memories", json={
        "content": "Anya no longer lives in Seoul", "namespace": namespace,
    }).json()
    contradiction_id = UUID(second["contradictions"][0]["id"])
    start = Barrier(2)
    stale_read = Barrier(2)

    def resolve(winner):
        with SessionLocal() as db:
            original_get = db.get

            def synchronized_get(model, identity, **kwargs):
                row = original_get(model, identity, **kwargs)
                if model is Contradiction:
                    stale_read.wait(timeout=5)
                return row

            db.get = synchronized_get
            start.wait(timeout=5)
            _, error = memory_service.resolve_contradiction(
                db, contradiction_id=contradiction_id, winner_memory_id=UUID(winner),
            )
            return error

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(resolve, [first["id"], second["memory"]["id"]]))
    assert outcomes.count(None) == 1
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Memory).where(
            Memory.namespace == namespace, Memory.is_active.is_(True))) == 1


@requires_db
def test_ann_setting_is_applied_without_rolling_back(client):
    with SessionLocal() as db:
        memory_service._tune_ann(db)
        assert int(db.scalar(text("SHOW hnsw.ef_search"))) == settings.ann_ef_search


@requires_db
def test_explicit_city_move_is_reviewed_and_recalled_with_real_embeddings(client, namespace):
    initial = client.post("/v1/memories", json={
        "namespace": namespace, "content": "Demo user lives in Bengaluru", "importance": 3,
    })
    assert initial.status_code == 201
    previous = initial.json()["memory"]
    changed = client.post("/v1/memories", json={
        "namespace": namespace, "content": "Demo user moved from Bengaluru to Pune", "importance": 3,
    })
    assert changed.status_code == 201
    data = changed.json()
    conflict = next(c for c in data["contradictions"] if c["existing_memory"]["id"] == previous["id"])
    assert "Explicit relocation" in conflict["reason"]
    assert client.get(f"/v1/memories/{previous['id']}").json()["is_active"]
    resolved = client.post("/v1/contradictions/resolve", json={
        "contradiction_id": conflict["id"], "winner_memory_id": data["memory"]["id"],
    })
    assert resolved.status_code == 200
    hits = client.post("/v1/memories/search", json={
        "namespace": namespace, "query": "Where does Demo user live?", "limit": 3,
    }).json()["hits"]
    assert [hit["memory"]["content"] for hit in hits] == ["Demo user moved from Bengaluru to Pune"]
    assert client.get(f"/v1/memories/{previous['id']}").json()["is_active"] is False


@pytest.mark.parametrize("old,new,query,followup", [
    ("Demo user lives in Bengaluru", "Demo user moved from Bengaluru to Pune",
     "Where does Demo user live?", "Demo user moved from Pune to Delhi"),
    ("Demo user's favourite cuisine is Thai",
     "Demo user's favourite cuisine changed from Thai to Japanese",
     "What is Demo user's favourite cuisine?",
     "Demo user's favourite cuisine changed from Japanese to Italian"),
    ("Demo user is learning Rust on weekends",
     "Demo user switched from learning Rust on weekends to learning Go on weekends",
     "What is Demo user learning?",
     "Demo user switched from learning Go on weekends to learning Python on weekends"),
    ("Demo user runs 5 kilometres three mornings a week",
     "Demo user changed running routine from 5 kilometres three mornings a week "
     "to 3 kilometres twice a week", "How often does Demo user run?",
     "Demo user changed running routine from 3 kilometres twice a week to 2 kilometres daily"),
])
@requires_db
def test_source_matched_revisions_preserve_review_history(client, namespace, old, new, query, followup):
    previous = client.post("/v1/memories", json={
        "namespace": namespace, "content": old,
    }).json()["memory"]
    changed = client.post("/v1/memories", json={
        "namespace": namespace, "content": new,
    })
    assert changed.status_code == 201
    data = changed.json()
    conflict = next(c for c in data["contradictions"] if c["existing_memory"]["id"] == previous["id"])
    assert "Explicit" in conflict["reason"] and "review required" in conflict["reason"]
    assert client.get(f"/v1/memories/{previous['id']}").json()["is_active"] is True
    assert client.post("/v1/contradictions/resolve", json={
        "contradiction_id": conflict["id"], "winner_memory_id": data["memory"]["id"],
    }).status_code == 200
    hits = client.post("/v1/memories/search", json={
        "namespace": namespace, "query": query,
    }).json()["hits"]
    assert [hit["memory"]["content"] for hit in hits] == [new]
    assert client.get(f"/v1/memories/{previous['id']}").json()["is_active"] is False
    next_change = client.post("/v1/memories", json={
        "namespace": namespace, "content": followup,
    }).json()
    next_conflict = next(c for c in next_change["contradictions"]
                         if c["existing_memory"]["id"] == data["memory"]["id"])
    assert all(c["existing_memory"]["id"] != previous["id"]
               for c in next_change["contradictions"])
    assert client.post("/v1/contradictions/resolve", json={
        "contradiction_id": next_conflict["id"],
        "winner_memory_id": next_change["memory"]["id"],
    }).status_code == 200
    hits = client.post("/v1/memories/search", json={
        "namespace": namespace, "query": query,
    }).json()["hits"]
    assert [hit["memory"]["content"] for hit in hits] == [followup]
    assert client.get(f"/v1/memories/{data['memory']['id']}").json()["is_active"] is False


@pytest.mark.parametrize("old,new", [
    ("Demo user lives in Bengaluru", "Demo user might move from Bengaluru to Pune next year"),
    ("Demo user's favourite cuisine is Thai", "Demo user likes Japanese food too"),
])
@requires_db
def test_compatible_details_and_future_plans_do_not_replace_current_facts(client, namespace, old, new):
    previous = client.post("/v1/memories", json={
        "namespace": namespace, "content": old,
    }).json()["memory"]
    result = client.post("/v1/memories", json={
        "namespace": namespace, "content": new,
    })
    assert result.status_code == 201
    assert result.json()["contradictions"] == []
    assert client.get(f"/v1/memories/{previous['id']}").json()["is_active"] is True
