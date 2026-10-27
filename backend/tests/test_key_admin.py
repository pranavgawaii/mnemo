"""Key management routes (admin scope) against real Postgres (CI tier)."""

from __future__ import annotations

from tests.conftest import requires_db


@requires_db
def test_create_key_returns_plaintext_once(client, namespace):
    created = client.post(
        "/v1/keys", json={"label": "ci bot", "scopes": ["read", "write"]}
    )
    assert created.status_code == 201
    body = created.json()
    assert body["key"].startswith("mnemo_")
    assert body["key_prefix"] in body["key"]
    assert body["scopes"] == ["read", "write"]

    # Listing shows the prefix, never the plaintext.
    listed = client.get("/v1/keys").json()
    assert any(k["key_prefix"] == body["key_prefix"] for k in listed["items"])
    assert all("key" not in k or k.get("key") is None for k in listed["items"])


@requires_db
def test_issued_key_can_call_the_api_immediately(client, namespace):
    plaintext = client.post("/v1/keys", json={"label": "quick", "scopes": ["read"]}).json()["key"]
    response = client.get(f"/v1/memories?namespace={namespace}", headers={"X-API-Key": plaintext})
    assert response.status_code == 200


@requires_db
def test_revoke_then_401(client, namespace):
    body = client.post("/v1/keys", json={"label": "revoked-soon"}).json()
    key_id, plaintext = body["id"], body["key"]

    assert client.get(f"/v1/memories?namespace={namespace}", headers={"X-API-Key": plaintext}).status_code == 200
    assert client.delete(f"/v1/keys/{key_id}").status_code == 204
    assert (
        client.get(f"/v1/memories?namespace={namespace}", headers={"X-API-Key": plaintext}).status_code
        == 401
    )


@requires_db
def test_rotation_invalidates_old_secret(client, namespace):
    body = client.post("/v1/keys", json={"label": "rotating"}).json()
    key_id, old_plaintext = body["id"], body["key"]

    rotated = client.post(f"/v1/keys/{key_id}/rotate")
    assert rotated.status_code == 200
    new_plaintext = rotated.json()["key"]
    assert new_plaintext != old_plaintext

    assert (
        client.get(f"/v1/memories?namespace={namespace}", headers={"X-API-Key": old_plaintext}).status_code
        == 401
    )
    assert (
        client.get(f"/v1/memories?namespace={namespace}", headers={"X-API-Key": new_plaintext}).status_code
        == 200
    )


@requires_db
def test_key_routes_require_admin_scope(client, namespace):
    plaintext = client.post("/v1/keys", json={"label": "lowly", "scopes": ["read"]}).json()["key"]
    assert client.get("/v1/keys", headers={"X-API-Key": plaintext}).status_code == 403
    assert client.post("/v1/keys", json={"label": "nope"}, headers={"X-API-Key": plaintext}).status_code == 403
