"""Shared response parsing for the Mnemo SDK.

Both the sync and async clients consume these converters; they turn plain JSON
dicts into the typed models in ``mnemo.models`` and map HTTP failures to the
typed errors in ``mnemo.errors``.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from .errors import (
    AuthenticationError,
    ConflictError,
    ForbiddenError,
    MnemoError,
    NotFoundError,
    RateLimitError,
    ServerError,
    ValidationError,
)

if TYPE_CHECKING:
    from .models import Contradiction, Memory, SearchHit


def parse_datetime(value: object) -> datetime | None:
    if value is None:
        return None
    return datetime.fromisoformat(str(value))


def _uid(value: object) -> uuid.UUID:
    return uuid.UUID(str(value))


def parse_memory(data: Any) -> "Memory":
    from .models import Memory

    return Memory(
        id=_uid(data["id"]),
        namespace=data["namespace"],
        content=data["content"],
        importance=int(data["importance"]),
        is_active=bool(data["is_active"]),
        tags=list(data.get("tags") or []),
        metadata=dict(data.get("metadata") or {}),
        created_at=parse_datetime(data.get("created_at")),
        updated_at=parse_datetime(data.get("updated_at")),
        expires_at=parse_datetime(data.get("expires_at")),
    )


def parse_contradiction(data: Any) -> "Contradiction":
    from .models import Contradiction

    return Contradiction(
        id=_uid(data["id"]),
        namespace=data["namespace"],
        new_memory_id=_uid(data["new_memory_id"]),
        existing_memory_id=_uid(data["existing_memory_id"]),
        similarity=float(data["similarity"]),
        reason=data["reason"],
        status=data["status"],
        resolved_winner_id=_uid(data["resolved_winner_id"]) if data.get("resolved_winner_id") else None,
        created_at=parse_datetime(data.get("created_at")),
        resolved_at=parse_datetime(data.get("resolved_at")),
    )


def parse_search_hit(data: Any) -> "SearchHit":
    from .models import SearchHit

    memory_data = data.get("memory", data)
    similarity = float(data.get("similarity", 0.0))
    relevance = float(data.get("relevance_score", data.get("score", similarity)))
    age = float(data.get("age_days", 0.0))
    hit = SearchHit(
        memory=parse_memory(memory_data),
        similarity=similarity,
        relevance_score=relevance,
        age_days=age,
    )
    return hit


def raise_for_status(status: int, body: dict[str, Any], request_id: str | None) -> None:
    """Map an HTTP status to a typed error; returns silently on 2xx."""
    if 200 <= status < 300:
        return
    detail = str(body.get("detail", body.get("message", f"HTTP {status}")))

    if status == 401:
        raise AuthenticationError(detail, status=status, request_id=request_id)
    if status == 403:
        raise ForbiddenError(detail, status=status, request_id=request_id)
    if status == 404:
        raise NotFoundError(detail, status=status, request_id=request_id)
    if status == 409:
        raise ConflictError(detail, status=status, request_id=request_id)
    if status == 422:
        raise ValidationError(detail, status=status, request_id=request_id)
    if status == 429:
        retry_after = body.get("retry_after")
        raise RateLimitError(
            detail,
            retry_after=float(retry_after) if retry_after is not None else None,
            status=status,
            request_id=request_id,
        )
    if status >= 500:
        raise ServerError(detail, status=status, request_id=request_id)
    raise MnemoError(detail, status=status, request_id=request_id)
