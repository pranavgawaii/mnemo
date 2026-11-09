"""Index recognized assertions without rewriting any stored source content."""

import sqlalchemy as sa

from alembic import context, op
from app.core.assertions_v1 import parse_assertion

revision = "0015_memory_assertions"
down_revision = "0014_key_namespace_grants"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if context.is_offline_mode():
        raise RuntimeError("Migration 0015 requires an online connection for the versioned assertion backfill.")
    for name, length in [("fact_subject", 128), ("fact_attribute", 64), ("fact_value", 256)]:
        op.add_column("memories", sa.Column(name, sa.String(length), nullable=True))
    if not context.is_offline_mode():
        connection = op.get_bind()
        # Page by UUID so a large corpus does not get buffered in memory.
        cursor = None
        while True:
            rows = connection.execute(sa.text(
                "SELECT id, content FROM memories "
                + ("WHERE id > :cursor " if cursor else "")
                + "ORDER BY id LIMIT 500"
            ), {"cursor": cursor} if cursor else {}).all()
            if not rows:
                break
            updates = []
            for memory_id, content in rows:
                fact = parse_assertion(content)
                if fact:
                    updates.append({"id": memory_id, "subject": fact.subject,
                                    "attribute": fact.attribute, "value": fact.value})
            if updates:
                connection.execute(sa.text(
                    "UPDATE memories SET fact_subject=:subject, fact_attribute=:attribute, fact_value=:value WHERE id=:id"
                ), updates)
            cursor = rows[-1].id
    op.create_index("ix_memories_fact_lookup", "memories", ["namespace", "fact_subject", "fact_attribute"],
                    postgresql_where=sa.text("is_active IS TRUE AND fact_subject IS NOT NULL"))


def downgrade() -> None:
    op.drop_index("ix_memories_fact_lookup", table_name="memories")
    for name in ("fact_value", "fact_attribute", "fact_subject"):
        op.drop_column("memories", name)
