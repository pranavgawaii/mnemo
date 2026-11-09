"""Concurrent namespace readers and writers use bounded database locks."""

from sqlalchemy import func, select, text

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.models import Memory
from app.services import memory_service
from tests.conftest import requires_db


def vector(position=0):
    result = [0.0] * settings.embedding_dim
    result[position] = 1.0
    return result


@requires_db
def test_namespace_queue_is_bounded_and_other_namespaces_are_independent(
    client, namespace, monkeypatch
):
    monkeypatch.setattr(memory_service, "embed", lambda content: vector())
    monkeypatch.setattr(memory_service, "_NAMESPACE_LOCK_TIMEOUT_MS", 50)
    with SessionLocal() as holder:
        holder.execute(text("SET LOCAL lock_timeout = '543ms'"))
        memory_service._lock_namespace(holder, namespace)
        assert holder.scalar(text("SELECT current_setting('lock_timeout')")) == "543ms"
        unrelated = client.post(
            "/v1/memories", json={"content": "Independent note", "namespace": namespace + "-other"}
        )
        assert unrelated.status_code == 201
        blocked = client.post(
            "/v1/memories", json={"content": "Queued note", "namespace": namespace}
        )
        assert blocked.status_code == 503 and blocked.headers["Retry-After"] == "1"
        holder.rollback()
    retry = client.post("/v1/memories", json={"content": "Queued note", "namespace": namespace})
    assert retry.status_code == 201
    with SessionLocal() as db:
        assert (
            db.scalar(select(func.count()).select_from(Memory).where(Memory.namespace == namespace))
            == 1
        )


@requires_db
def test_context_readers_share_locks_without_blocking_each_other(client, namespace, monkeypatch):
    monkeypatch.setattr(memory_service, "_NAMESPACE_LOCK_TIMEOUT_MS", 50)
    with SessionLocal() as first, SessionLocal() as second:
        memory_service._lock_namespace(first, namespace, shared=True)
        memory_service._lock_namespace(second, namespace, shared=True)
        blocked = client.post(
            "/v1/memories", json={"content": "A queued fact", "namespace": namespace}
        )
        assert blocked.status_code == 503
        read = client.post("/v1/context", json={"query": "Unknown fact", "namespace": namespace})
        assert read.status_code == 200 and read.json()["status"] == "empty"
