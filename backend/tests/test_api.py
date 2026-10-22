"""End-to-end API tests against real Postgres+pgvector.

Skipped automatically when no database is reachable (see conftest.py).
"""

from __future__ import annotations

from tests.conftest import requires_db


@requires_db
def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@requires_db
def test_ready_checks_database(client):
    # Requires a reachable database, so this assertion is only meaningful when
    # the DB-integration tests are running at all.
    resp = client.get("/ready")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ready"}


@requires_db
def test_get_and_delete_honour_optional_namespace(client, namespace):
    mem = client.post(
        "/v1/memories",
        json={"content": "namespaced fact", "namespace": namespace},
    ).json()["memory"]

    # Omitted -> backwards-compatible: fetch by id across namespaces.
    assert client.get(f"/v1/memories/{mem['id']}").status_code == 200

    # Correct namespace -> 200.
    ok = client.get(f"/v1/memories/{mem['id']}?namespace={namespace}")
    assert ok.status_code == 200

    # A different namespace -> 404, without revealing that the id exists.
    other = f"{namespace}-other"
    assert client.get(f"/v1/memories/{mem['id']}?namespace={other}").status_code == 404

    # Delete scoped to the wrong namespace must not delete anything.
    assert client.delete(f"/v1/memories/{mem['id']}?namespace={other}").status_code == 404
    assert client.get(f"/v1/memories/{mem['id']}").json()["is_active"] is True

    # Delete scoped to the right namespace succeeds.
    deleted = client.delete(f"/v1/memories/{mem['id']}?namespace={namespace}")
    assert deleted.status_code == 200
    assert deleted.json()["is_active"] is False


@requires_db
def test_add_requires_api_key(client, namespace):
    resp = client.post(
        "/v1/memories",
        json={"content": "no key", "namespace": namespace},
        headers={"X-API-Key": "wrong"},
    )
    assert resp.status_code == 401


@requires_db
def test_add_and_get_memory(client, namespace):
    resp = client.post(
        "/v1/memories",
        json={"content": "Pranav lives in Bangalore", "namespace": namespace, "importance": 4},
    )
    assert resp.status_code == 201
    body = resp.json()
    mem = body["memory"]
    assert mem["content"] == "Pranav lives in Bangalore"
    assert mem["importance"] == 4
    assert mem["is_active"] is True
    assert body["contradictions"] == []

    got = client.get(f"/v1/memories/{mem['id']}")
    assert got.status_code == 200
    assert got.json()["id"] == mem["id"]


@requires_db
def test_update_memory_changes_importance_and_content(client, namespace):
    mem = client.post(
        "/v1/memories",
        json={
            "content": "Pranav lives in Bengaluru",
            "namespace": namespace,
            "importance": 2,
        },
    ).json()["memory"]

    updated = client.patch(f"/v1/memories/{mem['id']}", json={"importance": 5})
    assert updated.status_code == 200
    assert updated.json()["importance"] == 5
    assert updated.json()["content"] == "Pranav lives in Bengaluru"
    assert updated.json()["updated_at"] >= mem["updated_at"]

    changed = client.patch(
        f"/v1/memories/{mem['id']}",
        json={"content": "Pranav lives in Pune"},
    )
    assert changed.status_code == 200
    assert changed.json()["content"] == "Pranav lives in Pune"

    # The new text was re-embedded, so search still finds the row.
    hits = client.post(
        "/v1/memories/search",
        json={"query": "Where does Pranav live?", "namespace": namespace, "limit": 5},
    ).json()["hits"]
    assert any("Pune" in hit["memory"]["content"] for hit in hits)


@requires_db
def test_update_memory_requires_a_change(client, namespace):
    mem = client.post(
        "/v1/memories",
        json={"content": "Pranav likes filter coffee", "namespace": namespace},
    ).json()["memory"]

    empty = client.patch(f"/v1/memories/{mem['id']}", json={})
    assert empty.status_code == 422

    blank = client.patch(f"/v1/memories/{mem['id']}", json={"content": ""})
    assert blank.status_code == 422


@requires_db
def test_update_memory_honours_namespace_and_rechecks_contradictions(client, namespace):
    client.post(
        "/v1/memories",
        json={"content": "Pranav lives in Bengaluru", "namespace": namespace},
    )
    mem = client.post(
        "/v1/memories",
        json={"content": "Pranav likes filter coffee", "namespace": namespace},
    ).json()["memory"]

    # A different namespace must not update the row.
    wrong = client.patch(
        f"/v1/memories/{mem['id']}?namespace={namespace}-other",
        json={"importance": 5},
    )
    assert wrong.status_code == 404
    assert client.get(f"/v1/memories/{mem['id']}").json()["importance"] == 3

    changed = client.patch(
        f"/v1/memories/{mem['id']}",
        json={"content": "Pranav no longer lives in Bengaluru"},
    )
    assert changed.status_code == 200

    listed = client.get(f"/v1/contradictions?namespace={namespace}")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    # Re-checking the same pair must not create a duplicate audit entry.
    again = client.patch(
        f"/v1/memories/{mem['id']}",
        json={"content": "Pranav no longer lives in Bengaluru, India"},
    )
    assert again.status_code == 200
    assert client.get(f"/v1/contradictions?namespace={namespace}").json()["total"] == 1


