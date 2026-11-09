"""Migration configuration must retain URL-encoded connection details."""

import runpy
from contextlib import nullcontext
from pathlib import Path

import pytest
from alembic.config import Config

from alembic import context
from app.core.config import settings


@pytest.mark.parametrize("url", [
    "postgresql+psycopg://user:p%25ss@localhost/db",
    "postgresql+psycopg://user@/db?host=%2Ftmp%2Fpg-socket",
])
def test_migration_environment_preserves_encoded_database_urls(monkeypatch, url):
    config = Config()
    captured = {}
    monkeypatch.setattr(settings, "database_url", url)
    monkeypatch.setattr(context, "config", config, raising=False)
    monkeypatch.setattr(context, "is_offline_mode", lambda: True)
    monkeypatch.setattr(context, "configure", lambda **kwargs: captured.update(kwargs))
    monkeypatch.setattr(context, "begin_transaction", nullcontext)
    monkeypatch.setattr(context, "run_migrations", lambda: None)
    runpy.run_path(str(Path(__file__).parents[1] / "alembic/env.py"))
    assert config.get_main_option("sqlalchemy.url") == url
    assert captured["url"] == url
