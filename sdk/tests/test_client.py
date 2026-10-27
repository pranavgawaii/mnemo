"""Sync client tests against httpx.MockTransport - no server needed."""

from __future__ import annotations

import json
import uuid

import httpx
import pytest
from mnemo import MnemoClient
from mnemo.errors import (
    AuthenticationError,
    ConflictError,
    ForbiddenError,
    MnemoError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)
from mnemo.models import SearchResponse

MEMORY = {
    "id": str(uuid.uuid4()),
    "namespace": "default",
    "content": "Pranav lives in Bengaluru",
    "importance": 3,
    "is_active": True,
    "tags": ["people"],
    "metadata": {"source": "chat"},
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
    "expires_at": None,
}


def make_client(handler) -> MnemoClient:
    return MnemoClient(
        base_url="http://testserver",
        api_key="test-key",
        transport=httpx.MockTransport(handler),
    )


def route_handler(routes: dict[tuple[str, str], object]) -> object:
    def handler(request: httpx.Request) -> httpx.Response:
        key = (request.method, request.url.path)
        if key not in routes:
            return httpx.Response(404, json={"detail": "no route in mock"})
        outcome = routes[key]
        if isinstance(outcome, tuple):
            status, body = outcome
            return httpx.Response(status, json=body)
        return httpx.Response(200, json=outcome)

    return handler


def test_add_memory_parses_response():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/v1/memories"
        assert request.headers["X-API-Key"] == "test-key"
        payload = json.loads(request.content)
        assert payload["content"] == "Pranav lives in Bengaluru"
        assert payload["metadata"] == {"source": "chat"}
        return httpx.Response(201, json={"memory": MEMORY, "contradictions": []})

    with make_client(handler) as client:
        memory, contradictions = client.add_memory(
            "Pranav lives in Bengaluru", metadata={"source": "chat"}
        )
    assert memory.content == "Pranav lives in Bengaluru"
    assert memory.tags == ["people"]
    assert memory.created_at is not None
    assert contradictions == []


def test_search_parses_hits():
    body = {
        "hits": [
            {
                "memory": MEMORY,
                "similarity": 0.92,
                "relevance_score": 0.87,
                "age_days": 4.2,
            }
        ],
        "total_memories": 12,
        "returned": 1,
        "top_similarity": 0.92,
    }
    with make_client(route_handler({("POST", "/v1/memories/search"): body})) as client:
        response: SearchResponse = client.search("where does pranav live")
    assert len(response.hits) == 1
    assert response.hits[0].similarity == 0.92
    assert response.hits[0].memory.id == uuid.UUID(MEMORY["id"])


def test_error_mapping():
    cases = [
        (401, AuthenticationError),
        (403, ForbiddenError),
        (404, NotFoundError),
        (409, ConflictError),
        (422, ValidationError),
        (500, MnemoError),
    ]
    for status, expected in cases:
        with make_client(
            route_handler({("GET", "/v1/memories"): (status, {"detail": "boom"})})
        ) as client:
            with pytest.raises(expected) as excinfo:
                client.list_memories()
        assert "boom" in str(excinfo.value)


def test_rate_limit_error_carries_status():
    with make_client(
        route_handler({("GET", "/v1/memories"): (429, {"detail": "slow down"})})
    ) as client:
        with pytest.raises(RateLimitError):
            client.list_memories()


def test_list_memories_sends_tag_and_cursor_params():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(dict(request.url.params))
        return httpx.Response(
            200, json={"items": [MEMORY], "total": 1, "limit": 2, "offset": 0, "next_cursor": "abc"}
        )

    with make_client(handler) as client:
        page = client.list_memories(tags=["a", "b"], cursor="xyz", limit=2)
    assert captured["tags"] == "a,b"
    assert captured["cursor"] == "xyz"
    assert page.next_cursor == "abc"


def test_resolve_contradiction():
    contra = {
        "id": str(uuid.uuid4()),
        "namespace": "default",
        "new_memory_id": str(uuid.uuid4()),
        "existing_memory_id": str(uuid.uuid4()),
        "similarity": 0.88,
        "reason": "negation",
        "status": "resolved",
        "resolved_winner_id": str(uuid.uuid4()),
        "created_at": "2026-01-01T00:00:00Z",
        "resolved_at": "2026-01-02T00:00:00Z",
    }
    with make_client(
        route_handler({("POST", "/v1/contradictions/resolve"): contra})
    ) as client:
        resolved = client.resolve_contradiction(contra["id"], winner_memory_id=contra["resolved_winner_id"])
    assert resolved.status == "resolved"
    assert resolved.resolved_at is not None
