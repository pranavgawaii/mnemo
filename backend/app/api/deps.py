"""Shared API dependencies: authentication and scope checks.

Auth model:

- The ``MNEMO_API_KEY`` env key is the bootstrap/admin key (all scopes). It
  keeps single-key deployments working exactly as before.
- Issued keys live in ``api_keys`` (hashed) and carry scopes. Verification is a
  hash lookup, so the plaintext secret never needs to be stored or compared.

Scope semantics: ``read`` for GET routes, ``write`` for mutations, ``admin``
for key management and the events feed. The resolved context is attached to
``request.state.auth`` for per-route scope checks.
"""

from __future__ import annotations

import secrets
from collections.abc import Callable

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import consume as consume_rate_limit
from app.db.session import get_db
from app.services import api_key_service
from app.services.api_key_service import AuthContext


def _enforce_rate_limit(request: Request, db: Session, context: AuthContext) -> None:
    """Consume one request from the key's per-minute budget when enabled.

    Runs after authentication; the outcome is stashed on the request so the
    response middleware can set the X-RateLimit-* headers.
    """
    if not settings.rate_limit_enabled:
        return
    limit = context.rate_limit_per_minute or settings.rate_limit_per_minute
    identity = "bootstrap" if context.via_env else str(context.key_id)
    state = consume_rate_limit(db, identity=identity, limit=limit)
    request.state.rate_limit = state
    if state.used > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded for this API key.",
            headers={"Retry-After": str(state.retry_after)},
        )


def authenticate(
    request: Request,
    db: Session = Depends(get_db),
    x_api_key: str | None = Header(default=None),
) -> AuthContext:
    """Resolve the caller to an AuthContext and stash it on the request.

    Runs once per request (router-level dependency); scope checks read the
    stashed context instead of re-querying.
    """
    if x_api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key.",
        )

    if secrets.compare_digest(x_api_key, settings.mnemo_api_key):
        context = AuthContext(
            key_id=None,
            label="bootstrap",
            scopes=frozenset({"read", "write", "admin"}),
            via_env=True,
        )
    else:
        resolved = api_key_service.verify(db, presented=x_api_key)
        if resolved is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid API key.",
            )
        context = resolved

    request.state.auth = context
    _enforce_rate_limit(request, db, context)
    return context


def require_scope(scope: str) -> Callable[[Request], None]:
    """Route dependency enforcing one scope on the authenticated context."""

    def check(request: Request) -> None:
        auth: AuthContext | None = getattr(request.state, "auth", None)
        if auth is None or not auth.has_scope(scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This operation requires the '{scope}' scope.",
            )

    return check


# Backwards-compatible alias used by tests that only need the header check.
def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Reject requests without the correct bootstrap ``X-API-Key`` header.

    Uses a constant-time comparison to avoid leaking the key via timing.
    """
    if x_api_key is None or not secrets.compare_digest(x_api_key, settings.mnemo_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid API key.",
        )
