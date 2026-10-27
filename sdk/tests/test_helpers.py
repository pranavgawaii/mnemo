"""Tests for the high-level helpers (MockTransport, no server)."""

from __future__ import annotations

import json
import uuid

import httpx
from mnemo.helpers import context_block, forget, recall, remember

from .test_client import MEMORY, make_client, route_handler

CONTRA = {
    "id": str(uuid.uuid4()),
    "namespace": "default",
    "new_memory_id": MEMORY["id"],
    "existing_memory_id": str(uuid.uuid4()),
    "similarity": 0.93,
    "reason": "negation marker",
    "status": "open",
    "resolved_winner_id": None,
    "created_at": "2026-01-01T00:00:00Z",
    "resolved_at": None,
}


def test_remember_auto_resolves_last_write_wins():
    resolutions: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/v1/memories":
            return httpx.Response(201, json={"memory": MEMORY, "contradictions": [CONTRA]})
        if request.method == "POST" and request.url.path == "/v1/contradictions/resolve":
            payload = json.loads(request.content)
            resolutions.append(payload)
            return httpx.Response(
                200,
                json={
                    **CONTRA,
                    "status": "resolved",
                    "resolved_winner_id": payload["winner_memory_id"],
                },
            )
        return httpx.Response(404, json={"detail": "unexpected route"})

    with make_client(handler) as client:
        memory, resolved = remember(client, "Riya moved to Berlin")

    assert memory.id == uuid.UUID(MEMORY["id"])
    assert len(resolved) == 1
    assert resolutions == [
        {"contradiction_id": CONTRA["id"], "winner_memory_id": MEMORY["id"]}
    ]


def test_remember_without_auto_resolve_leaves_contradictions_open():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/memories"
        return httpx.Response(201, json={"memory": MEMORY, "contradictions": [CONTRA]})

    with make_client(handler) as client:
        _, resolved = remember(client, "Riya moved to Berlin", auto_resolve=False)
    assert len(resolved) == 1


def test_recall_unwraps_memories_and_filters():
    weak = {**MEMORY, "id": str(uuid.uuid4())}
    body = {
        "hits": [
            {"memory": MEMORY, "similarity": 0.95, "relevance_score": 0.9, "age_days": 1.0},
            {"memory": weak, "similarity": 0.2, "relevance_score": 0.1, "age_days": 9.0},
        ],
        "total_memories": 2,
        "returned": 2,
        "top_similarity": 0.95,
    }

    with make_client(route_handler({("POST", "/v1/memories/search"): body})) as client:
        memories = recall(client, "where does riya live", min_similarity=0.5)
    assert [m.id for m in memories] == [uuid.UUID(MEMORY["id"])]


def test_forget_calls_delete():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "DELETE"
        assert request.url.path == f"/v1/memories/{MEMORY['id']}"
        return httpx.Response(200, json={**MEMORY, "is_active": False})

    with make_client(handler) as client:
        deleted = forget(client, MEMORY["id"])
    assert deleted.is_active is False


def test_context_block_formats_and_truncates():
    long_memory = {**MEMORY, "content": "x" * 1500}
    short_memory = {**MEMORY, "id": str(uuid.uuid4()), "content": "Riya lives in Pune"}
    body = {
        "hits": [
            {"memory": long_memory, "similarity": 0.9, "relevance_score": 0.9, "age_days": 1.0},
            {"memory": short_memory, "similarity": 0.85, "relevance_score": 0.8, "age_days": 2.0},
        ],
        "total_memories": 2,
        "returned": 2,
        "top_similarity": 0.9,
    }

    with make_client(route_handler({("POST", "/v1/memories/search"): body})) as client:
        block = context_block(client, "riya", max_chars=1600)

    assert block.startswith("Relevant memories:")
    assert short_memory["content"] in block
    assert len(block) <= 1600


def test_context_block_empty_when_no_hits():
    body = {"hits": [], "total_memories": 0, "returned": 0, "top_similarity": None}
    with make_client(route_handler({("POST", "/v1/memories/search"): body})) as client:
        assert context_block(client, "anything") == ""
