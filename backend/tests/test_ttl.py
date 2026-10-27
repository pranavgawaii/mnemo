"""TTL (expires_at) behaviour against real Postgres + pgvector (CI tier)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from tests.conftest import requires_db


@requires_db
def test_expired_memory_excluded_from_list_and_search(client, namespace):
    past = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    client.post(
        "/v1/memories",
        json={"content": "ephemeral coupon code ABC", "namespace": namespace, "expires_at": past},
    )
    client.post("/v1/memories", json={"content": "permanent fact", "namespace": namespace})

    listed = client.get(f"/v1/memories?namespace={namespace}").json()
    assert [m["content"] for m in listed["items"]] == ["permanent fact"]

    hits = client.post(
        "/v1/memories/search",
        json={"query": "coupon code", "namespace": namespace},
    ).json()
    assert all("coupon" not in h["memory"]["content"] for h in hits["hits"])


@requires_db
def test_future_expiry_still_visible(client, namespace):
    future = (datetime.now(UTC) + timedelta(days=30)).isoformat()
    client.post(
        "/v1/memories",
        json={"content": "trial until december", "namespace": namespace, "expires_at": future},
    )
    listed = client.get(f"/v1/memories?namespace={namespace}").json()
    assert listed["total"] == 1
    assert listed["items"][0]["expires_at"] is not None


@requires_db
def test_sweep_soft_deletes_expired(client, namespace):
    past = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    client.post(
        "/v1/memories",
        json={"content": "gone after sweep", "namespace": namespace, "expires_at": past},
    )
    client.post("/v1/memories", json={"content": "still here", "namespace": namespace})

    from app.db.session import SessionLocal
    from app.services import memory_service

    with SessionLocal() as db:
        expired = memory_service.sweep_expired(db)
    assert expired == 1

    listed = client.get(f"/v1/memories?namespace={namespace}").json()
    assert [m["content"] for m in listed["items"]] == ["still here"]

    # The row still exists, soft-deleted: the audit trail is preserved.
    stats = client.get(f"/v1/namespaces/{namespace}/stats").json()
    assert stats["total_memories"] == 2
    assert stats["active_memories"] == 1


@requires_db
def test_update_can_clear_expiry(client, namespace):
    past = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    created = client.post(
        "/v1/memories",
        json={"content": "resurrected", "namespace": namespace, "expires_at": past},
    ).json()
    memory_id = created["memory"]["id"]
    updated = client.patch(
        f"/v1/memories/{memory_id}?namespace={namespace}", json={"expires_at": None}
    ).json()
    assert updated["expires_at"] is None
    assert client.get(f"/v1/memories?namespace={namespace}").json()["total"] == 1
