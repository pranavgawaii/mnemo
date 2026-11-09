"""Compatibility entry point for the Python-owned relocation rule."""

from app.core.changes import RULES, explicit_change

RELOCATION_REASON = RULES[0].reason


def explicit_relocation(first: str, second: str) -> bool:
    return explicit_change(first, second, relocation=True) is not None
