"""Typed data models returned by the Mnemo SDK."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class Memory:
    """A memory as returned by the API."""

    id: uuid.UUID
    namespace: str
    content: str
    importance: int
    is_active: bool
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, object] = field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    expires_at: datetime | None = None


@dataclass(frozen=True)
class Contradiction:
    """A flagged contradiction between two memories."""

    id: uuid.UUID
    namespace: str
    new_memory_id: uuid.UUID
    existing_memory_id: uuid.UUID
    similarity: float
    reason: str
    status: str
    resolved_winner_id: uuid.UUID | None = None
    created_at: datetime | None = None
    resolved_at: datetime | None = None


@dataclass(frozen=True)
class SearchHit:
    """One search result: the memory plus its ranking evidence."""

    memory: Memory
    similarity: float
    relevance_score: float
    age_days: float


@dataclass(frozen=True)
class SearchResponse:
    """Hits plus the query stats echoed by the API."""

    hits: list[SearchHit]
    total_memories: int | None = None
    returned: int | None = None
    top_similarity: float | None = None


@dataclass(frozen=True)
class MemoryList:
    """A page of memories."""

    items: list[Memory]
    total: int
    limit: int
    offset: int
    next_cursor: str | None = None


@dataclass(frozen=True)
class ContradictionList:
    """A page of contradictions."""

    items: list[Contradiction]
    total: int
    limit: int
    offset: int
    next_cursor: str | None = None
