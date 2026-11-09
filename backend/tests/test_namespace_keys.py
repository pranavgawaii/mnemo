"""Application key boundaries exercised through real HTTP and pgvector storage."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.models import ApiKey, Memory
from tests.conftest import requires_db

pytestmark = requires_db


def issue(client, namespaces, scopes=None, **options):
    response = client.post("/v1/keys", json={
        "label": "application key", "scopes": scopes or ["read", "write"],
        "namespaces": namespaces, **options,
    })
    assert response.status_code == 201, response.text
    return response.json()


def headers(key):
    return {"X-API-Key": key["key"]}


def store(client, namespace, content="Riya writes Python"):
    response = client.post("/v1/memories", json={"namespace": namespace, "content": content})
    assert response.status_code == 201, response.text
    return response.json()["memory"]


def test_key_creation_listing_and_rotation_retain_grants_and_expiry(client, namespace):
    expiry = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    created = issue(client, [namespace], expires_at=expiry)
    assert created["namespaces"] == [namespace]
    assert datetime.fromisoformat(created["expires_at"]) == datetime.fromisoformat(expiry)
    listed = next(item for item in client.get("/v1/keys").json()["items"] if item["id"] == created["id"])
    assert listed["namespaces"] == [namespace]
    assert "key" not in listed
    rotated = client.post(f"/v1/keys/{created['id']}/rotate").json()
    assert rotated["key"] != created["key"]
    assert rotated["namespaces"] == created["namespaces"]
    assert rotated["expires_at"] == created["expires_at"]
    assert client.get("/v1/memories", params={"namespace": namespace}, headers=headers(created)).status_code == 401
    assert client.get("/v1/memories", params={"namespace": namespace}, headers=headers(rotated)).status_code == 200


def test_restricted_key_can_store_list_search_and_read_its_own_fact(client, namespace):
    key = issue(client, [namespace])
    created = client.post("/v1/memories", headers=headers(key), json={
        "namespace": namespace, "content": "Riya lives in Bengaluru",
    })
    assert created.status_code == 201
    memory_id = created.json()["memory"]["id"]
    assert client.get(f"/v1/memories/{memory_id}", headers=headers(key)).status_code == 200
    listed = client.get("/v1/memories", params={"namespace": namespace}, headers=headers(key))
    assert listed.status_code == 200 and listed.json()["total"] == 1
    searched = client.post("/v1/memories/search", headers=headers(key), json={
        "namespace": namespace, "query": "Where does Riya live?",
    })
    assert searched.status_code == 200
    assert searched.json()["hits"][0]["memory"]["id"] == memory_id


@pytest.mark.parametrize("method,path,payload", [
    ("get", "/v1/memories", None),
    ("get", "/v1/contradictions", None),
    ("post", "/v1/memories", {"content": "An unauthorized fact"}),
    ("post", "/v1/memories/search", {"query": "secret"}),
    ("post", "/v1/context", {"query": "secret"}),
])
def test_explicit_foreign_namespace_requests_are_denied(client, namespace, method, path, payload):
    key = issue(client, [namespace])
    options = {"params": {"namespace": "foreign"}} if payload is None else {
        "json": {**payload, "namespace": "foreign"},
    }
    response = client.request(method, path, headers=headers(key), **options)
    assert response.status_code == 403
    assert response.json()["detail"] == "This key cannot access this namespace."


def test_omitted_namespace_does_not_switch_to_the_keys_first_grant(client, namespace):
    key = issue(client, [namespace])
    assert client.get("/v1/memories", headers=headers(key)).status_code == 403
    response = client.post("/v1/memories", headers=headers(key), json={"content": "No namespace"})
    assert response.status_code == 403


@pytest.mark.parametrize("method,payload", [("get", None), ("patch", {"content": "tampered"}), ("delete", None)])
@pytest.mark.parametrize("explicit_namespace", [False, True])
def test_foreign_ids_cannot_be_read_or_mutated_even_without_namespace(
    client, namespace, method, payload, explicit_namespace,
):
    foreign = store(client, namespace + "-foreign")
    key = issue(client, [namespace])
    options = {"json": payload} if payload else {}
    if explicit_namespace:
        options["params"] = {"namespace": foreign["namespace"]}
    response = client.request(method, f"/v1/memories/{foreign['id']}", headers=headers(key), **options)
    assert response.status_code == 404
    assert response.json() == {"detail": "Memory not found."}
    original = client.get(f"/v1/memories/{foreign['id']}").json()
    assert original["content"] == foreign["content"]
    assert original["is_active"]


def test_unknown_id_and_foreign_id_have_the_same_response(client, namespace):
    foreign = store(client, namespace + "-foreign")
    key = issue(client, [namespace])
    known = client.get(f"/v1/memories/{foreign['id']}", headers=headers(key))
    missing = client.get(f"/v1/memories/{uuid.uuid4()}", headers=headers(key))
    assert (known.status_code, known.json()) == (missing.status_code, missing.json())


def test_mixed_namespace_bulk_request_is_rejected_before_any_write(client, namespace):
    key = issue(client, [namespace])
    response = client.post("/v1/memories/bulk", headers=headers(key), json={"items": [
        {"namespace": namespace, "content": "Allowed prefix must not commit"},
        {"namespace": namespace + "-other", "content": "Forbidden suffix"},
    ]})
    assert response.status_code == 403
    assert client.get("/v1/memories", params={"namespace": namespace}).json()["total"] == 0


def test_multi_namespace_grant_works_without_prefix_matching(client, namespace):
    grant = [namespace, namespace + ":second"]
    key = issue(client, grant)
    for name in grant:
        response = client.post("/v1/memories", headers=headers(key), json={
            "namespace": name, "content": "Explicitly allowed",
        })
        assert response.status_code == 201
    denied = client.get("/v1/memories", params={"namespace": namespace + ":third"}, headers=headers(key))
    assert denied.status_code == 403


def test_foreign_conflict_cannot_be_resolved_by_a_restricted_key(client, namespace):
    other = namespace + "-other"
    old = store(client, other, "Riya lives in Bengaluru")
    changed = client.post("/v1/memories", json={"namespace": other, "content": "Riya moved from Bengaluru to Pune"}).json()
    assert changed["contradictions"]
    conflict = changed["contradictions"][0]
    key = issue(client, [namespace])
    response = client.post("/v1/contradictions/resolve", headers=headers(key), json={
        "contradiction_id": conflict["id"], "winner_memory_id": changed["memory"]["id"],
    })
    assert response.status_code == 400
    assert response.json()["detail"] == "Contradiction not found."
    assert client.get(f"/v1/memories/{old['id']}").json()["is_active"]
    assert client.get("/v1/contradictions", params={"namespace": other}).json()["total"] == 1


def test_authorized_conflict_can_be_resolved_and_archived_source_read(client, namespace):
    old = store(client, namespace, "Riya lives in Bengaluru")
    key = issue(client, [namespace])
    changed = client.post("/v1/memories", headers=headers(key), json={
        "namespace": namespace, "content": "Riya moved from Bengaluru to Pune",
    }).json()
    response = client.post("/v1/contradictions/resolve", headers=headers(key), json={
        "contradiction_id": changed["contradictions"][0]["id"],
        "winner_memory_id": changed["memory"]["id"],
    })
    assert response.status_code == 200
    archived = client.get(f"/v1/memories/{old['id']}", headers=headers(key))
    assert archived.status_code == 200 and not archived.json()["is_active"]


@pytest.mark.parametrize("path,method,payload", [
    ("/v1/keys", "get", None), ("/v1/keys", "post", {"label": "escape", "scopes": ["admin"]}),
    ("/v1/events", "get", None), ("/v1/namespaces", "get", None),
    ("/v1/webhooks", "get", None),
])
def test_restricted_key_cannot_reach_global_admin_resources(client, namespace, path, method, payload):
    key = issue(client, [namespace])
    response = client.request(method, path, headers=headers(key), **({"json": payload} if payload else {}))
    assert response.status_code == 403


def test_read_scope_still_prevents_writes_within_grant(client, namespace):
    key = issue(client, [namespace], scopes=["read"])
    response = client.post("/v1/memories", headers=headers(key), json={"namespace": namespace, "content": "Nope"})
    assert response.status_code == 403


def test_expired_key_is_rejected_without_updating_last_used(client, namespace):
    key = issue(client, [namespace])
    with SessionLocal() as db:
        row = db.get(ApiKey, uuid.UUID(key["id"]))
        row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        assert row.last_used_at is None
        db.commit()
    response = client.get("/v1/memories", params={"namespace": namespace}, headers=headers(key))
    assert response.status_code == 401
    with SessionLocal() as db:
        assert db.get(ApiKey, uuid.UUID(key["id"])).last_used_at is None


def test_unrestricted_legacy_key_keeps_cross_namespace_access(client, namespace):
    memory = store(client, namespace)
    legacy = issue(client, None, scopes=["read"])
    assert legacy["namespaces"] is None and legacy["expires_at"] is None
    assert client.get(f"/v1/memories/{memory['id']}", headers=headers(legacy)).status_code == 200


def test_empty_database_grant_denies_access_instead_of_becoming_unrestricted(client, namespace):
    memory = store(client, namespace)
    key = issue(client, [namespace])
    with SessionLocal() as db:
        row = db.get(ApiKey, uuid.UUID(key["id"]))
        row.namespaces = []
        db.commit()
    assert client.get(f"/v1/memories/{memory['id']}", headers=headers(key)).status_code == 404
    assert client.get("/v1/memories", params={"namespace": namespace}, headers=headers(key)).status_code == 403
    with SessionLocal() as db:
        assert db.scalar(select(Memory.content).where(Memory.id == uuid.UUID(memory["id"]))) == memory["content"]
