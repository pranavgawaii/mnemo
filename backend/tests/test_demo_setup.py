"""Demo setup protects secrets and preserves other local environment variables."""

from __future__ import annotations

import runpy
import stat
from pathlib import Path

import pytest

SCRIPT = Path(__file__).parents[2] / "scripts/connect-live-demo.py"


def test_environment_update_is_private_and_preserves_unrelated_values(tmp_path):
    module = runpy.run_path(str(SCRIPT))
    path = tmp_path / ".env.local"
    path.write_text("# existing\nOTHER_SECRET=keep-me\nMNEMO_DEMO_API_KEY=old\nMNEMO_DEMO_API_KEY=duplicate\n")
    module["write_environment"](path, {"MNEMO_DEMO_API_KEY": "new", "MNEMO_DEMO_API_URL": "http://127.0.0.1:8000"})
    text = path.read_text()
    assert "OTHER_SECRET=keep-me" in text and "# existing" in text
    assert text.count("MNEMO_DEMO_API_KEY=") == 1 and "MNEMO_DEMO_API_KEY=new" in text
    assert stat.S_IMODE(path.stat().st_mode) == 0o600


def test_setup_writes_an_issued_key_without_echoing_secrets(tmp_path, monkeypatch, capsys):
    module = runpy.run_path(str(SCRIPT))
    main = module["main"]
    monkeypatch.setenv("MNEMO_API_KEY", "operator-secret")
    issued = "mnemo_" + "x" * 32
    calls = []
    def api(base, path, key, payload=None):
        calls.append((path, key, payload))
        return {"id": "key-id", "key": issued} if path == "/v1/keys" else {"status": "available"}
    monkeypatch.setitem(main.__globals__, "api_json", api)
    env = tmp_path / ".env.local"
    assert main(["--api-url", "http://127.0.0.1:8000", "--env-file", str(env)]) == 0
    assert issued in env.read_text() and "operator-secret" not in env.read_text()
    assert calls[1][2]["scopes"] == ["read", "write"] and "admin" not in calls[1][2]["scopes"]
    captured = capsys.readouterr()
    assert issued not in captured.out and "operator-secret" not in captured.out


def test_setup_does_not_write_secrets_to_a_tracked_template(tmp_path, monkeypatch):
    main = runpy.run_path(str(SCRIPT))["main"]
    monkeypatch.setenv("MNEMO_API_KEY", "private")
    destination = tmp_path / ".env.example"
    with pytest.raises(SystemExit):
        main(["--api-url", "http://127.0.0.1:8000", "--env-file", str(destination)])
    assert not destination.exists()
