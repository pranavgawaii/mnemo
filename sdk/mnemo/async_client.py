"""Async Mnemo client.

Mirrors the sync client method-for-method; the bodies differ in `await` (and
Python has no shared way to abstract that), so this file is intentionally
explicit rather than clever. Parsing, errors and the retry policy are shared.
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Any

import httpx

from ._parsing import parse_contradiction, parse_memory, parse_search_hit, raise_for_status
from ._retry import attempts_allowed, delay_for, should_retry
from .models import Contradiction, ContradictionList, Memory, MemoryList, SearchResponse


class AsyncMnemoClient:
    """Async twin of :class:`mnemo.MnemoClient`.

    Example::

        async with AsyncMnemoClient(base_url="https://mnemo.internal", api_key="mnemo_...") as client:
            await client.add_memory("Prefers dark mode", importance=2)
            response = await client.search("theme preference")
    """

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        timeout: float = 30.0,
        default_namespace: str = "default",
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.default_namespace = default_namespace
        headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        self._client = httpx.AsyncClient(
            base_url=self.base_url, headers=headers, timeout=timeout, transport=transport
        )

    async def __aenter__(self) -> "AsyncMnemoClient":
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, path: str, *, json_body: Any | None = None, params: dict[str, Any] | None = None) -> Any:
        for attempt in range(1, attempts_allowed() + 1):
            try:
                return await self._send(method, path, json_body=json_body, params=params)
            except Exception as exc:
                if attempt >= attempts_allowed() or not should_retry(method, exc):
                    raise
                await asyncio.sleep(delay_for(attempt, exc))
        raise AssertionError("unreachable")  # pragma: no cover

    async def _send(self, method: str, path: str, *, json_body: Any | None = None, params: dict[str, Any] | None = None) -> Any:
        response = await self._client.request(method, path, json=json_body, params=params)
        request_id = response.headers.get("X-Request-ID")
        if response.status_code >= 400 or not response.content:
            try:
                body = response.json() if response.content else {}
            except ValueError:
                body = {"detail": response.text}
            raise_for_status(response.status_code, body, request_id)
        return response.json()

    # -- memories ---------------------------------------------------------------
    async def add_memory(
        self,
        content: str,
        *,
        namespace: str | None = None,
        importance: int = 3,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        expires_at: str | None = None,
    ) -> tuple[Memory, list[Contradiction]]:
        namespace = namespace or self.default_namespace
        body = await self._request(
            "POST",
            "/v1/memories",
            json_body={
                "content": content,
                "namespace": namespace,
                "importance": importance,
                "tags": tags or [],
                "metadata": metadata or {},
                **({"expires_at": expires_at} if expires_at else {}),
            },
        )
        return (
            parse_memory(body["memory"]),
            [parse_contradiction(c) for c in body.get("contradictions", [])],
        )

    async def add_memories(
        self, contents: list[str], *, namespace: str | None = None, importance: int = 3
    ) -> dict[str, int]:
        namespace = namespace or self.default_namespace
        payload = {
            "items": [
                {"content": content, "namespace": namespace, "importance": importance}
                for content in contents
            ]
        }
        body = await self._request("POST", "/v1/memories/bulk", json_body=payload)
        return {"created": int(body["created"]), "errors": int(body["errors"])}

    async def search(
        self,
        query: str,
        *,
        namespace: str | None = None,
        limit: int = 10,
        tags: list[str] | None = None,
        keyword_weight: float | None = None,
        diversity: float = 0.0,
    ) -> SearchResponse:
        namespace = namespace or self.default_namespace
        payload = {
            "query": query,
            "namespace": namespace,
            "limit": limit,
            "diversity": diversity,
            **({"tags": tags} if tags else {}),
            **({"keyword_weight": keyword_weight} if keyword_weight is not None else {}),
        }
        data = await self._request("POST", "/v1/memories/search", json_body=payload)
        hits = [parse_search_hit(hit) for hit in data.get("hits", [])]
        return SearchResponse(
            hits=hits,
            total_memories=data.get("total_memories"),
            returned=data.get("returned"),
            top_similarity=data.get("top_similarity"),
        )

    async def list_memories(
        self,
        *,
        namespace: str | None = None,
        limit: int = 20,
        offset: int = 0,
        tags: list[str] | None = None,
        cursor: str | None = None,
    ) -> MemoryList:
        namespace = namespace or self.default_namespace
        params: dict[str, Any] = {"namespace": namespace, "limit": limit, "offset": offset}
        if tags:
            params["tags"] = ",".join(tags)
        if cursor:
            params["cursor"] = cursor
        data = await self._request("GET", "/v1/memories", params=params)
        return MemoryList(
            items=[parse_memory(m) for m in data["items"]],
            total=int(data["total"]),
            limit=int(data["limit"]),
            offset=int(data["offset"]),
            next_cursor=data.get("next_cursor"),
        )

    async def get_memory(self, memory_id: uuid.UUID | str, *, namespace: str | None = None) -> Memory:
        params = {"namespace": namespace} if namespace else {}
        return parse_memory(await self._request("GET", f"/v1/memories/{memory_id}", params=params))

    async def update_memory(
        self,
        memory_id: uuid.UUID | str,
        *,
        namespace: str | None = None,
        content: str | None = None,
        importance: int | None = None,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        expires_at: str | None = None,
    ) -> Memory:
        payload: dict[str, Any] = {}
        if content is not None:
            payload["content"] = content
        if importance is not None:
            payload["importance"] = importance
        if tags is not None:
            payload["tags"] = tags
        if metadata is not None:
            payload["metadata"] = metadata
        if expires_at is not None:
            payload["expires_at"] = expires_at
        params = {"namespace": namespace} if namespace else {}
        return parse_memory(
            await self._request("PATCH", f"/v1/memories/{memory_id}", json_body=payload, params=params)
        )

    async def delete_memory(self, memory_id: uuid.UUID | str, *, namespace: str | None = None) -> Memory:
        params = {"namespace": namespace} if namespace else {}
        return parse_memory(
            await self._request("DELETE", f"/v1/memories/{memory_id}", params=params)
        )

    # -- contradictions ---------------------------------------------------------
    async def list_contradictions(
        self,
        *,
        namespace: str | None = None,
        status: str | None = "open",
        limit: int = 20,
        offset: int = 0,
        cursor: str | None = None,
    ) -> ContradictionList:
        namespace = namespace or self.default_namespace
        params: dict[str, Any] = {"namespace": namespace, "limit": limit, "offset": offset}
        if status is not None:
            params["status"] = status
        if cursor:
            params["cursor"] = cursor
        data = await self._request("GET", "/v1/contradictions", params=params)
        return ContradictionList(
            items=[parse_contradiction(c) for c in data["items"]],
            total=int(data["total"]),
            limit=int(data["limit"]),
            offset=int(data["offset"]),
            next_cursor=data.get("next_cursor"),
        )

    async def resolve_contradiction(
        self, contradiction_id: uuid.UUID | str, *, winner_memory_id: uuid.UUID | str
    ) -> Contradiction:
        data = await self._request(
            "POST",
            "/v1/contradictions/resolve",
            json_body={
                "contradiction_id": str(contradiction_id),
                "winner_memory_id": str(winner_memory_id),
            },
        )
        return parse_contradiction(data)
