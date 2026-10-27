"""Cursor pagination helpers.

An opaque cursor is ``(created_at, id)`` base64url-encoded as JSON. Keyset
pagination needs a total order, so every cursor-paginated query orders by
``(created_at, id)`` — the id breaks ties so pages never repeat or skip rows.

The classic limit/offset parameters keep working; cursors are additive.
"""

from __future__ import annotations

import base64
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import tuple_
from sqlalchemy.orm import Session

from app.models.models import Contradiction, Memory


def encode_cursor(created_at: datetime, row_id: uuid.UUID) -> str:
    """Encode a page boundary. Opaque to clients; stable across deploys."""
    payload = json.dumps([created_at.isoformat(), str(row_id)])
    return base64.urlsafe_b64encode(payload.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    """Inverse of :func:`encode_cursor`. Raises ValueError on bad input."""
    try:
        created_at_raw, row_id_raw = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        created_at = datetime.fromisoformat(created_at_raw)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        return created_at, uuid.UUID(row_id_raw)
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid cursor.") from exc


def _cursor_condition(model: type[Memory] | type[Contradiction], cursor: str) -> Any:
    created_at, row_id = decode_cursor(cursor)
    anchor = tuple_(model.created_at, model.id)  # type: ignore[arg-type]
    return anchor < tuple_(created_at, row_id)  # type: ignore[arg-type]


def _page(
    db: Session,
    model: type[Memory] | type[Contradiction],
    *,
    conditions: list[Any],
    limit: int,
    cursor: str | None,
) -> tuple[list[Any], str | None]:
    """Shared keyset-page plumbing: fetch limit+1 rows, emit next cursor when full."""
    all_conditions = list(conditions)
    if cursor is not None:
        all_conditions.append(_cursor_condition(model, cursor))

    rows = (
        db.execute(
            model_query(model)
            .where(*all_conditions)
            .order_by(model.created_at.desc(), model.id.desc())
            .limit(limit + 1)
        )
        .scalars()
        .all()
    )
    has_more = len(rows) > limit
    page = list(rows[:limit])
    next_cursor = encode_cursor(page[-1].created_at, page[-1].id) if has_more and page else None
    return page, next_cursor


def model_query(model: type[Memory] | type[Contradiction]) -> Any:
    from sqlalchemy import select

    return select(model)


def list_memories_page(
    db: Session,
    *,
    namespace: str,
    limit: int,
    cursor: str | None = None,
    include_inactive: bool = False,
    tags: list[str] | None = None,
) -> tuple[list[Memory], str | None]:
    """One page of memories after ``cursor`` (newest first) + next cursor."""
    from app.services.memory_service import _not_expired, _tag_condition

    conditions: list[Any] = [Memory.namespace == namespace]
    if not include_inactive:
        conditions.append(Memory.is_active.is_(True))
        conditions.append(_not_expired())
    _tag_condition(conditions, tags)
    return _page(db, Memory, conditions=conditions, limit=limit, cursor=cursor)


def list_contradictions_page(
    db: Session,
    *,
    namespace: str,
    limit: int,
    cursor: str | None = None,
    status: str | None = "open",
) -> tuple[list[Contradiction], str | None]:
    """One page of contradictions after ``cursor`` (newest first) + next cursor."""
    conditions: list[Any] = [Contradiction.namespace == namespace]
    if status is not None:
        conditions.append(Contradiction.status == status)
    return _page(db, Contradiction, conditions=conditions, limit=limit, cursor=cursor)
