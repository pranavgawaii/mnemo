"""Near-duplicate detection on write (CI tier, needs Postgres)."""

from __future__ import annotations

from app.core.config import settings
from tests.conftest import requires_db


@requires_db
def test_flag_mode_reports_duplicate_of(client, namespace):
    first = client.post(
        "/v1/memories",
        json={"content": "Pranav lives in Bengaluru", "namespace": namespace},
    )
    assert first.status_code == 201
    assert first.json()["deduplicated_of"] is None

    second = client.post(
        "/v1/memories",
        json={"content": "Pranav lives in Bengaluru", "namespace": namespace},
    )
    assert second.status_code == 201
    assert second.json()["deduplicated_of"] == first.json()["memory"]["id"]


@requires_db
def test_reject_mode_answers_409(client, namespace, monkeypatch):
    monkeypatch.setattr(settings, "dedup_mode", "reject")
    first = client.post(
        "/v1/memories",
        json={"content": "Team sync happens every Monday", "namespace": namespace},
    )
    assert first.status_code == 201

    second = client.post(
        "/v1/memories",
        json={"content": "Team sync happens every Monday", "namespace": namespace},
    )
    assert second.status_code == 409
    assert "Near-duplicate" in second.json()["detail"]


@requires_db
def test_off_mode_ingests_duplicates(client, namespace, monkeypatch):
    monkeypatch.setattr(settings, "dedup_mode", "off")
    for _ in range(2):
        response = client.post(
            "/v1/memories",
            json={"content": "infra review at 10am", "namespace": namespace},
        )
        assert response.status_code == 201
        assert response.json()["deduplicated_of"] is None


@requires_db
def test_unrelated_memories_never_flagged_as_duplicates(client, namespace):
    first = client.post(
        "/v1/memories", json={"content": "Pranav lives in Bengaluru", "namespace": namespace}
    ).json()["memory"]["id"]
    second = client.post(
        "/v1/memories", json={"content": "The server runs Postgres 16", "namespace": namespace}
    )
    assert second.status_code == 201
    assert second.json()["deduplicated_of"] != first
