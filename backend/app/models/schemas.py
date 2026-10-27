"""Pydantic v2 request/response schemas.

API responses always go through these schemas — routes never return raw ORM
objects.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

# A tag is a short identifier; strip whitespace so "work " == "work".
Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]


# --------------------------------------------------------------------------- #
# Memories
# --------------------------------------------------------------------------- #
class MemoryCreate(BaseModel):
    """Payload for adding a memory."""

    model_config = ConfigDict(populate_by_name=True)

    content: str = Field(..., min_length=1, description="The memory text.")
    namespace: str = Field(default="default", min_length=1, max_length=128)
    importance: int = Field(default=3, ge=1, le=5, description="1 (low) to 5 (high).")
    tags: list[Tag] = Field(default_factory=list, max_length=10)
    # JSON attribute is `meta` (SQLAlchemy reserves `metadata`); the API field
    # is "metadata" via the alias.
    meta: dict[str, Any] = Field(default_factory=dict, alias="metadata")
    expires_at: datetime | None = Field(
        default=None, description="Optional TTL; the sweep soft-deletes expired memories."
    )


class MemoryOut(BaseModel):
    """A memory as returned by the API."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    namespace: str
    content: str
    importance: int
    is_active: bool
    tags: list[str] = Field(default_factory=list)
    # ORM attribute is `meta`; JSON field is `metadata`. AliasChoices makes ORM
    # validation (from_attributes) resolve `meta` first — resolving `metadata`
    # first would pick up SQLAlchemy's reserved MetaData collection instead.
    meta: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias=AliasChoices("meta", "metadata"),
        serialization_alias="metadata",
    )
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class MemoryUpdate(BaseModel):
    """Payload for partially updating a memory.

    At least one field must be present. A content change is re-embedded and
    re-checked for contradictions; an importance change only re-ranks it.
    Tags and metadata are replaced wholesale when provided.
    """

    model_config = ConfigDict(populate_by_name=True)

    content: str | None = Field(default=None, min_length=1)
    importance: int | None = Field(default=None, ge=1, le=5)
    tags: list[Tag] | None = Field(default=None, max_length=10)
    meta: dict[str, Any] | None = Field(default=None, alias="metadata")
    expires_at: datetime | None = Field(default=None)

    @model_validator(mode="after")
    def require_a_change(self) -> "MemoryUpdate":
        if (
            self.content is None
            and self.importance is None
            and self.tags is None
            and self.meta is None
            and self.expires_at is None
            and "expires_at" not in self.model_fields_set
        ):
            raise ValueError(
                "At least one of 'content', 'importance', 'tags', 'metadata' or "
                "'expires_at' must be provided."
            )
        return self


class MemoryList(BaseModel):
    """Paginated list of memories."""

    items: list[MemoryOut]
    total: int
    limit: int
    offset: int
    # Set only with cursor pagination: pass it back as ?cursor= for the next page.
    next_cursor: str | None = None


class MemoryCreateResult(BaseModel):
    """Result of adding a memory, including any freshly flagged contradictions."""

    memory: MemoryOut
    contradictions: list["ContradictionOut"] = Field(default_factory=list)


class BulkMemoryRequest(BaseModel):
    """Payload for adding many memories in one call."""

    items: list[MemoryCreate] = Field(..., min_length=1, max_length=100)


class BulkMemoryResultItem(BaseModel):
    """Per-item outcome of a bulk add. Items are independent: one failing item
    never rolls back the others."""

    index: int
    status: str  # "created" or "error"
    memory: MemoryOut | None = None
    contradictions: list["ContradictionOut"] = Field(default_factory=list)
    error: str | None = None


class BulkMemoryResult(BaseModel):
    """Aggregate result of a bulk add."""

    created: int
    errors: int
    results: list[BulkMemoryResultItem]


# --------------------------------------------------------------------------- #
# Search
# --------------------------------------------------------------------------- #
class SearchRequest(BaseModel):
    """Semantic search request."""

    query: str = Field(..., min_length=1)
    namespace: str = Field(default="default", min_length=1, max_length=128)
    limit: int = Field(default=10, ge=1, le=100)
    # When set, only memories carrying ANY of these tags are considered.
    tags: list[Tag] = Field(default_factory=list, max_length=5)
    # Per-query override of KEYWORD_WEIGHT (0 disables the keyword boost).
    keyword_weight: float | None = Field(default=None, ge=0, le=1)


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
    """Paginated list of contradictions."""

    items: list[ContradictionOut]
    total: int
    limit: int
    offset: int
    next_cursor: str | None = None


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

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    content: str
    importance: int
    is_active: bool
    tags: list[str] = Field(default_factory=list)
    meta: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias=AliasChoices("meta", "metadata"),
        serialization_alias="metadata",
    )
    expires_at: datetime | None = None
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


class NamespaceCreate(BaseModel):
    """Create a namespace row with optional scoring overrides."""

    name: str = Field(..., min_length=1, max_length=128, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")
    decay_half_life_days: float | None = Field(default=None, gt=0)
    decay_floor: float | None = Field(default=None, gt=0, le=1)
    contradiction_sim_threshold: float | None = Field(default=None, gt=0, le=1)


class NamespaceUpdate(BaseModel):
    """Partial update. Explicit ``null`` resets an override to the global setting."""

    decay_half_life_days: float | None = Field(default=None, gt=0)
    decay_floor: float | None = Field(default=None, gt=0, le=1)
    contradiction_sim_threshold: float | None = Field(default=None, gt=0, le=1)


class NamespaceOut(BaseModel):
    """A namespace row with its overrides and total memory count."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    decay_half_life_days: float | None
    decay_floor: float | None
    contradiction_sim_threshold: float | None
    created_at: datetime
    total_memories: int = 0


class NamespaceList(BaseModel):
    """All configured namespaces."""

    items: list[NamespaceOut]
    total: int


# --------------------------------------------------------------------------- #
# API keys
# --------------------------------------------------------------------------- #
class ApiKeyCreate(BaseModel):
    """Create an issued key. Scopes: read (GET), write (mutations), admin."""

    label: str = Field(..., min_length=1, max_length=64)
    scopes: list[Literal["read", "write", "admin"]] = Field(
        default=["read", "write"],
    )
    # Per-key override of the global requests/minute budget.
    rate_limit_per_minute: int | None = Field(default=None, ge=1, le=10_000)


class ApiKeyOut(BaseModel):
    """An issued key as safe to display (prefix only, never the secret)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None
    rate_limit_per_minute: int | None


class ApiKeyCreated(ApiKeyOut):
    """The one response that contains the plaintext key: ``key`` is shown once."""

    key: str


class ApiKeyList(BaseModel):
    """All issued keys."""

    items: list[ApiKeyOut]
    total: int


# --------------------------------------------------------------------------- #
# Audit events
# --------------------------------------------------------------------------- #
class AuditEventOut(BaseModel):
    """One audit-trail entry."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    namespace: str | None
    action: str
    resource_type: str
    resource_id: uuid.UUID | None
    actor_key_id: uuid.UUID | None
    request_id: str | None
    details: dict[str, Any]
    created_at: datetime


class AuditEventList(BaseModel):
    """Paginated audit trail (newest first)."""

    items: list[AuditEventOut]
    total: int
    limit: int
    offset: int


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
BulkMemoryResultItem.model_rebuild()
