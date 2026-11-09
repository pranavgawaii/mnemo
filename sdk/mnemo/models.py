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
    current_statement: str | None = None


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


@dataclass(frozen=True)
class ContextCitation:
    """One complete selected statement, its original source and retrieval evidence."""

    citation: str
    memory_id: uuid.UUID
    text: str
    source_content: str
    used_current_statement: bool
    similarity: float
    relevance_score: float
    pending_review: bool


@dataclass(frozen=True)
class ContextDecision:
    memory_id: uuid.UUID
    rank: int
    reason: str
    citation: str | None = None


@dataclass(frozen=True)
class ContextResponse:
    """Bounded context and its selection trace; no generated answer is included.

    ``used_chars`` counts the context string only, including citation markup.
    It is not a tokenizer estimate or the size of the whole HTTP response.
    """

    query: str
    namespace: str
    status: str
    context: str
    citations: list[ContextCitation]
    decisions: list[ContextDecision]
    used_chars: int
    max_chars: int
    has_pending_review: bool
    candidate_count: int
