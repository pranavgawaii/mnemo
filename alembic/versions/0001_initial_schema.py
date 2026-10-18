"""initial schema: pgvector extension, memories, contradictions

Revision ID: 0001
Revises:
Create Date: 2026-07-17

NOTE: The Vector(384) dimension here MUST match EMBEDDING_DIM in app/core/config.py
and the embedding model (all-MiniLM-L6-v2 -> 384). If you change the model, change
both.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMBEDDING_DIM = 384


def upgrade() -> None:
    # pgvector extension must exist before any Vector column is created.
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "memories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("namespace", sa.String(length=128), nullable=False, server_default="default"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("importance", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_memories_namespace_active", "memories", ["namespace", "is_active"]
    )
    # HNSW index for cosine similarity search over embeddings.
    op.execute(
        "CREATE INDEX ix_memories_embedding_hnsw ON memories "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    op.create_table(
        "contradictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("namespace", sa.String(length=128), nullable=False),
        sa.Column("new_memory_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("existing_memory_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("similarity", sa.Float(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("resolved_winner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["new_memory_id"], ["memories.id"]),
        sa.ForeignKeyConstraint(["existing_memory_id"], ["memories.id"]),
        sa.ForeignKeyConstraint(["resolved_winner_id"], ["memories.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contradictions_namespace_status", "contradictions", ["namespace", "status"]
    )


def downgrade() -> None:
    op.drop_index("ix_contradictions_namespace_status", table_name="contradictions")
    op.drop_table("contradictions")
    op.execute("DROP INDEX IF EXISTS ix_memories_embedding_hnsw")
    op.drop_index("ix_memories_namespace_active", table_name="memories")
    op.drop_table("memories")
