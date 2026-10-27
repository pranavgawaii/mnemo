"""Append-only audit log of every mutation.

Rows are written in the same transaction as the change they describe, so the
audit trail is exactly as durable as the data itself. Actions use
``<resource>.<verb>`` naming: ``memory.created``, ``memory.updated``,
``memory.deleted`` (soft), ``memory.swept``, ``contradiction.flagged``,
``contradiction.resolved``, ``api_key.created``, ``api_key.rotated``,
``api_key.revoked``, ``namespace.imported``.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from app.models.models import AuditLog


def record(
    db: Session,
    *,
    action: str,
    resource_type: str,
    namespace: str | None = None,
    resource_id: uuid.UUID | None = None,
    actor_key_id: uuid.UUID | None = None,
    request_id: str | None = None,
    details: dict[str, object] | None = None,
) -> AuditLog:
    """Add one audit row to the current transaction (caller commits)."""
    entry = AuditLog(
        namespace=namespace,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        actor_key_id=actor_key_id,
        request_id=request_id,
        details=details or {},
    )
    db.add(entry)
    db.flush()
    return entry


def list_events(
    db: Session,
    *,
    namespace: str | None = None,
    resource_type: str | None = None,
    action: str | None = None,
    limit: int,
    offset: int,
) -> tuple[list[AuditLog], int]:
    """Page through the audit trail, newest first."""
    conditions: list[ColumnElement[bool]] = []
    if namespace is not None:
        conditions.append(AuditLog.namespace == namespace)
    if resource_type is not None:
        conditions.append(AuditLog.resource_type == resource_type)
    if action is not None:
        conditions.append(AuditLog.action == action)


    total = db.scalar(select(func.count()).select_from(AuditLog).where(*conditions))
    rows = (
        db.execute(
            select(AuditLog)
            .where(*conditions)
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    return list(rows), int(total or 0)
