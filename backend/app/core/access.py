"""Validation for issued-key namespace grants, independent of HTTP and storage.

An absent grant preserves the existing operator key behaviour. A present grant
is an exact allowlist, never a prefix, regex, glob or tenant identity. Restricted
keys cannot carry the global admin scope: that scope controls keys, exports,
events and webhooks across the deployment.
"""

from __future__ import annotations

from collections.abc import Sequence


def validate_namespace_grant(
    namespaces: Sequence[str] | None, scopes: Sequence[str],
) -> tuple[str, ...] | None:
    if namespaces is None:
        return None
    if "admin" in scopes:
        raise ValueError("Namespace-restricted keys cannot have the global admin scope.")
    if not 1 <= len(namespaces) <= 32:
        raise ValueError("A namespace grant must contain between 1 and 32 names.")
    if any(not name or len(name) > 128 or name != name.strip() for name in namespaces):
        raise ValueError("Namespace names must be nonempty, trimmed and at most 128 characters.")
    if len(set(namespaces)) != len(namespaces):
        raise ValueError("Namespace grants must not contain duplicate names.")
    return tuple(namespaces)


def permits_namespace(grant: Sequence[str] | None, namespace: str) -> bool:
    """None is unrestricted; even an invalid empty grant fails closed."""
    return grant is None or namespace in grant