@requires_db
def test_search_ranks_by_relevance(client, namespace):
    client.post(
        "/v1/memories",
        json={"content": "The capital of France is Paris", "namespace": namespace},
    )
    client.post(
        "/v1/memories",
        json={"content": "I had pasta for lunch", "namespace": namespace},
    )
    resp = client.post(
        "/v1/memories/search",
        json={"query": "What is the capital of France?", "namespace": namespace, "limit": 5},
    )
    assert resp.status_code == 200
    hits = resp.json()["hits"]
    assert len(hits) >= 1
    # Top hit should be the France memory.
    assert "Paris" in hits[0]["memory"]["content"]
    # similarity and relevance_score are surfaced separately.
    assert "similarity" in hits[0]
    assert "relevance_score" in hits[0]


@requires_db
def test_contradiction_flagged_end_to_end(client, namespace):
    first = client.post(
        "/v1/memories",
        json={"content": "Pranav lives in Bengaluru", "namespace": namespace},
    )
    assert first.status_code == 201
    assert first.json()["contradictions"] == []

    second = client.post(
        "/v1/memories",
        json={"content": "Pranav no longer lives in Bengaluru", "namespace": namespace},
    )
    assert second.status_code == 201
    contradictions = second.json()["contradictions"]
    assert len(contradictions) >= 1, "expected the negation to be flagged"
    c = contradictions[0]
    assert c["status"] == "open"
    assert c["similarity"] >= 0.82

    # It should also show up in the contradictions list.
    listed = client.get(f"/v1/contradictions?namespace={namespace}")
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1


@requires_db
def test_contradiction_list_paginates(client, namespace):
    for content in (
        "Pranav lives in Bengaluru",
        "Pranav no longer lives in Bengaluru",
        "Pranav works at Acme",
        "Pranav no longer works at Acme",
    ):
        client.post("/v1/memories", json={"content": content, "namespace": namespace})

    first = client.get(f"/v1/contradictions?namespace={namespace}&limit=1&offset=0")
    assert first.status_code == 200
    body = first.json()
    assert body["total"] >= 2
    assert body["limit"] == 1
    assert body["offset"] == 0
    assert len(body["items"]) == 1

    second = client.get(f"/v1/contradictions?namespace={namespace}&limit=1&offset=1")
    assert second.status_code == 200
    assert second.json()["total"] == body["total"]
    assert len(second.json()["items"]) == 1
    assert second.json()["items"][0]["id"] != body["items"][0]["id"]

    past_end = client.get(
        f"/v1/contradictions?namespace={namespace}&limit=1&offset={body['total']}"
    )
    assert past_end.status_code == 200
    assert past_end.json()["items"] == []


@requires_db
def test_resolve_soft_deletes_loser_and_drops_from_search(client, namespace):
    old = client.post(
        "/v1/memories",
        json={"content": "Pranav lives in Bengaluru", "namespace": namespace},
    ).json()["memory"]
    new_resp = client.post(
        "/v1/memories",
        json={"content": "Pranav no longer lives in Bengaluru", "namespace": namespace},
    ).json()
    new_mem = new_resp["memory"]
    contradiction = new_resp["contradictions"][0]

    # Keep the new memory; the old one should be soft-deleted.
    resolved = client.post(
        "/v1/contradictions/resolve",
        json={"contradiction_id": contradiction["id"], "winner_memory_id": new_mem["id"]},
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"

    # Loser is soft-deleted, not gone.
    loser = client.get(f"/v1/memories/{old['id']}")
    assert loser.status_code == 200
    assert loser.json()["is_active"] is False

    # And it drops out of search / the active list.
    listing = client.get(f"/v1/memories?namespace={namespace}")
    active_ids = {m["id"] for m in listing.json()["items"]}
    assert old["id"] not in active_ids
    assert new_mem["id"] in active_ids


@requires_db
def test_resolve_rejects_foreign_winner(client, namespace):
    client.post("/v1/memories", json={"content": "Pranav lives in Bengaluru", "namespace": namespace})
    new_resp = client.post(
        "/v1/memories",
        json={"content": "Pranav no longer lives in Bengaluru", "namespace": namespace},
    ).json()
    contradiction = new_resp["contradictions"][0]

    # A random memory id not part of the pair must be rejected.
    other = client.post(
        "/v1/memories", json={"content": "unrelated fact about weather", "namespace": namespace}
    ).json()["memory"]
    resp = client.post(
        "/v1/contradictions/resolve",
        json={"contradiction_id": contradiction["id"], "winner_memory_id": other["id"]},
    )
    assert resp.status_code == 400
