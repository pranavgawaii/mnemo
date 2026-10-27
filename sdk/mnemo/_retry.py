"""Retry policy shared by the sync and async clients.

Only idempotent methods (GET) retry, and only on transient failures: 429
(honouring Retry-After), 5xx, and network errors. Writes never retry — Mnemo
writes are not idempotent (a retried POST creates a duplicate memory), so a
failed write is surfaced to the caller to decide.
"""

from __future__ import annotations

import time

import httpx

from .errors import RateLimitError, ServerError

_RETRYABLE_STATUS = {500, 502, 503, 504}
_MAX_ATTEMPTS = 3
_BASE_DELAY_SECONDS = 0.2


def should_retry(method: str, exc: Exception) -> bool:
    """True when this failure is retryable under the policy."""
    if method.upper() != "GET":
        return False
    if isinstance(exc, RateLimitError):
        return True
    if isinstance(exc, ServerError):
        return exc.status in _RETRYABLE_STATUS
    if isinstance(exc, httpx.TransportError):
        return True
    return False


def delay_for(attempt: int, exc: Exception) -> float:
    """Seconds to wait before the next attempt (1-indexed)."""
    if isinstance(exc, RateLimitError) and exc.retry_after is not None:
        return max(0.0, exc.retry_after)
    return _BASE_DELAY_SECONDS * (2 ** (attempt - 1))


def attempts_allowed() -> int:
    return _MAX_ATTEMPTS


def sleep_sync(seconds: float) -> None:
    time.sleep(seconds)
