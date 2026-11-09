"""Compatibility entry point for the Python-owned revision rules."""

from app.core.changes import explicit_change


def explicit_revision(first: str, second: str) -> str | None:
    return explicit_change(first, second, relocation=False)
