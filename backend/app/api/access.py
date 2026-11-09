"""Namespace authorization at the HTTP boundary.

List/search/write requests name their namespace explicitly and receive 403 for
an out-of-grant namespace. ID routes receive a uniform 404 instead; they must
resolve authorization before invoking a mutating service. SQL lookups project
only the namespace and never return another application's memory to a caller.
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.access import permits_namespace
from app.models.models import Memory
from app.services.api_key_service import AuthContext


def namespace_grant(request: Request) -> tuple[str, ...] | None:
    auth: AuthContext = request.state.auth
    return auth.namespaces


def authorize_namespace(request: Request, namespace: str) -> None:
    if not permits_namespace(namespace_grant(request), namespace):
        raise HTTPException(status_code=403, detail="This key cannot access this namespace.")


def authorize_memory(
    request: Request, db: Session, memory_id: uuid.UUID, namespace: str | None,
) -> str | None:
    """Return the concrete, authorized namespace before any ID-based mutation.

    Unrestricted keys keep the historical optional namespace behaviour. For a
    restricted key the lookup is SQL-filtered to its grant, even when the caller
    omits the namespace or supplies a UUID copied from another application.
    """
    grant = namespace_grant(request)
    if grant is None:
        return namespace
    statement = select(Memory.namespace).where(
        Memory.id == memory_id, Memory.namespace.in_(grant),
    )
    if namespace is not None:
        statement = statement.where(Memory.namespace == namespace)
    resolved = db.scalar(statement)
    if resolved is None:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return resolved
