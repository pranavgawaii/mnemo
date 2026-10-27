"""Add tags and metadata to memories.

Tags are a string array (filtered with the ``&&`` overlap operator); metadata
is a free-form JSONB dict. Both default to empty so the migration is instant
on any table size, even though it rewrites the table for the defaults.
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0002_memory_tags_metadata"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "memories",
        sa.Column("tags", postgresql.ARRAY(sa.String(64)), nullable=False, server_default=sa.text("'{}'")),
    )
    op.add_column(
        "memories",
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    # Overlap queries (`tags && ARRAY[...]`) want a GIN index.
    op.create_index("ix_memories_tags", "memories", ["tags"], postgresql_using="gin")


def downgrade() -> None:
    op.drop_index("ix_memories_tags", table_name="memories")
    op.drop_column("memories", "metadata")
    op.drop_column("memories", "tags")
