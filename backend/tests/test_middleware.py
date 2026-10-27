"""Hardening middleware tests. Uses TestClient against /health - no database.

These run with the full-suite dependencies (fastapi + httpx installed); the
hermetic logic job only picks the stdlib-only test files.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_security_headers_present(client):
    response = client.get("/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_request_id_echoed(client):
    response = client.get("/health", headers={"X-Request-ID": "test-id-123"})
    assert response.headers["X-Request-ID"] == "test-id-123"


def test_request_id_generated_when_missing(client):
    response = client.get("/health")
    assert len(response.headers["X-Request-ID"]) == 32


def test_oversized_body_rejected(monkeypatch):
    monkeypatch.setattr(settings, "max_body_bytes", 10)
    with TestClient(app) as c:
        response = c.post(
            "/v1/memories",
            json={"content": "this body is definitely larger than ten bytes"},
        )
    assert response.status_code == 413


def test_cors_allowlist():
    from fastapi import FastAPI

    from app.main import _install_cors

    fresh = FastAPI()

    @fresh.get("/ping")
    def ping() -> dict[str, str]:
        return {"status": "ok"}

    _install_cors(fresh, ["http://localhost:3005"])
    with TestClient(fresh) as c:
        response = c.get("/ping", headers={"Origin": "http://localhost:3005"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:3005"

    unconfigured = FastAPI()

    @unconfigured.get("/ping")
    def ping2() -> dict[str, str]:
        return {"status": "ok"}

    _install_cors(unconfigured, [])
    with TestClient(unconfigured) as c:
        response = c.get("/ping", headers={"Origin": "http://localhost:3005"})
    assert "access-control-allow-origin" not in response.headers


def test_cors_off_by_default(client):
    response = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in response.headers
