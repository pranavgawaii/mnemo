"""Memory persistence and retrieval logic.

Keeps the pgvector queries and contradiction-flagging flow out of the route
handlers. Every query filters by ``namespace`` — the tenant/bucket boundary.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contradiction import LlmCheck, check_contradiction
from app.core.decay import relevance_score
from app.core.embedding import embed
from app.models.models import Contradiction, Memory

# How many nearest neighbours to inspect for contradictions when adding.
_CONTRADICTION_CANDIDATES = 5
# How many nearest neighbours to pull before re-ranking by relevance in search.
_SEARCH_OVERFETCH = 4


def _age_days(created_at: datetime) -> float:
    """Age of a memory in days, from an aware ``created_at`` to now (UTC)."""
    now = datetime.now(timezone.utc)
    created = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
    return max(0.0, (now - created).total_seconds() / 86400.0)


def add_memory(
    db: Session,
    *,
    content: str,
    namespace: str,
    importance: int,
    llm_check: LlmCheck | None = None,
) -> tuple[Memory, list[Contradiction]]:
    """Embed and persist a memory, flagging any contradictions it introduces.

    Returns the created memory and the list of newly-flagged contradictions.
    Contradictions are flagged only — never auto-resolved.
    """
    vector = embed(content)
    memory = Memory(
        namespace=namespace,
        content=content,
        importance=importance,
        embedding=vector,
    )
    db.add(memory)
    db.flush()  # assign id / created_at without committing yet

    contradictions = _flag_contradictions(
        db, memory=memory, vector=vector, namespace=namespace, llm_check=llm_check
    )

    db.commit()
    db.refresh(memory)
    for c in contradictions:
        db.refresh(c)
    return memory, contradictions


def _flag_contradictions(
    db: Session,
    *,
    memory: Memory,
    vector: list[float],
    namespace: str,
    llm_check: LlmCheck | None,
) -> list[Contradiction]:
    """Compare a new memory against its nearest neighbours and flag conflicts."""
    distance = Memory.embedding.cosine_distance(vector)
    stmt = (
        select(Memory, distance.label("distance"))
        .where(
            Memory.namespace == namespace,
            Memory.is_active.is_(True),
            Memory.id != memory.id,
        )
        .order_by(distance)
        .limit(_CONTRADICTION_CANDIDATES)
    )

    flagged: list[Contradiction] = []
    for existing, dist in db.execute(stmt).all():
        similarity = 1.0 - float(dist)
        verdict = check_contradiction(
            memory.content, existing.content, similarity, llm_check=llm_check
        )
        if verdict.is_contradiction:
            contradiction = Contradiction(
                namespace=namespace,
                new_memory_id=memory.id,
                existing_memory_id=existing.id,
                similarity=verdict.similarity,
                reason=verdict.reason,
                status="open",
            )
            db.add(contradiction)
            flagged.append(contradiction)

    if flagged:
        db.flush()
    return flagged


def search(
    db: Session, *, query: str, namespace: str, limit: int
) -> list[tuple[Memory, float, float, float]]:
    """Semantic search, re-ranked by relevance (similarity * decay * importance).

    Returns tuples of ``(memory, similarity, relevance_score, age_days)`` sorted
    by ``relevance_score`` descending.
    """
    vector = embed(query)
    distance = Memory.embedding.cosine_distance(vector)

    # Over-fetch by raw vector distance, then re-rank by relevance so decay and
    # importance can reorder the head of the list.
    stmt = (
        select(Memory, distance.label("distance"))
        .where(Memory.namespace == namespace, Memory.is_active.is_(True))
        .order_by(distance)
        .limit(limit * _SEARCH_OVERFETCH)
    )

    scored: list[tuple[Memory, float, float, float]] = []
    for memory, dist in db.execute(stmt).all():
        similarity = 1.0 - float(dist)
        age = _age_days(memory.created_at)
        rel = relevance_score(similarity, age, memory.importance)
        scored.append((memory, similarity, rel, age))

    scored.sort(key=lambda row: row[2], reverse=True)
    return scored[:limit]


def list_memories(
    db: Session, *, namespace: str, limit: int, offset: int, include_inactive: bool = False
) -> tuple[list[Memory], int]:
    """Return a page of memories (newest first) and the total count."""
    conditions = [Memory.namespace == namespace]
    if not include_inactive:
        conditions.append(Memory.is_active.is_(True))

    total = db.scalar(
        select(func.count()).select_from(Memory).where(*conditions)
    )
    rows = db.execute(
        select(Memory)
        .where(*conditions)
        .order_by(Memory.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()
    return list(rows), int(total or 0)


def get_memory(
    db: Session, *, memory_id: uuid.UUID, namespace: str | None = None
) -> Memory | None:
    """Fetch a single memory by id (active or not).

    When ``namespace`` is provided the memory must belong to it; any mismatch
    returns ``None`` so the route can answer 404 without leaking the id.
    """
    memory = db.get(Memory, memory_id)
    if memory is None:
        return None
    if namespace is not None and memory.namespace != namespace:
        return None
    return memory


def soft_delete_memory(
    db: Session, *, memory_id: uuid.UUID, namespace: str | None = None
) -> Memory | None:
    """Soft-delete a memory (``is_active=False``). Never hard-deletes.

    Honours the same optional ``namespace`` scope as :func:`get_memory`.
    """
    memory = get_memory(db, memory_id=memory_id, namespace=namespace)
    if memory is None:
        return None
    memory.is_active = False
    db.commit()
    db.refresh(memory)
    return memory


def list_contradictions(
    db: Session, *, namespace: str, status: str | None = "open"
) -> tuple[list[Contradiction], int]:
    """List contradictions for a namespace, optionally filtered by status."""
    conditions = [Contradiction.namespace == namespace]
    if status is not None:
        conditions.append(Contradiction.status == status)

    total = db.scalar(
        select(func.count()).select_from(Contradiction).where(*conditions)
    )
    rows = db.execute(
        select(Contradiction)
        .where(*conditions)
        .order_by(Contradiction.created_at.desc())
    ).scalars().all()
    return list(rows), int(total or 0)


def resolve_contradiction(
    db: Session, *, contradiction_id: uuid.UUID, winner_memory_id: uuid.UUID
) -> tuple[Contradiction | None, str | None]:
    """Resolve a contradiction, soft-deleting the losing memory.

    Returns ``(contradiction, error)``. ``error`` is a human-readable message
    when resolution can't proceed (unknown id, already resolved, winner not part
    of the pair); ``contradiction`` is ``None`` in that case.
    """
    contradiction = db.get(Contradiction, contradiction_id)
    if contradiction is None:
        return None, "Contradiction not found."
    if contradiction.status != "open":
        return None, "Contradiction is already resolved."

    valid_ids = {contradiction.new_memory_id, contradiction.existing_memory_id}
    if winner_memory_id not in valid_ids:
        return None, "Winner must be one of the two memories in the contradiction."

    loser_id = (valid_ids - {winner_memory_id}).pop()
    loser = db.get(Memory, loser_id)
    if loser is not None:
        loser.is_active = False

    contradiction.status = "resolved"
    contradiction.resolved_winner_id = winner_memory_id
    contradiction.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(contradiction)
    return contradiction, None
