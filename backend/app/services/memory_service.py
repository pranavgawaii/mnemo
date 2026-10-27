"""Memory persistence and retrieval logic.

Keeps the pgvector queries and contradiction-flagging flow out of the route
handlers. Every query filters by ``namespace`` — the tenant/bucket boundary.
"""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.contradiction import LlmCheck, check_contradiction
from app.core.decay import relevance_score
from app.core.embedding import embed
from app.models.models import Contradiction, Memory
from app.models.schemas import MemoryExport
from app.services import namespace_service
from app.services.namespace_service import ScoringConfig

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
    tags: list[str] | None = None,
    meta: dict[str, object] | None = None,
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
        tags=tags or [],
        meta=meta or {},
    )
    db.add(memory)
    db.flush()  # assign id / created_at without committing yet

    scoring = namespace_service.resolve_scoring(db, namespace=namespace)
    contradictions = _flag_contradictions(
        db,
        memory=memory,
        vector=vector,
        namespace=namespace,
        llm_check=llm_check,
        scoring=scoring,
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
    scoring: ScoringConfig | None = None,
) -> list[Contradiction]:
    """Compare a new memory against its nearest neighbours and flag conflicts."""
    if scoring is None:
        scoring = namespace_service.resolve_scoring(db, namespace=namespace)
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

    # Never flag the same pair twice (for example when a memory's content is
    # updated and re-checked): keep the original audit entry.
    existing_pairs = {
        frozenset((new_id, existing_id))
        for new_id, existing_id in db.execute(
            select(Contradiction.new_memory_id, Contradiction.existing_memory_id).where(
                Contradiction.namespace == namespace,
                (Contradiction.new_memory_id == memory.id)
                | (Contradiction.existing_memory_id == memory.id),
            )
        ).all()
    }

    flagged: list[Contradiction] = []
    for existing, dist in db.execute(stmt).all():
        pair = frozenset((memory.id, existing.id))
        if pair in existing_pairs:
            continue

        similarity = 1.0 - float(dist)
        verdict = check_contradiction(
            memory.content,
            existing.content,
            similarity,
            sim_threshold=scoring.sim_threshold,
            llm_check=llm_check,
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
            existing_pairs.add(pair)
            flagged.append(contradiction)

    if flagged:
        db.flush()
    return flagged


def _tag_condition(condition: list[ColumnElement[bool]], tags: list[str] | None) -> None:
    """Append a tags-overlap filter to ``condition`` when tags are given."""
    if tags:
        condition.append(Memory.tags.overlap(list(tags)))


def search(
    db: Session,
    *,
    query: str,
    namespace: str,
    limit: int,
    tags: list[str] | None = None,
) -> list[tuple[Memory, float, float, float]]:
    """Semantic search, re-ranked by relevance (similarity * decay * importance).

    Returns tuples of ``(memory, similarity, relevance_score, age_days)`` sorted
    by ``relevance_score`` descending.
    """
    vector = embed(query)
    distance = Memory.embedding.cosine_distance(vector)

    conditions: list[ColumnElement[bool]] = [
        Memory.namespace == namespace,
        Memory.is_active.is_(True),
    ]
    _tag_condition(conditions, tags)

    # Over-fetch by raw vector distance, then re-rank by relevance so decay and
    # importance can reorder the head of the list.
    stmt = (
        select(Memory, distance.label("distance"))
        .where(*conditions)
        .order_by(distance)
        .limit(limit * _SEARCH_OVERFETCH)
    )

    scoring = namespace_service.resolve_scoring(db, namespace=namespace)
    scored: list[tuple[Memory, float, float, float]] = []
    for memory, dist in db.execute(stmt).all():
        similarity = 1.0 - float(dist)
        age = _age_days(memory.created_at)
        rel = relevance_score(
            similarity,
            age,
            memory.importance,
            half_life_days=scoring.half_life_days,
            floor=scoring.floor,
        )
        scored.append((memory, similarity, rel, age))

    scored.sort(key=lambda row: row[2], reverse=True)
    return scored[:limit]


def list_memories(
    db: Session,
    *,
    namespace: str,
    limit: int,
    offset: int,
    include_inactive: bool = False,
    tags: list[str] | None = None,
) -> tuple[list[Memory], int]:
    """Return a page of memories (newest first) and the total count."""
    conditions: list[ColumnElement[bool]] = [Memory.namespace == namespace]
    if not include_inactive:
        conditions.append(Memory.is_active.is_(True))
    _tag_condition(conditions, tags)

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


def update_memory(
    db: Session,
    *,
    memory_id: uuid.UUID,
    namespace: str | None = None,
    content: str | None = None,
    importance: int | None = None,
    tags: list[str] | None = None,
    meta: dict[str, object] | None = None,
) -> Memory | None:
    """Partially update a memory, re-embedding and re-checking content changes.

    Existing contradictions stay in the audit trail until a human resolves
    them; a re-check only adds flags for pairs that aren't already recorded.
    Tags and metadata are replaced wholesale when provided.
    """
    memory = get_memory(db, memory_id=memory_id, namespace=namespace)
    if memory is None:
        return None

    if importance is not None:
        memory.importance = importance
    if tags is not None:
        memory.tags = list(tags)
    if meta is not None:
        memory.meta = dict(meta)

    if content is not None and content != memory.content:
        memory.content = content
        memory.embedding = embed(content)
        if memory.is_active:
            _flag_contradictions(
                db,
                memory=memory,
                vector=memory.embedding,
                namespace=memory.namespace,
                llm_check=None,
            )

    db.commit()
    db.refresh(memory)
    return memory


def list_contradictions(
    db: Session,
    *,
    namespace: str,
    status: str | None = "open",
    limit: int,
    offset: int,
) -> tuple[list[Contradiction], int]:
    """Return a page of contradictions (newest first) and the total count."""
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
        .limit(limit)
        .offset(offset)
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


# --------------------------------------------------------------------------- #
# Namespace administration
# --------------------------------------------------------------------------- #
def export_namespace(
    db: Session, *, namespace: str
) -> tuple[list[Memory], list[Contradiction]]:
    """Return every memory and contradiction in a namespace.

    Soft-deleted memories are included on purpose: an export is a backup of the
    audit trail, not just the active recall set.
    """
    memories = (
        db.execute(
            select(Memory)
            .where(Memory.namespace == namespace)
            .order_by(Memory.created_at, Memory.id)
        )
        .scalars()
        .all()
    )
    contradictions = (
        db.execute(
            select(Contradiction)
            .where(Contradiction.namespace == namespace)
            .order_by(Contradiction.created_at, Contradiction.id)
        )
        .scalars()
        .all()
    )
    return list(memories), list(contradictions)


def namespace_stats(db: Session, *, namespace: str) -> dict[str, Any]:
    """Aggregate memory and contradiction counts for one namespace."""
    memory_rows = db.execute(
        select(Memory.is_active, Memory.importance).where(
            Memory.namespace == namespace
        )
    ).all()
    total = len(memory_rows)
    active = sum(1 for row in memory_rows if row.is_active)
    importance_counts = Counter(row.importance for row in memory_rows)

    contradiction_rows = db.execute(
        select(Contradiction.status, func.count())
        .where(Contradiction.namespace == namespace)
        .group_by(Contradiction.status)
    ).all()
    contradiction_counts = {status: int(count) for status, count in contradiction_rows}

    bounds = db.execute(
        select(func.min(Memory.created_at), func.max(Memory.created_at)).where(
            Memory.namespace == namespace
        )
    ).one()
    oldest, newest = bounds

    return {
        "total_memories": total,
        "active_memories": active,
        "inactive_memories": total - active,
        "open_contradictions": contradiction_counts.get("open", 0),
        "resolved_contradictions": contradiction_counts.get("resolved", 0),
        "average_importance": (
            sum(row.importance for row in memory_rows) / total if total else None
        ),
        "oldest_memory_at": oldest,
        "newest_memory_at": newest,
        "importance_counts": [
            {"importance": importance, "count": importance_counts[importance]}
            for importance in sorted(importance_counts)
        ],
    }


def import_namespace(
    db: Session,
    *,
    namespace: str,
    payload: MemoryExport,
    preserve_ids: bool = False,
) -> tuple[int, int]:
    """Restore an export into an empty namespace.

    Timestamps, soft-delete state and contradiction audit records are
    preserved. Ids are remapped by default so a snapshot can be restored into
    another namespace on the same database. Pass ``preserve_ids=True`` for a
    disaster-recovery restore into an empty database.

    The namespace must be empty so an import can never merge into or overwrite
    live data. Text is re-embedded with the configured model; the export
    deliberately does not carry vectors.
    """
    existing = db.scalar(
        select(func.count()).select_from(Memory).where(Memory.namespace == namespace)
    )
    if existing:
        raise ValueError(
            f"Namespace '{namespace}' already contains memories. Import into an empty namespace."
        )

    memory_ids = {item.id for item in payload.memories}
    if len(memory_ids) != len(payload.memories):
        raise ValueError("Export contains duplicate memory ids.")

    for item in payload.contradictions:
        if item.new_memory_id not in memory_ids or item.existing_memory_id not in memory_ids:
            raise ValueError("Export contains a contradiction that references an unknown memory.")
        if item.resolved_winner_id is not None and item.resolved_winner_id not in memory_ids:
            raise ValueError("Export contains a winner that references an unknown memory.")

    memory_ids_map: dict[uuid.UUID, uuid.UUID] = {}

    try:
        for mem_item in payload.memories:
            new_id = mem_item.id if preserve_ids else uuid.uuid4()
            memory_ids_map[mem_item.id] = new_id
            db.add(
                Memory(
                    id=new_id,
                    namespace=namespace,
                    content=mem_item.content,
                    importance=mem_item.importance,
                    embedding=embed(mem_item.content),
                    is_active=mem_item.is_active,
                    tags=list(mem_item.tags),
                    meta=mem_item.meta,
                    created_at=mem_item.created_at,
                    updated_at=mem_item.updated_at,
                )
            )
        db.flush()

        for con_item in payload.contradictions:
            db.add(
                Contradiction(
                    id=con_item.id if preserve_ids else uuid.uuid4(),
                    namespace=namespace,
                    new_memory_id=memory_ids_map[con_item.new_memory_id],
                    existing_memory_id=memory_ids_map[con_item.existing_memory_id],
                    similarity=con_item.similarity,
                    reason=con_item.reason,
                    status=con_item.status,
                    resolved_winner_id=(
                        memory_ids_map[con_item.resolved_winner_id]
                        if con_item.resolved_winner_id is not None
                        else None
                    ),
                    created_at=con_item.created_at,
                    resolved_at=con_item.resolved_at,
                )
            )

        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError(
            "Import conflicts with an existing row. Use an empty namespace."
        ) from exc

    return len(payload.memories), len(payload.contradictions)
