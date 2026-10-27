"""All REST endpoints for Mnemo v1.

Grouped by resource: ``/v1/memories`` and ``/v1/contradictions``. Handlers stay
thin — persistence/query logic lives in ``app.services.memory_service``. Every
response goes through a Pydantic schema; ORM objects are never returned raw.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status
from sqlalchemy.orm import Session

from app.api import pagination
from app.api.deps import authenticate, require_scope
from app.db.session import get_db
from app.models.schemas import (
    ApiKeyCreate,
    ApiKeyCreated,
    ApiKeyList,
    ApiKeyOut,
    AuditEventList,
    AuditEventOut,
    BulkMemoryRequest,
    BulkMemoryResult,
    BulkMemoryResultItem,
    ContradictionExportItem,
    ContradictionList,
    ContradictionOut,
    MemoryCreate,
    MemoryCreateResult,
    MemoryExport,
    MemoryExportItem,
    MemoryList,
    MemoryOut,
    MemoryUpdate,
    NamespaceCreate,
    NamespaceList,
    NamespaceOut,
    NamespaceStats,
    NamespaceUpdate,
    ResolveRequest,
    SearchHit,
    SearchRequest,
    SearchResponse,
)
from app.services import api_key_service, audit_service, memory_service, namespace_service
from app.services.memory_service import _UNSET

router = APIRouter(prefix="/v1", dependencies=[Depends(authenticate)])

# Write routes require the "write" scope; GET routes stay readable with "read".
_WRITE = [Depends(require_scope("write"))]
_ADMIN = [Depends(require_scope("admin"))]


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
    return NamespaceStats.model_validate({"namespace": namespace, **stats})


# --------------------------------------------------------------------------- #
# Namespace configuration (CRUD)
# --------------------------------------------------------------------------- #
@router.post("/namespaces", response_model=NamespaceOut, status_code=status.HTTP_201_CREATED)
def create_namespace(payload: NamespaceCreate, db: Session = Depends(get_db)) -> NamespaceOut:
    """Register a namespace with optional scoring overrides."""
    try:
        row = namespace_service.create_namespace(
            db,
            name=payload.name,
            decay_half_life_days=payload.decay_half_life_days,
            decay_floor=payload.decay_floor,
            contradiction_sim_threshold=payload.contradiction_sim_threshold,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return NamespaceOut.model_validate(row).model_copy(update={"total_memories": 0})


@router.get("/namespaces", response_model=NamespaceList)
def list_namespaces(db: Session = Depends(get_db)) -> NamespaceList:
    """All configured namespaces with their memory counts."""
    rows = namespace_service.list_namespaces(db)
    items = [
        NamespaceOut.model_validate(row).model_copy(update={"total_memories": count})
        for row, count in rows
    ]
    return NamespaceList(items=items, total=len(items))


@router.get("/namespaces/{namespace}", response_model=NamespaceOut)
def get_namespace(
    namespace: str = Path(..., min_length=1, max_length=128),
    db: Session = Depends(get_db),
) -> NamespaceOut:
    row = namespace_service.get_namespace(db, name=namespace)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Namespace not found.")
    count = memory_service.namespace_stats(db, namespace=namespace)["total_memories"]
    return NamespaceOut.model_validate(row).model_copy(update={"total_memories": int(count or 0)})


@router.patch("/namespaces/{namespace}", response_model=NamespaceOut)
def update_namespace(
    payload: NamespaceUpdate,
    namespace: str = Path(..., min_length=1, max_length=128),
    db: Session = Depends(get_db),
) -> NamespaceOut:
    """Update scoring overrides; explicit ``null`` resets a field to the global value."""
    provided = payload.model_fields_set
    row = namespace_service.update_namespace(
        db,
        name=namespace,
        decay_half_life_days=payload.decay_half_life_days,
        decay_floor=payload.decay_floor,
        contradiction_sim_threshold=payload.contradiction_sim_threshold,
        reset=provided,  # keys present-but-null mean "reset to global"
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Namespace not found.")
    count = memory_service.namespace_stats(db, namespace=namespace)["total_memories"]
    return NamespaceOut.model_validate(row).model_copy(update={"total_memories": int(count or 0)})


@router.delete("/namespaces/{namespace}", status_code=status.HTTP_204_NO_CONTENT)
def delete_namespace(
    namespace: str = Path(..., min_length=1, max_length=128),
    db: Session = Depends(get_db),
) -> None:
    """Delete the namespace row. Refused (409) while memories still exist."""
    outcome = namespace_service.delete_namespace(db, name=namespace)
    if outcome is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Namespace not found.")
    if outcome is False:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Namespace still contains memories; move or delete them first.",
        )


# --------------------------------------------------------------------------- #
# Memories
# --------------------------------------------------------------------------- #
@router.post("/memories", response_model=MemoryCreateResult, status_code=status.HTTP_201_CREATED, dependencies=_WRITE)
def add_memory(
    payload: MemoryCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> MemoryCreateResult:
    """Add a memory. Any contradictions it introduces are flagged and returned."""
    actor = _actor(request)
    memory, contradictions = memory_service.add_memory(
        db,
        content=payload.content,
        namespace=payload.namespace,
        importance=payload.importance,
        tags=list(payload.tags),
        meta=payload.meta,
        expires_at=payload.expires_at,
        actor_key_id=actor,
        request_id=request.state.request_id,
    )
    return MemoryCreateResult(
        memory=MemoryOut.model_validate(memory),
        contradictions=[ContradictionOut.model_validate(c) for c in contradictions],
    )


@router.post("/memories/bulk", response_model=BulkMemoryResult, dependencies=_WRITE)
def add_memories_bulk(
    payload: BulkMemoryRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> BulkMemoryResult:
    """Add many memories in one call, each through the normal write path.

    Items are processed independently: a failure (bad content, embed error)
    marks that item as ``error`` and never rolls back the others. Contradiction
    flags created by earlier items in the same batch are visible to later ones.
    """
    results: list[BulkMemoryResultItem] = []
    created = 0
    errors = 0
    for index, item in enumerate(payload.items):
        try:
            memory, contradictions = memory_service.add_memory(
                db,
                content=item.content,
                namespace=item.namespace,
                importance=item.importance,
                tags=list(item.tags),
                meta=item.meta,
                actor_key_id=_actor(request),
                request_id=request.state.request_id,
            )
        except (ValueError, RuntimeError) as exc:
            errors += 1
            results.append(BulkMemoryResultItem(index=index, status="error", error=str(exc)))
            continue
        created += 1
        results.append(
            BulkMemoryResultItem(
                index=index,
                status="created",
                memory=MemoryOut.model_validate(memory),
                contradictions=[ContradictionOut.model_validate(c) for c in contradictions],
            )
        )
    return BulkMemoryResult(created=created, errors=errors, results=results)


@router.post("/memories/search", response_model=SearchResponse)
def search_memories(payload: SearchRequest, db: Session = Depends(get_db)) -> SearchResponse:
    """Semantic search, ranked by relevance (similarity * decay * importance)."""
    results = memory_service.search(
        db,
        query=payload.query,
        namespace=payload.namespace,
        limit=payload.limit,
        tags=list(payload.tags) or None,
        keyword_weight=payload.keyword_weight,
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
    tags: str | None = Query(default=None, description="Comma-separated tag filter (ANY match)."),
    cursor: str | None = Query(default=None, description="Opaque cursor from a previous page."),
    db: Session = Depends(get_db),
) -> MemoryList:
    """Paginated list of active memories for a namespace, newest first."""
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    if cursor is not None:
        try:
            items, next_cursor = pagination.list_memories_page(
                db, namespace=namespace, limit=limit, cursor=cursor, tags=tag_list
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        _, total = memory_service.list_memories(
            db, namespace=namespace, limit=1, offset=0, tags=tag_list
        )
        return MemoryList(
            items=[MemoryOut.model_validate(m) for m in items],
            total=total,
            limit=limit,
            offset=0,
            next_cursor=next_cursor,
        )
    items, total = memory_service.list_memories(
        db, namespace=namespace, limit=limit, offset=offset, tags=tag_list
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


@router.patch("/memories/{memory_id}", response_model=MemoryOut, dependencies=_WRITE)
def update_memory(
    payload: MemoryUpdate,
    memory_id: uuid.UUID,
    request: Request,
    namespace: str | None = Query(default=None, min_length=1, max_length=128),
    db: Session = Depends(get_db),
) -> MemoryOut:
    """Partially update a memory's content or importance.

    Content changes are re-embedded and re-checked for contradictions; new
    flags surface through ``GET /v1/contradictions``. Accepts the same optional
    ``namespace`` scope as the fetch and delete routes.
    """
    memory = memory_service.update_memory(
        db,
        memory_id=memory_id,
        namespace=namespace,
        content=payload.content,
        importance=payload.importance,
        tags=list(payload.tags) if payload.tags is not None else None,
        meta=payload.meta,
        expires_at=(
            payload.expires_at
            if "expires_at" in payload.model_fields_set
            else _UNSET
        ),
        actor_key_id=_actor(request),
        request_id=request.state.request_id,
    )
    if memory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")
    return MemoryOut.model_validate(memory)


@router.delete("/memories/{memory_id}", response_model=MemoryOut, dependencies=_WRITE)
def delete_memory(
    memory_id: uuid.UUID,
    request: Request,
    namespace: str | None = Query(default=None, min_length=1, max_length=128),
    db: Session = Depends(get_db),
) -> MemoryOut:
    """Soft-delete a memory (``is_active=False``). Rows are never hard-deleted.

    Accepts the same optional ``namespace`` scope as the fetch route, so a
    caller cannot soft-delete a memory outside the namespace it names.
    """
    memory = memory_service.soft_delete_memory(
        db,
        memory_id=memory_id,
        namespace=namespace,
        actor_key_id=_actor(request),
        request_id=request.state.request_id,
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
    cursor: str | None = Query(default=None, description="Opaque cursor from a previous page."),
    db: Session = Depends(get_db),
) -> ContradictionList:
    """Paginated list of flagged contradictions (defaults to open ones)."""
    if cursor is not None:
        try:
            items, next_cursor = pagination.list_contradictions_page(
                db, namespace=namespace, limit=limit, cursor=cursor, status=status_filter
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        _, total = memory_service.list_contradictions(
            db, namespace=namespace, status=status_filter, limit=1, offset=0
        )
        return ContradictionList(
            items=[ContradictionOut.model_validate(c) for c in items],
            total=total,
            limit=limit,
            offset=0,
            next_cursor=next_cursor,
        )
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


@router.post("/contradictions/resolve", response_model=ContradictionOut, dependencies=_WRITE)
def resolve_contradiction(
    payload: ResolveRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ContradictionOut:
    """Resolve a contradiction by naming the winner; the loser is soft-deleted."""
    contradiction, error = memory_service.resolve_contradiction(
        db,
        contradiction_id=payload.contradiction_id,
        winner_memory_id=payload.winner_memory_id,
        actor_key_id=_actor(request),
        request_id=request.state.request_id,
    )
    if error is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    return ContradictionOut.model_validate(contradiction)


# --------------------------------------------------------------------------- #
# API key management (admin scope)
# --------------------------------------------------------------------------- #
@router.post("/keys", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED, dependencies=_ADMIN)
def create_api_key(payload: ApiKeyCreate, db: Session = Depends(get_db)) -> ApiKeyCreated:
    """Issue a new API key. The plaintext ``key`` is shown exactly once."""
    try:
        row, plaintext = api_key_service.create_api_key(
            db,
            label=payload.label,
            scopes=list(payload.scopes),
            rate_limit_per_minute=payload.rate_limit_per_minute,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    out = ApiKeyOut.model_validate(row).model_dump()
    return ApiKeyCreated(key=plaintext, **out)


@router.get("/keys", response_model=ApiKeyList, dependencies=_ADMIN)
def list_api_keys(db: Session = Depends(get_db)) -> ApiKeyList:
    """All issued keys, prefix and scopes only (secrets are never returned)."""
    rows = api_key_service.list_api_keys(db)
    return ApiKeyList(
        items=[ApiKeyOut.model_validate(r) for r in rows],
        total=len(rows),
    )


@router.post("/keys/{key_id}/rotate", response_model=ApiKeyCreated, dependencies=_ADMIN)
def rotate_api_key(key_id: uuid.UUID, db: Session = Depends(get_db)) -> ApiKeyCreated:
    """Replace a key's secret; label and scopes are unchanged."""
    result = api_key_service.rotate_api_key(db, key_id=key_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found.")
    row, plaintext = result
    out = ApiKeyOut.model_validate(row).model_dump()
    return ApiKeyCreated(key=plaintext, **out)


@router.delete("/keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=_ADMIN)
def revoke_api_key(key_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    """Deactivate a key. Auth with it starts failing immediately."""
    row = api_key_service.deactivate_api_key(db, key_id=key_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found.")


def _actor(request: Request) -> uuid.UUID | None:
    """The issuing key id for the authenticated caller (None for the env key)."""
    auth = getattr(request.state, "auth", None)
    return getattr(auth, "key_id", None) if auth is not None else None


# --------------------------------------------------------------------------- #
# Audit events (admin scope)
# --------------------------------------------------------------------------- #
@router.get("/events", response_model=AuditEventList, dependencies=_ADMIN)
def list_events(
    namespace: str | None = Query(default=None, min_length=1, max_length=128),
    resource_type: str | None = Query(default=None, min_length=1, max_length=32),
    action: str | None = Query(default=None, min_length=1, max_length=64),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> AuditEventList:
    """Paginated audit trail, newest first. Filter by namespace, resource, action."""
    items, total = audit_service.list_events(
        db,
        namespace=namespace,
        resource_type=resource_type,
        action=action,
        limit=limit,
        offset=offset,
    )
    return AuditEventList(
        items=[AuditEventOut.model_validate(e) for e in items],
        total=total,
        limit=limit,
        offset=offset,
    )
