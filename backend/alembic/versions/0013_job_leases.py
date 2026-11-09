"""Recover abandoned outbox jobs and fence stale workers."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0013_job_leases"
down_revision = "0012_contradiction_unique_pair"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("lease_token", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("jobs", sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "lease_expires_at")
    op.drop_column("jobs", "lease_token")
