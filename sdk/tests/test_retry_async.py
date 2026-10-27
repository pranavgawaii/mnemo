"""Retry policy tests plus the async client, via httpx.MockTransport.

The async tests run on the anyio pytest plugin (a httpx dependency - no extra
install needed).
"""

from __future__ import annotations

import httpx
import pytest
from mnemo import AsyncMnemoClient
from mnemo._retry import delay_for, should_retry
from mnemo.errors import RateLimitError, ServerError

from .test_client import MEMORY, make_client


def test_retry_policy_only_gets():
    assert should_retry("GET", ServerError("x", status=503))
    assert should_retry("GET", ServerError("x", status=502))
    assert not should_retry("GET", ServerError("x", status=501))
    assert not should_retry("POST", ServerError("x", status=503))  # writes never retry
    assert not should_retry("PATCH", RateLimitError("x"))


def test_retry_honours_retry_after():
    exc = RateLimitError("slow down", retry_after=3.5)
    assert delay_for(1, exc) == 3.5
    plain = ServerError("x", status=500)
    assert delay_for(1, plain) == 0.2
    assert delay_for(2, plain) == 0.4


def test_sync_get_retries_then_succeeds():
    calls: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        if len(calls) < 2:
            return httpx.Response(500, json={"detail": "flaky"})
        return httpx.Response(
            200, json={"items": [MEMORY], "total": 1, "limit": 20, "offset": 0, "next_cursor": None}
        )

    with make_client(handler) as client:
        page = client.list_memories()
    assert page.total == 1
    assert len(calls) == 2


def test_post_never_retries():
    calls: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(503, json={"detail": "down"})

    with make_client(handler) as client:
        with pytest.raises(ServerError):
            client.add_memory("whatever")
    assert len(calls) == 1


def _async_memory() -> dict:
    return dict(MEMORY)


@pytest.mark.anyio
async def test_async_client_works():
    body = {
        "hits": [{"memory": _async_memory(), "similarity": 0.9, "relevance_score": 0.8, "age_days": 1.0}],
        "total_memories": 1,
        "returned": 1,
        "top_similarity": 0.9,
    }

    async with AsyncMnemoClient(
        base_url="http://testserver",
        api_key="test-key",
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json=body)),
    ) as client:
        response = await client.search("where does pranav live")
    assert response.hits[0].memory.content == MEMORY["content"]


@pytest.mark.anyio
async def test_async_retries_on_500():
    calls: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        if len(calls) < 3:
            return httpx.Response(502, json={"detail": "flaky"})
        return httpx.Response(
            200, json={"items": [], "total": 0, "limit": 20, "offset": 0, "next_cursor": None}
        )

    async with AsyncMnemoClient(
        base_url="http://testserver",
        api_key="test-key",
        transport=httpx.MockTransport(handler),
    ) as client:
        page = await client.list_memories()
    assert page.total == 0
    assert len(calls) == 3
