"""Pydantic v2 request/response schemas.

API responses always go through these schemas — routes never return raw ORM
objects.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------------- #
# Memories
# --------------------------------------------------------------------------- #
class MemoryCreate(BaseModel):
    """Payload for adding a memory."""

    content: str = Field(..., min_length=1, description="The memory text.")
    namespace: str = Field(default="default", min_length=1, max_length=128)
    importance: int = Field(default=3, ge=1, le=5, description="1 (low) to 5 (high).")


class MemoryOut(BaseModel):
    """A memory as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    namespace: str
    content: str
    importance: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MemoryList(BaseModel):
    """Paginated list of memories."""

    items: list[MemoryOut]
    total: int
    limit: int
    offset: int


class MemoryCreateResult(BaseModel):
    """Result of adding a memory, including any freshly flagged contradictions."""

    memory: MemoryOut
    contradictions: list["ContradictionOut"] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Search
# --------------------------------------------------------------------------- #
class SearchRequest(BaseModel):
    """Semantic search request."""

    query: str = Field(..., min_length=1)
    namespace: str = Field(default="default", min_length=1, max_length=128)
    limit: int = Field(default=10, ge=1, le=100)


class SearchHit(BaseModel):
    """A single search result.

    ``similarity`` (raw cosine) and ``relevance_score`` (decay/importance
    applied) are surfaced separately so it's clear the scoring is doing more than
    raw vector match.
    """

    model_config = ConfigDict(from_attributes=True)

    memory: MemoryOut
    similarity: float
    relevance_score: float
    age_days: float


class SearchResponse(BaseModel):
    """Ranked search results."""

    query: str
    namespace: str
    hits: list[SearchHit]


# --------------------------------------------------------------------------- #
# Contradictions
# --------------------------------------------------------------------------- #
class ContradictionOut(BaseModel):
    """A flagged contradiction, with both sides inlined."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    namespace: str
    similarity: float
    reason: str
    status: str
    new_memory: MemoryOut
    existing_memory: MemoryOut
    resolved_winner_id: uuid.UUID | None
    created_at: datetime
    resolved_at: datetime | None


class ContradictionList(BaseModel):
    """List of contradictions."""

    items: list[ContradictionOut]
    total: int


class ResolveRequest(BaseModel):
    """Resolve a contradiction by naming the winning memory.

    The winner must be one of the two memories in the contradiction. The loser
    is soft-deleted (``is_active=False``).
    """

    contradiction_id: uuid.UUID
    winner_memory_id: uuid.UUID


# --------------------------------------------------------------------------- #
# Namespace administration
# --------------------------------------------------------------------------- #
class MemoryExportItem(BaseModel):
    """One memory in a namespace export.

    Embeddings are intentionally omitted. The text is the source of truth and
    is re-embedded on import, which keeps a backup portable across models.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    content: str
    importance: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ContradictionExportItem(BaseModel):
    """One contradiction in a namespace export, including its audit state."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    new_memory_id: uuid.UUID
    existing_memory_id: uuid.UUID
    similarity: float
    reason: str
    status: str
    resolved_winner_id: uuid.UUID | None
    created_at: datetime
    resolved_at: datetime | None


class MemoryExport(BaseModel):
    """Portable snapshot of a namespace."""

    version: int = 1
    namespace: str
    exported_at: datetime
    memories: list[MemoryExportItem]
    contradictions: list[ContradictionExportItem] = Field(default_factory=list)


class ImportanceCount(BaseModel):
    """How many memories carry one importance value."""

    importance: int
    count: int


class NamespaceStats(BaseModel):
    """Aggregate counts for one namespace."""

    namespace: str
    total_memories: int
    active_memories: int
    inactive_memories: int
    open_contradictions: int
    resolved_contradictions: int
    average_importance: float | None
    oldest_memory_at: datetime | None
    newest_memory_at: datetime | None
    importance_counts: list[ImportanceCount]


# Rebuild forward reference (MemoryCreateResult -> ContradictionOut).
MemoryCreateResult.model_rebuild()
