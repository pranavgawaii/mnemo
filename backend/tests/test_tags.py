"""Tags and metadata filtering against real Postgres + pgvector (CI tier)."""

from __future__ import annotations

from tests.conftest import requires_db


@requires_db
def test_add_memory_with_tags_and_metadata(client, namespace):
    response = client.post(
        "/v1/memories",
        json={
            "content": "Pranav lives in Bengaluru",
            "namespace": namespace,
            "tags": ["people", "places"],
            "metadata": {"source": "chat"},
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["memory"]["tags"] == ["people", "places"]
    assert body["memory"]["metadata"] == {"source": "chat"}


@requires_db
def test_list_filter_by_tag(client, namespace):
    client.post("/v1/memories", json={"content": "likes dosa", "namespace": namespace, "tags": ["food"]})
    client.post("/v1/memories", json={"content": "works at Acme", "namespace": namespace, "tags": ["work"]})
    tagged = client.get(f"/v1/memories?namespace={namespace}&tags=food").json()
    assert tagged["total"] == 1
    assert tagged["items"][0]["content"] == "likes dosa"


@requires_db
def test_search_with_tag_filter(client, namespace):
    client.post("/v1/memories", json={"content": "Pranav lives in Bengaluru", "namespace": namespace, "tags": ["places"]})
    client.post("/v1/memories", json={"content": "Acme uses Postgres", "namespace": namespace, "tags": ["work"]})
    hits = client.post(
        "/v1/memories/search",
        json={"query": "Where does Pranav live?", "namespace": namespace, "tags": ["places"]},
    ).json()
    assert hits["hits"], "expected the tagged memory to match"
    assert all("Pranav" in h["memory"]["content"] for h in hits["hits"])


@requires_db
def test_update_replaces_tags(client, namespace):
    created = client.post(
        "/v1/memories", json={"content": "note to self", "namespace": namespace, "tags": ["a"]}
    ).json()
    memory_id = created["memory"]["id"]
    updated = client.patch(
        f"/v1/memories/{memory_id}?namespace={namespace}", json={"tags": ["b", "c"], "metadata": {"v": 2}}
    ).json()
    assert updated["tags"] == ["b", "c"]
    assert updated["metadata"] == {"v": 2}


@requires_db
def test_export_includes_tags_and_metadata(client, namespace):
    client.post(
        "/v1/memories",
        json={"content": "dosa on friday", "namespace": namespace, "tags": ["food"], "metadata": {"k": 1}},
    )
    exported = client.get(f"/v1/namespaces/{namespace}/export").json()
    assert exported["memories"][0]["tags"] == ["food"]
    assert exported["memories"][0]["metadata"] == {"k": 1}
