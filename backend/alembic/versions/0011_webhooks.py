"""Add the webhooks table."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0011_webhooks"
down_revision = "0010_jobs_outbox"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "webhooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("namespace", sa.String(128), nullable=False, index=True),
        sa.Column("url", sa.String(512), nullable=False),
        sa.Column("secret", sa.String(64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("webhooks")
