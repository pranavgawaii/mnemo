"""API key issuance and verification.

Keys are high-entropy random secrets formatted ``mnemo_<token>``. Only the
SHA-256 hash is stored, so verification is a hash lookup — the plaintext never
lives on the server. The ``MNEMO_API_KEY`` env key remains as the bootstrap
admin key so an operator can always reach the key-management routes.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.models import ApiKey

VALID_SCOPES = ("read", "write", "admin")


@dataclass(frozen=True)
class AuthContext:
    """Who is making this request, and what they may do."""

    key_id: uuid.UUID | None  # None for the bootstrap env key
    label: str
    scopes: frozenset[str]
    via_env: bool
    rate_limit_per_minute: int | None = None  # None = use the global setting

    def has_scope(self, scope: str) -> bool:
        return scope in self.scopes


def hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()


def generate_secret() -> str:
    return f"mnemo_{secrets.token_urlsafe(24)}"


def create_api_key(
    db: Session,
    *,
    label: str,
    scopes: list[str],
    rate_limit_per_minute: int | None = None,
) -> tuple[ApiKey, str]:
    """Create a key row. Returns the row and the plaintext secret (shown once)."""
    unknown = [s for s in scopes if s not in VALID_SCOPES]
    if unknown:
        raise ValueError(f"Unknown scopes: {', '.join(unknown)}.")
    if not scopes:
        raise ValueError("At least one scope is required.")

    plaintext = generate_secret()
    row = ApiKey(
        label=label or "unnamed",
        key_hash=hash_key(plaintext),
        key_prefix=plaintext[:11],
        scopes=list(scopes),
        rate_limit_per_minute=rate_limit_per_minute,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row, plaintext


def verify(db: Session, *, presented: str) -> AuthContext | None:
    """Resolve a presented key to an AuthContext, or None when unknown/inactive."""
    row = db.execute(
        select(ApiKey).where(ApiKey.key_hash == hash_key(presented), ApiKey.is_active.is_(True))
    ).scalar_one_or_none()
    if row is None:
        return None
    row.last_used_at = datetime.now(timezone.utc)
    db.commit()
    return AuthContext(
        key_id=row.id,
        label=row.label,
        scopes=frozenset(row.scopes),
        via_env=False,
        rate_limit_per_minute=row.rate_limit_per_minute,
    )


def list_api_keys(db: Session) -> list[ApiKey]:
    return list(db.execute(select(ApiKey).order_by(ApiKey.created_at)).scalars().all())


def deactivate_api_key(db: Session, *, key_id: uuid.UUID) -> ApiKey | None:
    row = db.get(ApiKey, key_id)
    if row is None:
        return None
    row.is_active = False
    db.commit()
    db.refresh(row)
    return row


def rotate_api_key(db: Session, *, key_id: uuid.UUID) -> tuple[ApiKey, str] | None:
    """Replace the secret of an existing key (label/scopes unchanged)."""
    row = db.get(ApiKey, key_id)
    if row is None:
        return None
    plaintext = generate_secret()
    row.key_hash = hash_key(plaintext)
    row.key_prefix = plaintext[:11]
    db.commit()
    db.refresh(row)
    return row, plaintext
