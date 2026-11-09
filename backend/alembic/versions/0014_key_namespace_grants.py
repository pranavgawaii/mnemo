"""Allow applications to restrict issued keys to named namespaces and expiry."""

import sqlalchemy as sa

from alembic import op

revision = "0014_key_namespace_grants"
down_revision = "0013_job_leases"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # NULL retains the access of existing keys; no data backfill or key rotation.
    op.add_column("api_keys", sa.Column("namespaces", sa.ARRAY(sa.String(128)), nullable=True))
    op.add_column("api_keys", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("api_keys", "expires_at")
    op.drop_column("api_keys", "namespaces")
