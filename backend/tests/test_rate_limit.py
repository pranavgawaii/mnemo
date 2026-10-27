"""Rate limiting: pure window math (hermetic) + enforcement (CI tier).

Enforcement needs the counters table, so the DB test is guarded by requires_db
and runs in the pgvector integration job. Issued keys carry their own identity,
which keeps this test from poisoning counters shared with the bootstrap key.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.core.rate_limit import RateLimitState, window_start_for
from tests.conftest import requires_db


def test_window_start_truncates_to_minute():
    now = datetime(2026, 3, 1, 12, 34, 56, 789000, tzinfo=UTC)
    start = window_start_for(now)
    assert start == datetime(2026, 3, 1, 12, 34, 0, tzinfo=UTC)


def test_rate_limit_state_math():
    window_end = datetime.now(UTC) + timedelta(seconds=30)
    state = RateLimitState(identity="k", limit=10, used=4, window_end=window_end)
    assert state.remaining == 6
    assert 25 <= state.retry_after <= 32
    assert isinstance(state.reset_epoch, int)


def test_rate_limit_state_exhausted():
    state = RateLimitState(
        identity="k",
        limit=2,
        used=5,
        window_end=datetime.now(UTC) + timedelta(seconds=1),
    )
    assert state.remaining == 0
    assert state.retry_after >= 1


@requires_db
def test_enforcement_returns_429_with_retry_after(client, monkeypatch):
    from app.core.config import settings
    from app.db.session import SessionLocal
    from app.services import api_key_service

    monkeypatch.setattr(settings, "rate_limit_enabled", True)

    with SessionLocal() as db:
        _, plaintext = api_key_service.create_api_key(
            db, label="throttled", scopes=["read"], rate_limit_per_minute=1
        )

    first = client.get("/v1/memories?namespace=rl-test", headers={"X-API-Key": plaintext})
    assert first.status_code == 200

    second = client.get("/v1/memories?namespace=rl-test", headers={"X-API-Key": plaintext})
    assert second.status_code == 429
    assert int(second.headers["Retry-After"]) >= 1
    assert second.headers["X-RateLimit-Limit"] == "1"
    assert second.headers["X-RateLimit-Remaining"] == "0"


@requires_db
def test_disabled_by_default_means_no_429(client, namespace):
    statuses = {
        client.get(f"/v1/memories?namespace={namespace}").status_code for _ in range(5)
    }
    assert statuses == {200}
