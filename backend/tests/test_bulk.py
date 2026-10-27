"""Bulk add endpoint against real Postgres + pgvector (CI tier)."""

from __future__ import annotations

from tests.conftest import requires_db


@requires_db
def test_bulk_creates_all_items(client, namespace):
    response = client.post(
        "/v1/memories/bulk",
        json={
            "items": [
                {"content": "Pranav lives in Bengaluru", "namespace": namespace},
                {"content": "Pranav works at Acme", "namespace": namespace, "importance": 4},
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["created"] == 2
    assert body["errors"] == 0
    assert [r["index"] for r in body["results"]] == [0, 1]


@requires_db
def test_bulk_flags_contradictions_between_batch_items(client, namespace):
    body = client.post(
        "/v1/memories/bulk",
        json={
            "items": [
                {"content": "Pranav lives in Bengaluru", "namespace": namespace},
                {"content": "Pranav no longer lives in Bengaluru", "namespace": namespace},
            ]
        },
    ).json()
    assert body["created"] == 2
    assert len(body["results"][1]["contradictions"]) == 1


@requires_db
def test_bulk_isolates_runtime_failures(client, namespace, monkeypatch):
    # Schema-level errors reject the whole request (422); per-item isolation
    # applies to runtime failures. Force one item's embed to blow up.
    import app.services.memory_service as service

    real_embed = service.embed

    def flaky_embed(text: str) -> list[float]:
        if text == "boom":
            raise ValueError("embedder unavailable")
        return real_embed(text)

    monkeypatch.setattr(service, "embed", flaky_embed)
    body = client.post(
        "/v1/memories/bulk",
        json={
            "items": [
                {"content": "fine memory", "namespace": namespace},
                {"content": "boom", "namespace": namespace},
            ]
        },
    ).json()
    assert body["created"] == 1
    assert body["errors"] == 1
    assert body["results"][1]["status"] == "error"
    assert "embedder" in body["results"][1]["error"]
    # The first item survived despite the second failing.
    assert client.get(f"/v1/memories?namespace={namespace}").json()["total"] == 1


@requires_db
def test_bulk_rejects_invalid_items_upfront(client, namespace):
    # An invalid item fails request validation for the whole call.
    response = client.post("/v1/memories/bulk", json={"items": [{"content": "", "namespace": namespace}]})
    assert response.status_code == 422


@requires_db
def test_bulk_rejects_empty_items(client, namespace):
    response = client.post("/v1/memories/bulk", json={"items": []})
    assert response.status_code == 422
