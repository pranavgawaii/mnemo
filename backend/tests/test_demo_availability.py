"""Probe actual storage and permissions without creating demo records."""

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.db.session import SessionLocal, get_db
from app.main import app
from app.models.models import Memory
from tests.conftest import requires_db


@requires_db
def test_availability_checks_access_without_creating_memories(client, monkeypatch):
    monkeypatch.setattr("app.api.demo.is_model_loaded", lambda: False)
    with SessionLocal() as db:
        before = db.scalar(select(func.count()).select_from(Memory))
    response = client.get("/v1/demo/availability")
    assert response.status_code == 200
    assert response.json() == {"status": "available", "embedding": "cold"}
    monkeypatch.setattr("app.api.demo.is_model_loaded", lambda: True)
    assert client.get("/v1/demo/availability").json()["embedding"] == "warm"
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Memory)) == before


@requires_db
def test_availability_requires_both_read_and_write_scopes(client):
    for scopes in [["read"], ["write"]]:
        key = client.post("/v1/keys", json={"label": "probe", "scopes": scopes}).json()["key"]
        assert client.get("/v1/demo/availability", headers={"X-API-Key": key}).status_code == 403
    assert client.get("/v1/demo/availability", headers={"X-API-Key": "invalid"}).status_code == 401
    key = client.post("/v1/keys", json={"label": "probe", "scopes": ["read", "write"]}).json()["key"]
    assert client.get("/v1/demo/availability", headers={"X-API-Key": key}).status_code == 200


@requires_db
def test_availability_sanitizes_storage_failures(client, monkeypatch):
    class BrokenDatabase:
        def execute(self, *args):
            raise SQLAlchemyError("private connection details")

    monkeypatch.setattr(settings, "rate_limit_enabled", False)
    app.dependency_overrides[get_db] = lambda: BrokenDatabase()
    try:
        response = client.get("/v1/demo/availability")
        assert response.status_code == 503
        assert response.json() == {"detail": "Demo storage unavailable."}
    finally:
        app.dependency_overrides.pop(get_db, None)
