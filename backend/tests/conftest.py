"""Pytest fixtures.

The API tests exercise the *real* pgvector-backed flow (cosine ops need the real
extension — not mocks). They require a reachable Postgres with the
``vector`` extension available. When none is reachable, those tests are skipped
with a clear message rather than failing, so the pure-logic suite still runs on a
machine without Docker.

Point tests at an explicitly disposable database with:
    export MNEMO_TEST_DATABASE_URL=postgresql+psycopg://mnemo:mnemo@localhost:5432/mnemo_test_local
"""

from __future__ import annotations

import os
import uuid

import pytest

try:
    from sqlalchemy import text
    from sqlalchemy.engine import make_url

    from app.core.config import settings
    # Never create or drop tables in the normal application database.
    # Integration tests require an explicitly named disposable database.
    test_url = os.environ.get("MNEMO_TEST_DATABASE_URL")
    if test_url:
        database = make_url(test_url).database or ""
        if not database.startswith("mnemo_test_"):
            raise RuntimeError("MNEMO_TEST_DATABASE_URL must name a mnemo_test_* database.")
        settings.database_url = test_url
    else:
        raise RuntimeError("Set MNEMO_TEST_DATABASE_URL to a disposable mnemo_test_* database.")
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


_DB_READY = _db_available()
if os.environ.get("MNEMO_TEST_DATABASE_URL") and not _DB_READY:
    raise pytest.UsageError(
        f"Disposable test database unavailable or invalid: {_IMPORT_ERROR or 'connection failed'}"
    )
requires_db = pytest.mark.skipif(
    not _DB_READY,
    reason="Set MNEMO_TEST_DATABASE_URL to a disposable mnemo_test_* pgvector database.",
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

    # Tests explicitly drive jobs; background consumers must not steal claims.
    previous = settings.job_worker_enabled
    settings.job_worker_enabled = False
    try:
        with TestClient(app) as c:
            c.headers.update({"X-API-Key": settings.mnemo_api_key})
            yield c
    finally:
        settings.job_worker_enabled = previous


@pytest.fixture
def namespace() -> str:
    """A unique namespace per test so runs don't interfere."""
    return f"test-{uuid.uuid4().hex[:8]}"
