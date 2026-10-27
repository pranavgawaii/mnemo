"""Add optional expiry (TTL) to memories.

``expires_at`` is a soft marker: on expiry the memory is soft-deleted
(``is_active=False``) by the sweep — never hard-deleted, consistent with the
audit-trail principle. Search and list exclude already-expired rows live so the
sweep only controls bookkeeping latency.
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0006_memory_expires_at"
down_revision = "0005_rate_limiting"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("memories", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    # Sweep query: partial index keeps it tiny.
    op.create_index(
        "ix_memories_expires_at",
        "memories",
        ["expires_at"],
        postgresql_where=sa.text("is_active"),
    )


def downgrade() -> None:
    op.drop_index("ix_memories_expires_at", table_name="memories")
    op.drop_column("memories", "expires_at")
