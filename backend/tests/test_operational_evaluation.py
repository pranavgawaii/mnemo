"""Load measurements must count errors, and recovery drills stay local."""

from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest

from evaluation.load import run_load
from evaluation.recovery import local_url, pg_environment


def fake_factory(*, fail_setup=False, wrong_context=False):
    created, deleted = [], []

    class API:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def add_memory(self, content, **kwargs):
            if fail_setup:
                raise httpx.ConnectError("private connection details")
            memory = SimpleNamespace(id=uuid4())
            created.append((memory.id, kwargs["namespace"]))
            return memory, []

        def delete_memory(self, memory_id, *, namespace):
            deleted.append((memory_id, namespace))

        def context(self, query, **kwargs):
            return SimpleNamespace(
                status="ready",
                has_pending_review=False,
                citations=[
                    SimpleNamespace(
                        memory_id=uuid4() if wrong_context else created[0][0], pending_review=False
                    ),
                ],
            )

    return API, created, deleted


def test_load_validates_known_context_and_cleans_only_created_records():
    factory, created, deleted = fake_factory()
    report = run_load(factory, requests=12, concurrency=3, corpus_size=5)
    assert report["passed"] and report["successful_context_checks"] == report["completed"] == 12
    assert sorted(created) == sorted(deleted) and len(created) == 5
    assert len({namespace for _, namespace in created}) == 1
    assert report["cleanup_errors"] == 0


@pytest.mark.parametrize("options", [{"fail_setup": True}, {"wrong_context": True}])
def test_failure_does_not_become_a_zero_latency_success(options):
    factory, created, deleted = fake_factory(**options)
    report = run_load(factory, requests=4, concurrency=2, corpus_size=2)
    assert not report["passed"] and report["setup_error"]
    assert report["latency_including_failures_ms"]["p95"] is None
    assert sorted(created) == sorted(deleted)
    assert "private connection" not in str(report)


@pytest.mark.parametrize(
    "options", [{"requests": 0}, {"requests": True}, {"concurrency": 17}, {"corpus_size": 501}]
)
def test_load_limits_fail_before_constructing_a_client(options):
    def forbidden():
        raise AssertionError("No HTTP should occur")

    with pytest.raises(ValueError):
        run_load(forbidden, **options)


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://user@remote.example/db",
        "postgresql://user@127.0.0.1/db?hostaddr=203.0.113.1",
        "postgresql://user@127.0.0.1/db?service=remote",
        "sqlite:///tmp/test",
    ],
)
def test_recovery_refuses_remote_hosts_and_libpq_redirection(url):
    with pytest.raises(ValueError):
        local_url(url)


def test_postgres_credentials_are_environment_only_and_inherited_redirects_are_removed(monkeypatch):
    monkeypatch.setenv("PGSERVICE", "unexpected-server")
    url = local_url(
        "postgresql+psycopg://operator:p%25ss@/disposable?host=%2Ftmp%2Fprivate&port=55439"
    )
    env = pg_environment(url)
    assert env["PGHOST"] == "/tmp/private" and env["PGPORT"] == "55439"
    assert env["PGPASSWORD"] == "p%ss" and "PGSERVICE" not in env
