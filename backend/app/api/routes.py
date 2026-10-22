"""All REST endpoints for Mnemo v1.

Grouped by resource: ``/v1/memories`` and ``/v1/contradictions``. Handlers stay
thin — persistence/query logic lives in ``app.services.memory_service``. Every
response goes through a Pydantic schema; ORM objects are never returned raw.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_api_key
from app.db.session import get_db
from app.models.schemas import (
    ContradictionExportItem,
    ContradictionList,
    ContradictionOut,
    MemoryCreate,
    MemoryCreateResult,
    MemoryExport,
    MemoryExportItem,
    MemoryList,
    MemoryOut,
    NamespaceStats,
    ResolveRequest,
    SearchRequest,
    SearchResponse,
    SearchHit,
)
from app.services import memory_service

router = APIRouter(prefix="/v1", dependencies=[Depends(require_api_key)])


# --------------------------------------------------------------------------- #
# Namespace administration
# --------------------------------------------------------------------------- #
@router.get("/namespaces/{namespace}/export", response_model=MemoryExport)
def export_namespace(
    namespace: str = Path(..., min_length=1, max_length=128),
    db: Session = Depends(get_db),
) -> MemoryExport:
    """Export every memory and contradiction in a namespace.

    Soft-deleted memories are included. The snapshot is portable between
    deployments because vectors are re-derived from the text on import.
    """
    memories, contradictions = memory_service.export_namespace(
        db, namespace=namespace
    )
    return MemoryExport(
        namespace=namespace,
        exported_at=datetime.now(timezone.utc),
        memories=[MemoryExportItem.model_validate(memory) for memory in memories],
        contradictions=[
            ContradictionExportItem.model_validate(contradiction)
            for contradiction in contradictions
        ],
    )


@router.get("/namespaces/{namespace}/stats", response_model=NamespaceStats)
def namespace_stats(
    namespace: str = Path(..., min_length=1, max_length=128),
    db: Session = Depends(get_db),
) -> NamespaceStats:
    """Return aggregate memory and contradiction counts for one namespace."""
    stats = memory_service.namespace_stats(db, namespace=namespace)
    return NamespaceStats(namespace=namespace, **stats)


# --------------------------------------------------------------------------- #
# Memories
# --------------------------------------------------------------------------- #
@router.post("/memories", response_model=MemoryCreateResult, status_code=status.HTTP_201_CREATED)
def add_memory(payload: MemoryCreate, db: Session = Depends(get_db)) -> MemoryCreateResult:
    """Add a memory. Any contradictions it introduces are flagged and returned."""
    memory, contradictions = memory_service.add_memory(
        db,
        content=payload.content,
        namespace=payload.namespace,
        importance=payload.importance,
    )
    return MemoryCreateResult(
        memory=MemoryOut.model_validate(memory),
        contradictions=[ContradictionOut.model_validate(c) for c in contradictions],
    )


@router.post("/memories/search", response_model=SearchResponse)
def search_memories(payload: SearchRequest, db: Session = Depends(get_db)) -> SearchResponse:
    """Semantic search, ranked by relevance (similarity * decay * importance)."""
    results = memory_service.search(
        db, query=payload.query, namespace=payload.namespace, limit=payload.limit
    )
    hits = [
        SearchHit(
            memory=MemoryOut.model_validate(memory),
            similarity=similarity,
            relevance_score=relevance,
            age_days=age,
        )
        for memory, similarity, relevance, age in results
    ]
    return SearchResponse(query=payload.query, namespace=payload.namespace, hits=hits)


@router.get("/memories", response_model=MemoryList)
def list_memories(
    namespace: str = Query(default="default"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> MemoryList:
    """Paginated list of active memories for a namespace, newest first."""
    items, total = memory_service.list_memories(
        db, namespace=namespace, limit=limit, offset=offset
    )
    return MemoryList(
        items=[MemoryOut.model_validate(m) for m in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/memories/{memory_id}", response_model=MemoryOut)
def get_memory(
    memory_id: uuid.UUID,
    namespace: str | None = Query(default=None, min_length=1, max_length=128),
    db: Session = Depends(get_db),
) -> MemoryOut:
    """Fetch a single memory by id.

    Optionally scoped by ``namespace``: when the parameter is given and the
    memory lives in a different namespace, this returns 404 rather than
    revealing that the id exists elsewhere.
    """
    memory = memory_service.get_memory(
        db, memory_id=memory_id, namespace=namespace
    )
    if memory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")
    return MemoryOut.model_validate(memory)


@router.delete("/memories/{memory_id}", response_model=MemoryOut)
def delete_memory(
    memory_id: uuid.UUID,
    namespace: str | None = Query(default=None, min_length=1, max_length=128),
    db: Session = Depends(get_db),
) -> MemoryOut:
    """Soft-delete a memory (``is_active=False``). Rows are never hard-deleted.

    Accepts the same optional ``namespace`` scope as the fetch route, so a
    caller cannot soft-delete a memory outside the namespace it names.
    """
    memory = memory_service.soft_delete_memory(
        db, memory_id=memory_id, namespace=namespace
    )
    if memory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")
    return MemoryOut.model_validate(memory)


# --------------------------------------------------------------------------- #
# Contradictions
# --------------------------------------------------------------------------- #
@router.get("/contradictions", response_model=ContradictionList)
def list_contradictions(
    namespace: str = Query(default="default"),
    status_filter: str | None = Query(default="open", alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ContradictionList:
    """Paginated list of flagged contradictions (defaults to open ones)."""
    items, total = memory_service.list_contradictions(
        db,
        namespace=namespace,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return ContradictionList(
        items=[ContradictionOut.model_validate(c) for c in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/contradictions/resolve", response_model=ContradictionOut)
def resolve_contradiction(payload: ResolveRequest, db: Session = Depends(get_db)) -> ContradictionOut:
    """Resolve a contradiction by naming the winner; the loser is soft-deleted."""
    contradiction, error = memory_service.resolve_contradiction(
        db,
        contradiction_id=payload.contradiction_id,
        winner_memory_id=payload.winner_memory_id,
    )
    if error is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    return ContradictionOut.model_validate(contradiction)
