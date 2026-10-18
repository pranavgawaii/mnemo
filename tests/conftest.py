"""Pytest fixtures.

The API tests exercise the *real* pgvector-backed flow (cosine ops need the real
extension — not mocks). They require a reachable Postgres with the
``vector`` extension available. When none is reachable, those tests are skipped
with a clear message rather than failing, so the pure-logic suite still runs on a
machine without Docker.

Point the tests at a database with:
    export DATABASE_URL=postgresql+psycopg://mnemo:mnemo@localhost:5432/mnemo
"""

from __future__ import annotations

import uuid

import pytest

try:
    from sqlalchemy import text

    from app.core.config import settings
    from app.db.session import Base, engine
    _IMPORT_ERROR: Exception | None = None
except Exception as exc:  # pragma: no cover - only when deps missing
    _IMPORT_ERROR = exc


def _db_available() -> bool:
    """Return True if the configured DB is reachable and pgvector is present."""
    if _IMPORT_ERROR is not None:
        return False
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
        return True
    except Exception:
        return False


requires_db = pytest.mark.skipif(
    not _db_available(),
    reason="No Postgres+pgvector reachable at DATABASE_URL; skipping DB integration tests.",
)


@pytest.fixture(scope="session")
def _schema():
    """Create the schema once for the test session, drop it after."""
    from app.models import models  # noqa: F401 - register tables

    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(_schema):
    """A FastAPI TestClient authenticated with the configured API key."""
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        c.headers.update({"X-API-Key": settings.mnemo_api_key})
        yield c


@pytest.fixture
def namespace() -> str:
    """A unique namespace per test so runs don't interfere."""
    return f"test-{uuid.uuid4().hex[:8]}"
