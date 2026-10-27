"""Add a generated tsvector column for hybrid (keyword + vector) search.

The column is GENERATED ALWAYS from the content, so writes need no trigger and
content updates re-index automatically. A GIN index serves the @@ operator.
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0008_memories_tsvector"
down_revision = "0007_audit_log"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "memories",
        sa.Column(
            "tsv",
            postgresql.TSVECTOR(),
            sa.Computed("to_tsvector('english', content)", persisted=True),
            nullable=True,
        ),
    )
    op.create_index("ix_memories_tsv", "memories", ["tsv"], postgresql_using="gin")


def downgrade() -> None:
    op.drop_index("ix_memories_tsv", table_name="memories")
    op.drop_column("memories", "tsv")
