"""Mnemo Python SDK errors.

Every error maps an HTTP status to a typed exception so callers can branch on
behaviour (retry vs give up vs fix the payload) without string matching.
"""

from __future__ import annotations


class MnemoError(Exception):
    """Base class for all Mnemo API errors."""

    def __init__(self, message: str, *, status: int | None = None, request_id: str | None = None) -> None:
        super().__init__(message)
        self.status = status
        self.request_id = request_id


class AuthenticationError(MnemoError):
    """401 - missing or invalid API key."""


class ForbiddenError(MnemoError):
    """403 - the key lacks the required scope."""


class NotFoundError(MnemoError):
    """404 - the resource does not exist."""


class ConflictError(MnemoError):
    """409 - the write is rejected (e.g. a near-duplicate in reject mode)."""


class ValidationError(MnemoError):
    """422 - the payload failed validation."""


class RateLimitError(MnemoError):
    """429 - the key hit its rate limit."""

    def __init__(
        self, message: str, *, retry_after: float | None = None, status: int | None = None, request_id: str | None = None
    ) -> None:
        super().__init__(message, status=status, request_id=request_id)
        self.retry_after = retry_after


class ServerError(MnemoError):
    """5xx - the service failed; safe to retry with backoff."""


__all__ = [
    "AuthenticationError",
    "ConflictError",
    "ForbiddenError",
    "MnemoError",
    "NotFoundError",
    "RateLimitError",
    "ServerError",
    "ValidationError",
]
