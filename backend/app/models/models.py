"""SQLAlchemy ORM models (2.0 ``Mapped[]`` style)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.session import Base


class Memory(Base):
    """A single memory row.

    Memories are never hard-deleted: ``is_active=False`` is a
    soft delete so the contradiction audit trail is preserved.
    """

    __tablename__ = "memories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    namespace: Mapped[str] = mapped_column(String(128), nullable=False, default="default")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    importance: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    embedding: Mapped[list[float]] = mapped_column(
        Vector(settings.embedding_dim), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Tags filter with the overlap operator; the ORM attribute must be `meta`
    # because `metadata` is reserved by SQLAlchemy's declarative API — the
    # column and the JSON API field are still named "metadata".
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), nullable=False, default=list, server_default=text("'{}'")
    )
    meta: Mapped[dict[str, object]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        # Every query filters by namespace; index the common access path.
        Index("ix_memories_namespace_active", "namespace", "is_active"),
        # Tags overlap (`&&`) filtering.
        Index("ix_memories_tags", "tags", postgresql_using="gin"),
    )


class NamespaceRow(Base):
    """Optional per-namespace configuration row.

    Namespaces are implicit (any string is a tenant key); a row here exists to
    hold scoring overrides and administration metadata. Every override column
    is NULL = use the global setting.
    """

    __tablename__ = "namespaces"

    name: Mapped[str] = mapped_column(String(128), primary_key=True)
    decay_half_life_days: Mapped[float | None] = mapped_column(Float, nullable=True)
    decay_floor: Mapped[float | None] = mapped_column(Float, nullable=True)
    contradiction_sim_threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ApiKey(Base):
    """An issued API key, stored hashed.

    The plaintext secret is shown exactly once at creation. Only the SHA-256
    hash and a short display prefix live in the database, so a database leak
    does not leak usable credentials.
    """

    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    # First few characters of the plaintext, e.g. "mnemo_a1b2" — lets operators
    # tell keys apart without storing the secret.
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    # "read" (GET routes), "write" (create/update/delete), "admin" (keys + events).
    scopes: Mapped[list[str]] = mapped_column(
        ARRAY(String(32)), nullable=False, default=lambda: ["read", "write"]
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Contradiction(Base):
    """A flagged (not resolved) contradiction between two memories.

    ``new_memory`` is the incoming memory whose insertion triggered the flag;
    ``existing_memory`` is the memory it appears to contradict. Resolution
    records which side won and soft-deletes the loser.
    """

    __tablename__ = "contradictions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    namespace: Mapped[str] = mapped_column(String(128), nullable=False)
    new_memory_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("memories.id"), nullable=False
    )
    existing_memory_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("memories.id"), nullable=False
    )
    similarity: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    # "open" until resolved; then "resolved".
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    # Which memory id won, once resolved (NULL while open).
    resolved_winner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("memories.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    new_memory: Mapped[Memory] = relationship(
        Memory, foreign_keys=[new_memory_id], lazy="joined"
    )
    existing_memory: Mapped[Memory] = relationship(
        Memory, foreign_keys=[existing_memory_id], lazy="joined"
    )

    __table_args__ = (
        Index("ix_contradictions_namespace_status", "namespace", "status"),
    )
