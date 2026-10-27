"""Namespace CRUD and per-namespace scoring overrides (CI tier, needs Postgres)."""

from __future__ import annotations

from tests.conftest import requires_db


@requires_db
def test_create_and_list_namespaces(client):
    created = client.post(
        "/v1/namespaces",
        json={"name": "team-a", "decay_half_life_days": 90.0},
    )
    assert created.status_code == 201
    assert created.json()["name"] == "team-a"
    assert created.json()["decay_half_life_days"] == 90.0
    assert created.json()["decay_floor"] is None

    listed = client.get("/v1/namespaces").json()
    assert any(n["name"] == "team-a" for n in listed["items"])


@requires_db
def test_duplicate_namespace_conflicts(client):
    client.post("/v1/namespaces", json={"name": "dup-ns"})
    again = client.post("/v1/namespaces", json={"name": "dup-ns"})
    assert again.status_code == 409


@requires_db
def test_invalid_namespace_name_is_422(client):
    response = client.post("/v1/namespaces", json={"name": "bad name!"})
    assert response.status_code == 422


@requires_db
def test_threshold_override_changes_flagging(client, namespace):
    # Default threshold 0.82: this near-duplicate with a negation flags.
    client.post("/v1/namespaces", json={"name": namespace, "contradiction_sim_threshold": 0.99})
    first = client.post(
        "/v1/memories", json={"content": "Riya lives in Pune", "namespace": namespace}
    )
    second = client.post(
        "/v1/memories", json={"content": "Riya no longer lives in Pune", "namespace": namespace}
    )
    assert first.status_code == 201
    assert second.json()["contradictions"] == [], "0.99 gate should suppress the flag"

    # Reset the override to the global threshold; a fresh pair then flags. The
    # suppressed second memory is removed first so the probe has exactly one
    # contradicting neighbour.
    reset = client.patch(f"/v1/namespaces/{namespace}", json={"contradiction_sim_threshold": None})
    assert reset.json()["contradiction_sim_threshold"] is None
    client.delete(f"/v1/memories/{second.json()['memory']['id']}?namespace={namespace}")
    third = client.post(
        "/v1/memories", json={"content": "Riya does not live in Pune", "namespace": namespace}
    )
    assert len(third.json()["contradictions"]) == 1


@requires_db
def test_delete_refused_while_memories_exist(client, namespace):
    client.post("/v1/memories", json={"content": "keep me", "namespace": namespace})
    refused = client.delete(f"/v1/namespaces/{namespace}")
    assert refused.status_code == 409


@requires_db
def test_delete_empty_namespace(client):
    client.post("/v1/namespaces", json={"name": "empty-ns"})
    deleted = client.delete("/v1/namespaces/empty-ns")
    assert deleted.status_code == 204
    assert client.get("/v1/namespaces/empty-ns").status_code == 404


@requires_db
def test_unknown_namespace_404(client):
    assert client.get("/v1/namespaces/nope-nope").status_code == 404
