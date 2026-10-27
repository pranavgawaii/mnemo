"""Add rate limiting: per-key override column + fixed-window counters."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0005_rate_limiting"
down_revision = "0004_api_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("api_keys", sa.Column("rate_limit_per_minute", sa.Integer(), nullable=True))
    op.create_table(
        "rate_limit_counters",
        sa.Column("identity", sa.String(64), primary_key=True),
        sa.Column("window_start", sa.DateTime(timezone=True), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("rate_limit_counters")
    op.drop_column("api_keys", "rate_limit_per_minute")
