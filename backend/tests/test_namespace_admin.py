"""Namespace export, import and statistics tests.

The round-trip tests use the real Postgres+pgvector path, so they are skipped
when no database is reachable, exactly like ``test_api.py``.
"""

from __future__ import annotations

import uuid

import pytest

from app.db.session import SessionLocal
from app.models.schemas import MemoryExport
from app.services import memory_service
from tests.conftest import requires_db


def _seed_conflict(client, namespace: str) -> None:
    client.post(
        "/v1/memories",
        json={"content": "Pranav lives in Bengaluru", "namespace": namespace},
    )
    client.post(
        "/v1/memories",
        json={
            "content": "Pranav no longer lives in Bengaluru",
            "namespace": namespace,
        },
    )


@requires_db
def test_export_includes_soft_deleted_memories_and_conflicts(client, namespace):
    first = client.post(
        "/v1/memories",
        json={"content": "Pranav likes filter coffee", "namespace": namespace},
    ).json()["memory"]
    client.delete(f"/v1/memories/{first['id']}")
    _seed_conflict(client, namespace)

    resp = client.get(f"/v1/namespaces/{namespace}/export")
    assert resp.status_code == 200
    body = resp.json()

    assert body["namespace"] == namespace
    assert body["version"] == 1
    assert len(body["memories"]) == 3
    assert any(memory["is_active"] is False for memory in body["memories"])
    assert len(body["contradictions"]) == 1
    assert "embedding" not in body["memories"][0]


@requires_db
def test_namespace_stats_match_the_export(client, namespace):
    first = client.post(
        "/v1/memories",
        json={"content": "Pranav likes filter coffee", "namespace": namespace, "importance": 5},
    ).json()["memory"]
    client.delete(f"/v1/memories/{first['id']}")
    _seed_conflict(client, namespace)

    resp = client.get(f"/v1/namespaces/{namespace}/stats")
    assert resp.status_code == 200
    body = resp.json()

    assert body["total_memories"] == 3
    assert body["active_memories"] == 2
    assert body["inactive_memories"] == 1
    assert body["open_contradictions"] == 1
    assert body["resolved_contradictions"] == 0
    assert body["average_importance"] == pytest.approx(11 / 3)
    assert {row["importance"] for row in body["importance_counts"]} == {3, 5}


@requires_db
def test_export_import_round_trip_preserves_audit_trail(client, namespace):
    first = client.post(
        "/v1/memories",
        json={"content": "Pranav likes filter coffee", "namespace": namespace},
    ).json()["memory"]
    client.delete(f"/v1/memories/{first['id']}")
    _seed_conflict(client, namespace)

    exported = client.get(f"/v1/namespaces/{namespace}/export").json()
    payload = MemoryExport.model_validate(exported)
    restored_namespace = f"{namespace}-restored"

    db = SessionLocal()
    try:
        counts = memory_service.import_namespace(
            db, namespace=restored_namespace, payload=payload
        )
    finally:
        db.close()

    assert counts == (3, 1)

    restored = client.get(f"/v1/namespaces/{restored_namespace}/export").json()
    source_by_content = {m["content"]: m for m in exported["memories"]}
    restored_by_content = {m["content"]: m for m in restored["memories"]}

    assert set(restored_by_content) == set(source_by_content)
    for content, source in source_by_content.items():
        target = restored_by_content[content]
        assert target["id"] != source["id"]
        assert target["importance"] == source["importance"]
        assert target["is_active"] == source["is_active"]
        assert target["created_at"] == source["created_at"]
        assert target["updated_at"] == source["updated_at"]

    assert {m["is_active"] for m in restored["memories"]} == {True, False}
    restored_conflict = restored["contradictions"][0]
    assert restored_conflict["id"] != exported["contradictions"][0]["id"]
    assert restored_conflict["new_memory_id"] in {
        m["id"] for m in restored["memories"]
    }
    assert restored_conflict["existing_memory_id"] in {
        m["id"] for m in restored["memories"]
    }
    assert restored_conflict["status"] == "open"

    # The original namespace is untouched.
    fetched = client.get(f"/v1/memories/{first['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["content"] == "Pranav likes filter coffee"


@requires_db
def test_import_refuses_to_merge_into_a_non_empty_namespace(client, namespace):
    client.post(
        "/v1/memories",
        json={"content": "Pranav likes filter coffee", "namespace": namespace},
    )
    exported = client.get(f"/v1/namespaces/{namespace}/export").json()
    payload = MemoryExport.model_validate(exported)

    db = SessionLocal()
    try:
        with pytest.raises(ValueError, match="already contains memories"):
            memory_service.import_namespace(
                db, namespace=namespace, payload=payload
            )
    finally:
        db.close()


@requires_db
def test_import_rejects_a_contradiction_with_unknown_memory(client, namespace):
    _seed_conflict(client, namespace)
    exported = client.get(f"/v1/namespaces/{namespace}/export").json()
    payload = MemoryExport.model_validate(exported)

    broken = payload.model_copy(
        update={
            "contradictions": [
                payload.contradictions[0].model_copy(
                    update={"new_memory_id": uuid.uuid4()}
                )
            ]
        }
    )

    db = SessionLocal()
    try:
        with pytest.raises(ValueError, match="unknown memory"):
            memory_service.import_namespace(
                db, namespace=f"{namespace}-broken", payload=broken
            )
    finally:
        db.close()
