"""Configuration docs and hosted startup must reflect actual code defaults."""

import asyncio
import runpy
from pathlib import Path

import pytest

from app.core.config import Settings

ROOT = Path(__file__).parents[2]


def test_generated_deployment_reference_matches_settings():
    module = runpy.run_path(str(ROOT / "scripts/export-config-reference.py"))
    assert module["render"]() in (ROOT / "docs/deployment.md").read_text()


@pytest.mark.parametrize("prefix", ["postgres://", "postgresql://", "postgresql+psycopg://"])
def test_hosted_database_urls_keep_encoded_credentials_and_select_psycopg(prefix):
    value = prefix + "user:p%25ss@db.example.test/mnemo?sslmode=require"
    config = Settings(_env_file=None, database_url=value)
    assert config.database_url == "postgresql+psycopg://user:p%25ss@db.example.test/mnemo?sslmode=require"


def test_encoder_warmup_precedes_worker_and_fails_startup_when_unusable(monkeypatch):
    import app.main as main

    events = []
    monkeypatch.setattr(main.settings, "embedding_warmup", True)
    monkeypatch.setattr(main, "embed", lambda text: events.append("encoder"))
    monkeypatch.setattr(main.job_worker, "start_worker", lambda **kwargs: events.append("worker"))
    async def start():
        async with main.lifespan(main.app):
            events.append("serving")
    asyncio.run(start())
    assert events == ["encoder", "worker", "serving"]
    def fail(text):
        raise RuntimeError("incompatible encoder")
    monkeypatch.setattr(main, "embed", fail)
    with pytest.raises(RuntimeError, match="encoder"):
        asyncio.run(start())
    assert events.count("worker") == 1
