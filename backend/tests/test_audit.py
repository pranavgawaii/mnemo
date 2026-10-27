"""Audit log trail against real Postgres (CI tier)."""

from __future__ import annotations

from collections import Counter

from sqlalchemy import select

from app.models.models import AuditLog
from tests.conftest import requires_db


def _rows(namespace: str) -> list[AuditLog]:
    from app.db.session import SessionLocal

    with SessionLocal() as db:
        return list(
            db.execute(
                select(AuditLog)
                .where(AuditLog.namespace == namespace)
                .order_by(AuditLog.created_at)
            )
            .scalars()
            .all()
        )


@requires_db
def test_create_records_memory_created(client, namespace):
    created = client.post(
        "/v1/memories", json={"content": "audited fact", "namespace": namespace}
    ).json()
    rows = [r.action for r in _rows(namespace)]
    assert rows == ["memory.created"]
    row = _rows(namespace)[0]
    assert str(row.resource_id) == created["memory"]["id"]


@requires_db
def test_full_lifecycle_records_every_action(client, namespace):
    memory_id = client.post(
        "/v1/memories", json={"content": "Pranav lives in Bengaluru", "namespace": namespace}
    ).json()["memory"]["id"]
    contra = client.post(
        "/v1/memories",
        json={"content": "Pranav no longer lives in Bengaluru", "namespace": namespace},
    ).json()
    contradiction_id = contra["contradictions"][0]["id"]
    client.post(
        "/v1/contradictions/resolve",
        json={"contradiction_id": contradiction_id, "winner_memory_id": memory_id},
    )

    actions = [r.action for r in _rows(namespace)]
    # Both creations are audited; rows sharing a transaction share a created_at,
    # so compare as a multiset rather than relying on tie ordering.
    assert Counter(actions) == Counter(
        {"memory.created": 2, "contradiction.flagged": 1, "contradiction.resolved": 1}
    )


@requires_db
def test_update_and_delete_recorded(client, namespace):
    memory_id = client.post(
        "/v1/memories", json={"content": "before edit", "namespace": namespace}
    ).json()["memory"]["id"]
    client.patch(
        f"/v1/memories/{memory_id}?namespace={namespace}", json={"importance": 5}
    )
    client.delete(f"/v1/memories/{memory_id}?namespace={namespace}")

    actions = [r.action for r in _rows(namespace)]
    assert actions == ["memory.created", "memory.updated", "memory.deleted"]


@requires_db
def test_sweep_records_one_entry_per_memory(client, namespace):
    from datetime import UTC, datetime, timedelta

    past = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    created = client.post(
        "/v1/memories",
        json={"content": "expired thing", "namespace": namespace, "expires_at": past},
    ).json()["memory"]

    from app.db.session import SessionLocal
    from app.services import memory_service

    with SessionLocal() as db:
        memory_service.sweep_expired(db)

    swept = [r for r in _rows(namespace) if r.action == "memory.swept"]
    assert len(swept) == 1
    assert str(swept[0].resource_id) == created["id"]


@requires_db
def test_actor_key_recorded(client, namespace):
    import hashlib

    plaintext = client.post("/v1/keys", json={"label": "auditor", "scopes": ["read", "write"]}).json()["key"]

    from sqlalchemy import text as sql_text

    from app.db.session import SessionLocal

    with SessionLocal() as db:
        row = db.execute(
            sql_text("SELECT id FROM api_keys WHERE key_hash = :h"),
            {"h": hashlib.sha256(plaintext.encode()).hexdigest()},
        ).one()
        key_id = row.id

    client.post(
        "/v1/memories",
        json={"content": "from issued key", "namespace": namespace},
        headers={"X-API-Key": plaintext},
    )
    rows = _rows(namespace)
    assert rows[0].actor_key_id == key_id
