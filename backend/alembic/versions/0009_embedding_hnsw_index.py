"""Add the HNSW ANN index on memories.embedding.

pgvector's hnsw access method (vector_cosine_ops) turns the vector scan into an
approximate nearest-neighbour search. The parameters are conservative defaults
(m=16, ef_construction=64); recall is primarily controlled at query time by
``hnsw.ef_search`` (app/core/config.py: ann_ef_search).

Note: this index only helps deployments running pgvector >= 0.5.0, which the
pinned Docker image (pgvector/pgvector:pg16) satisfies.
"""

from __future__ import annotations

from alembic import op

revision = "0009_embedding_hnsw_index"
down_revision = "0008_memories_tsvector"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_memories_embedding_hnsw",
        "memories",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
        postgresql_with={"m": 16, "ef_construction": 64},
    )


def downgrade() -> None:
    op.drop_index("ix_memories_embedding_hnsw", table_name="memories")
