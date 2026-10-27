"""Issued-key authentication against real Postgres (CI tier).

The bootstrap env key keeps working; issued keys hash-verify and enforce scopes.
"""

from __future__ import annotations

from tests.conftest import requires_db


@requires_db
def test_bootstrap_env_key_keeps_working(client, namespace):
    response = client.get(f"/v1/memories?namespace={namespace}")
    assert response.status_code == 200


@requires_db
def test_issued_read_only_key_can_read_but_not_write(client, namespace):
    from app.db.session import SessionLocal
    from app.services import api_key_service

    with SessionLocal() as db:
        _, plaintext = api_key_service.create_api_key(
            db, label="reader", scopes=["read"]
        )
    scoped = client.headers.copy()
    scoped["X-API-Key"] = plaintext

    assert client.get(
        f"/v1/memories?namespace={namespace}", headers={"X-API-Key": plaintext}
    ).status_code == 200

    forbidden = client.post(
        "/v1/memories",
        json={"content": "nope", "namespace": namespace},
        headers={"X-API-Key": plaintext},
    )
    assert forbidden.status_code == 403
    assert "write" in forbidden.json()["detail"]


@requires_db
def test_issued_write_key_can_write(client, namespace):
    from app.db.session import SessionLocal
    from app.services import api_key_service

    with SessionLocal() as db:
        _, plaintext = api_key_service.create_api_key(db, label="writer", scopes=["read", "write"])

    created = client.post(
        "/v1/memories",
        json={"content": "issued key write", "namespace": namespace},
        headers={"X-API-Key": plaintext},
    )
    assert created.status_code == 201


@requires_db
def test_unknown_and_revoked_keys_are_401(client, namespace):
    assert (
        client.get(f"/v1/memories?namespace={namespace}", headers={"X-API-Key": "mnemo_garbage"})
        .status_code
        == 401
    )

    from app.db.session import SessionLocal
    from app.services import api_key_service

    with SessionLocal() as db:
        row, plaintext = api_key_service.create_api_key(db, label="shortlived", scopes=["read"])
        api_key_service.deactivate_api_key(db, key_id=row.id)
    assert (
        client.get(f"/v1/memories?namespace={namespace}", headers={"X-API-Key": plaintext}).status_code
        == 401
    )


@requires_db
def test_last_used_at_tracked(client, namespace):
    from datetime import datetime

    from app.db.session import SessionLocal
    from app.services import api_key_service

    with SessionLocal() as db:
        row, plaintext = api_key_service.create_api_key(db, label="tracked", scopes=["read"])
        key_id = row.id
        created_at = row.created_at

    client.get(f"/v1/memories?namespace={namespace}", headers={"X-API-Key": plaintext})

    with SessionLocal() as db:
        refreshed = api_key_service.verify(db, presented=plaintext)
        assert refreshed is not None
    assert created_at is not None and isinstance(created_at, datetime)
    assert key_id is not None
