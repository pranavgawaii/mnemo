"""Add the namespaces configuration table.

Namespaces are implicit tenant keys; this optional row type stores per-namespace
scoring overrides (NULL = inherit the global setting).
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0003_namespaces_table"
down_revision = "0002_memory_tags_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "namespaces",
        sa.Column("name", sa.String(128), primary_key=True),
        sa.Column("decay_half_life_days", sa.Float(), nullable=True),
        sa.Column("decay_floor", sa.Float(), nullable=True),
        sa.Column("contradiction_sim_threshold", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("namespaces")
