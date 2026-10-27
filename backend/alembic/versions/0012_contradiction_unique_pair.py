"""Make contradiction pairs unique (new_memory_id, existing_memory_id)."""

from __future__ import annotations

from alembic import op

revision = "0012_contradiction_unique_pair"
down_revision = "0011_webhooks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Two API workers PATCHing the same memory concurrently could each flag the
    # same pair; the unique index turns the second flag into a no-op.
    op.create_index(
        "uq_contradictions_pair",
        "contradictions",
        ["new_memory_id", "existing_memory_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_contradictions_pair", table_name="contradictions")
