"""GET /v1/events over the audit log (CI tier, needs Postgres)."""

from __future__ import annotations

from tests.conftest import requires_db


@requires_db
def test_events_listed_newest_first(client, namespace):
    client.post("/v1/memories", json={"content": "first", "namespace": namespace})
    client.post("/v1/memories", json={"content": "second", "namespace": namespace})

    events = client.get(f"/v1/events?namespace={namespace}").json()
    actions = [e["action"] for e in events["items"]]
    assert set(actions) == {"memory.created"}
    assert events["total"] == 2
    assert events["limit"] == 50


@requires_db
def test_events_filter_by_action(client, namespace):
    client.post("/v1/memories", json={"content": "kept", "namespace": namespace})
    memory_id = client.post(
        "/v1/memories", json={"content": "removed", "namespace": namespace}
    ).json()["memory"]["id"]
    client.delete(f"/v1/memories/{memory_id}?namespace={namespace}")

    created = client.get(f"/v1/events?namespace={namespace}&action=memory.created").json()
    assert created["total"] == 2
    deleted = client.get(f"/v1/events?namespace={namespace}&action=memory.deleted").json()
    assert deleted["total"] == 1


@requires_db
def test_events_require_admin(client, namespace):
    plaintext = client.post("/v1/keys", json={"label": "limited", "scopes": ["read"]}).json()["key"]
    assert client.get("/v1/events", headers={"X-API-Key": plaintext}).status_code == 403
