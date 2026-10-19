"""Shared API dependencies.

v1 auth is intentionally minimal: a single API key sent in the ``X-API-Key``
header. No auth complexity beyond this for v1.
"""

from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status

from app.core.config import settings


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Reject requests without the correct ``X-API-Key`` header.

    Uses a constant-time comparison to avoid leaking the key via timing.
    """
    if x_api_key is None or not secrets.compare_digest(x_api_key, settings.mnemo_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid API key.",
        )
