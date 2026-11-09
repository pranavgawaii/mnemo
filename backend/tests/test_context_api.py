"""The context endpoint uses the real encoder, database and conflict lifecycle."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.db.session import SessionLocal
from app.models.models import Memory
from tests.conftest import requires_db

pytestmark = requires_db


def add(client, namespace, text, **fields):
    response = client.post("/v1/memories", json={"namespace": namespace, "content": text, **fields})
    assert response.status_code == 201, response.text
    return response.json()


def context(client, namespace, **fields):
    response = client.post("/v1/context", json={
        "namespace": namespace, "query": "Where does Riya live?", "min_similarity": -1, **fields,
    })
    assert response.status_code == 200, response.text
    return response.json()


def test_real_search_returns_cited_source_with_exact_character_count(client, namespace):
    memory = add(client, namespace, "Riya lives in Bengaluru")["memory"]
    result = context(client, namespace)
    assert result["status"] == "ready"
    assert result["candidate_count"] == 1
    assert result["query"] == "Where does Riya live?"
    assert result["namespace"] == namespace
    assert result["used_chars"] == len(result["context"]) <= result["max_chars"]
    assert result["citations"][0]["memory_id"] == memory["id"]
    assert result["citations"][0]["source_content"] == memory["content"]
    assert result["decisions"][0]["reason"] == "included"


def test_review_lifecycle_blocks_both_sides_until_explicit_resolution(client, namespace):
    old = add(client, namespace, "Riya lives in Bengaluru")["memory"]
    changed = add(client, namespace, "Riya moved from Bengaluru to Pune")
    pending = context(client, namespace)
    assert pending["status"] == "needs_review"
    assert pending["has_pending_review"] and pending["context"] == ""
    assert {item["memory_id"] for item in pending["decisions"]} == {old["id"], changed["memory"]["id"]}
    assert {item["reason"] for item in pending["decisions"]} == {"pending_review"}
    reviewed = client.post("/v1/contradictions/resolve", json={
        "contradiction_id": changed["contradictions"][0]["id"], "winner_memory_id": changed["memory"]["id"],
    })
    assert reviewed.status_code == 200
    current = context(client, namespace)
    assert current["status"] == "ready" and not current["has_pending_review"]
    assert current["citations"][0]["text"] == "Riya lives in Pune"
    assert current["citations"][0]["source_content"] == "Riya moved from Bengaluru to Pune"
    assert current["citations"][0]["used_current_statement"]
    assert old["id"] not in {item["memory_id"] for item in current["citations"]}


def test_explicit_source_mode_and_conflict_opt_in_keep_review_evidence(client, namespace):
    add(client, namespace, "Riya lives in Bengaluru")
    add(client, namespace, "Riya moved from Bengaluru to Pune")
    result = context(client, namespace, exclude_conflicts=False, current_values=False)
    assert result["has_pending_review"]
    assert len(result["citations"]) == 2
    assert all(item["pending_review"] for item in result["citations"])
    assert all(item["text"] == item["source_content"] for item in result["citations"])


def test_resolving_to_old_fact_keeps_the_reviewed_original_value(client, namespace):
    old = add(client, namespace, "Riya lives in Bengaluru")["memory"]
    changed = add(client, namespace, "Riya moved from Bengaluru to Pune")
    client.post("/v1/contradictions/resolve", json={
        "contradiction_id": changed["contradictions"][0]["id"], "winner_memory_id": old["id"],
    })
    result = context(client, namespace)
    assert result["citations"][0]["text"] == "Riya lives in Bengaluru"
    assert len(result["citations"]) == 1


def test_unrelated_safe_fact_survives_a_pending_city_change(client, namespace):
    add(client, namespace, "Riya lives in Bengaluru")
    add(client, namespace, "Riya moved from Bengaluru to Pune")
    safe = add(client, namespace, "The project database is PostgreSQL")["memory"]
    result = context(client, namespace)
    assert result["status"] == "ready" and result["has_pending_review"]
    assert [item["memory_id"] for item in result["citations"]] == [safe["id"]]


def test_expired_and_inactive_facts_never_enter_context(client, namespace):
    expired = add(client, namespace, "Riya lives in Bengaluru")["memory"]
    inactive = add(client, namespace, "Project uses SQLite")["memory"]
    with SessionLocal() as db:
        db.get(Memory, uuid.UUID(expired["id"])).expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.get(Memory, uuid.UUID(inactive["id"])).is_active = False
        db.commit()
    result = context(client, namespace)
    assert result["status"] == "empty"
    assert result["candidate_count"] == 0 and result["decisions"] == []


def test_budget_does_not_truncate_or_change_stored_content(client, namespace):
    memory = add(client, namespace, "Riya lives in Bengaluru")["memory"]
    result = context(client, namespace, max_chars=128)
    assert result["status"] == "budget_exhausted"
    assert result["used_chars"] == 0 and result["context"] == ""
    assert client.get(f"/v1/memories/{memory['id']}").json()["content"] == memory["content"]


def test_tag_filter_and_namespace_filter_apply_before_context_packing(client, namespace):
    desired = add(client, namespace, "Riya writes Python", tags=["work"])["memory"]
    add(client, namespace, "Riya likes tea", tags=["personal"])
    add(client, namespace + "-other", "Riya lives in Pune", tags=["work"])
    result = context(client, namespace, tags=["work"])
    assert result["candidate_count"] == 1
    assert result["citations"][0]["memory_id"] == desired["id"]


def test_read_only_key_can_build_context_but_write_only_key_cannot(client, namespace):
    add(client, namespace, "Riya lives in Bengaluru")
    for scopes, expected in [(["read"], 200), (["write"], 403)]:
        key = client.post("/v1/keys", json={"label": "context client", "scopes": scopes, "namespaces": [namespace]}).json()["key"]
        result = client.post("/v1/context", headers={"X-API-Key": key}, json={"namespace": namespace, "query": "Riya"})
        assert result.status_code == expected


@pytest.mark.parametrize("fields", [
    {"query": " "}, {"query": "x" * 8001}, {"max_chars": 127}, {"max_chars": 32001},
    {"candidate_limit": 0}, {"candidate_limit": 101}, {"min_similarity": 1.1},
    {"keyword_weight": -1}, {"diversity": 1.1}, {"unknown_setting": True},
])
def test_invalid_context_options_are_rejected(client, namespace, fields):
    response = client.post("/v1/context", json={"namespace": namespace, "query": "Riya", **fields})
    assert response.status_code == 422
