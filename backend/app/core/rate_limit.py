"""Per-key rate limiting with a fixed-minute window in Postgres.

No Redis: the counter lives next to the data it protects. ``authenticate``
upserts one row per (identity, window) atomically and reads back the in-window
count; when it exceeds the key's limit the request is answered 429 with
``Retry-After``.

Fixed windows (not sliding) are a deliberate trade: a client can burst up to
2x its limit across a window boundary, but the check is one round-trip and
cannot drift. Limits are opt-in via ``RATE_LIMIT_ENABLED=true``.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.models import RateLimitCounter

WINDOW_SECONDS = 60


@dataclass(frozen=True)
class RateLimitState:
    """Result of consuming one request against a key's budget."""

    identity: str
    limit: int
    used: int
    window_end: datetime

    @property
    def remaining(self) -> int:
        return max(0, self.limit - self.used)

    @property
    def retry_after(self) -> int:
        """Whole seconds until the window rolls (min 1)."""
        delta = (self.window_end - datetime.now(timezone.utc)).total_seconds()
        return max(1, int(delta) + 1)

    @property
    def reset_epoch(self) -> int:
        return int(self.window_end.timestamp())


def window_start_for(now: datetime | None = None) -> datetime:
    """Truncate to the start of the current minute (UTC)."""
    current = now or datetime.now(timezone.utc)
    return current.replace(second=0, microsecond=0)


def consume(db: Session, *, identity: str, limit: int) -> RateLimitState:
    """Atomically count one request for ``identity`` in the current window."""
    window_start = window_start_for()
    stmt = (
        insert(RateLimitCounter)
        .values(identity=identity, window_start=window_start, count=1)
        .on_conflict_do_update(
            index_elements=["identity", "window_start"],
            set_={"count": RateLimitCounter.count + 1},
        )
        .returning(RateLimitCounter.count)
    )
    used = int(db.execute(stmt).scalar_one())
    db.commit()

    return RateLimitState(
        identity=identity,
        limit=limit,
        used=used,
        window_end=window_start + timedelta(seconds=WINDOW_SECONDS),
    )
