"""Per-namespace scoring overrides and namespace administration.

Namespaces are implicit today: any string is a valid tenant key. This service
adds an optional ``namespaces`` row that carries *overrides* for the scoring
constants (decay half-life, decay floor, contradiction threshold). A missing
row means "use the global settings" — implicit namespaces keep working.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Memory, NamespaceRow

# Namespace names: hostname-ish labels keep URLs and exports unambiguous.
_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")


@dataclass(frozen=True)
class ScoringConfig:
    """Fully-resolved scoring constants for one namespace."""

    half_life_days: float
    floor: float
    sim_threshold: float


def validate_name(name: str) -> str:
    if not _NAME_RE.match(name):
        raise ValueError(
            "Namespace name must be 1-128 chars of letters, digits, dots, dashes or underscores."
        )
    return name


def resolve_scoring(db: Session, *, namespace: str) -> ScoringConfig:
    """Global settings unless a namespace row overrides individual values."""
    row = db.get(NamespaceRow, namespace)
    return ScoringConfig(
        half_life_days=(
            row.decay_half_life_days
            if row is not None and row.decay_half_life_days is not None
            else settings.decay_half_life_days
        ),
        floor=(
            row.decay_floor if row is not None and row.decay_floor is not None else settings.decay_floor
        ),
        sim_threshold=(
            row.contradiction_sim_threshold
            if row is not None and row.contradiction_sim_threshold is not None
            else settings.contradiction_sim_threshold
        ),
    )


def create_namespace(
    db: Session,
    *,
    name: str,
    decay_half_life_days: float | None = None,
    decay_floor: float | None = None,
    contradiction_sim_threshold: float | None = None,
) -> NamespaceRow:
    validate_name(name)
    _validate_overrides(
        decay_half_life_days=decay_half_life_days,
        decay_floor=decay_floor,
        sim_threshold=contradiction_sim_threshold,
    )
    if db.get(NamespaceRow, name) is not None:
        raise ValueError(f"Namespace '{name}' already exists.")
    row = NamespaceRow(
        name=name,
        decay_half_life_days=decay_half_life_days,
        decay_floor=decay_floor,
        contradiction_sim_threshold=contradiction_sim_threshold,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _validate_overrides(
    *,
    decay_half_life_days: float | None,
    decay_floor: float | None,
    sim_threshold: float | None,
) -> None:
    if decay_half_life_days is not None and decay_half_life_days <= 0:
        raise ValueError("decay_half_life_days must be positive.")
    if decay_floor is not None and not (0 < decay_floor <= 1):
        raise ValueError("decay_floor must be in (0, 1].")
    if sim_threshold is not None and not (0 < sim_threshold <= 1):
        raise ValueError("contradiction_sim_threshold must be in (0, 1].")


def list_namespaces(db: Session) -> list[tuple[NamespaceRow, int]]:
    """All namespace rows plus their total memory count, oldest first."""
    rows = db.execute(select(NamespaceRow).order_by(NamespaceRow.created_at)).scalars().all()
    counts: dict[str, int] = {
        namespace: int(count)
        for namespace, count in db.execute(
            select(Memory.namespace, func.count()).group_by(Memory.namespace)
        ).all()
    }
    return [(row, counts.get(row.name, 0)) for row in rows]


def get_namespace(db: Session, *, name: str) -> NamespaceRow | None:
    return db.get(NamespaceRow, name)


def update_namespace(
    db: Session,
    *,
    name: str,
    decay_half_life_days: float | None = None,
    decay_floor: float | None = None,
    contradiction_sim_threshold: float | None = None,
    reset: set[str] | None = None,
) -> NamespaceRow | None:
    """Partial update. Fields explicitly set to None in the PATCH reset to global."""
    row = db.get(NamespaceRow, name)
    if row is None:
        return None
    reset = reset or set()

    if decay_half_life_days is not None or "decay_half_life_days" in reset:
        row.decay_half_life_days = decay_half_life_days
    if decay_floor is not None or "decay_floor" in reset:
        row.decay_floor = decay_floor
    if contradiction_sim_threshold is not None or "contradiction_sim_threshold" in reset:
        row.contradiction_sim_threshold = contradiction_sim_threshold

    _validate_overrides(
        decay_half_life_days=row.decay_half_life_days,
        decay_floor=row.decay_floor,
        sim_threshold=row.contradiction_sim_threshold,
    )
    db.commit()
    db.refresh(row)
    return row


def delete_namespace(db: Session, *, name: str) -> bool | None:
    """Delete the namespace row. Returns None when the namespace doesn't exist
    at all (no row and no memories), False when it still has memories (deleting
    live data is refused — implicit namespaces created by writes count), True
    on success."""
    memory_count = db.scalar(
        select(func.count()).select_from(Memory).where(Memory.namespace == name)
    )
    if memory_count:
        return False
    row = db.get(NamespaceRow, name)
    if row is None:
        return None
    db.delete(row)
    db.commit()
    return True
