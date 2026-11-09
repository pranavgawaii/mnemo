"""Namespace grants are exact names, not globs or an alternative admin scope."""

import pytest
from pydantic import ValidationError

from app.core.access import permits_namespace, validate_namespace_grant
from app.models.schemas import ApiKeyCreate


@pytest.mark.parametrize("scopes", [["read"], ["write"], ["read", "write"], ["admin"]])
def test_absent_grant_preserves_operator_keys(scopes):
    assert validate_namespace_grant(None, scopes) is None
    assert permits_namespace(None, "any-namespace")


@pytest.mark.parametrize("namespaces", [[], [""], [" a"], ["a "], ["a" * 129], ["a", "a"],
                                         [str(i) for i in range(33)]])
def test_invalid_allowlist_fails_closed(namespaces):
    with pytest.raises(ValueError):
        validate_namespace_grant(namespaces, ["read"])


def test_restricted_keys_cannot_administer_global_resources():
    with pytest.raises(ValueError, match="admin"):
        validate_namespace_grant(["app"], ["read", "admin"])
    with pytest.raises(ValidationError, match="admin"):
        ApiKeyCreate(label="bad", namespaces=["app"], scopes=["admin"])


def test_grants_are_exact_and_case_sensitive_even_when_the_name_looks_like_a_glob():
    grant = validate_namespace_grant(["app", "team:*", "Pune"], ["read", "write"])
    assert permits_namespace(grant, "app")
    assert permits_namespace(grant, "team:*")
    for namespace in ["APP", "app:private", "team:alice", "pune", "other"]:
        assert not permits_namespace(grant, namespace)
    assert not permits_namespace((), "anything")


def test_grant_is_detached_from_mutable_input():
    original = ["app"]
    grant = validate_namespace_grant(original, ["read"])
    original.append("other")
    assert grant == ("app",)


def test_key_expiry_requires_a_future_offset_aware_time():
    for expiry in ["2020-01-01T00:00:00Z", "2099-01-01T00:00:00"]:
        with pytest.raises(ValidationError, match="expiry"):
            ApiKeyCreate(label="short-lived", expires_at=expiry)
    key = ApiKeyCreate(label="valid", namespaces=["app"], expires_at="2099-01-01T00:00:00Z")
    assert key.expires_at.tzinfo is not None
