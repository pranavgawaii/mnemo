"""LLM verdict hook tests — hermetic (httpx calls are monkeypatched)."""

from __future__ import annotations

import pytest

from app.core.config import settings
from app.core.llm import OpenAiCompatibleProvider, build_llm_check


def test_no_provider_configured_returns_none():
    assert build_llm_check(settings) is None


def test_provider_without_api_key_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "contradiction_llm_provider", "openai")
    monkeypatch.setattr(settings, "contradiction_llm_api_key", "")
    assert build_llm_check(settings) is None


def test_unknown_provider_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "contradiction_llm_provider", "skynet")
    assert build_llm_check(settings) is None


def test_build_llm_check_returns_callable(monkeypatch):
    monkeypatch.setattr(settings, "contradiction_llm_provider", "openai")
    monkeypatch.setattr(settings, "contradiction_llm_api_key", "sk-test")
    check = build_llm_check(settings)
    assert callable(check)


def _fake_response(payload: dict) -> object:
    class _Resp:
        def raise_for_status(self) -> None:
            pass

        def json(self) -> dict:
            return payload

    return _Resp()


def test_provider_parses_json_verdict(monkeypatch):
    import httpx

    captured: dict = {}

    def fake_post(url: str, **kwargs: object) -> object:
        captured["url"] = url
        captured["json"] = kwargs.get("json")
        return _fake_response(
            {
                "choices": [
                    {
                        "message": {
                            "content": '{"contradiction": true, "reason": "locations differ"}'
                        }
                    }
                ]
            }
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    provider = OpenAiCompatibleProvider(api_key="sk-test", model="m")
    verdict = provider.check("Pranav lives in Pune", "Pranav lives in Berlin", 0.9)
    assert verdict == (True, "locations differ")
    assert captured["url"].endswith("/chat/completions")
    assert captured["json"]["temperature"] == 0


def test_provider_defers_on_network_error(monkeypatch):
    import httpx

    def fake_post(url: str, **kwargs: object) -> object:
        raise httpx.ConnectError("boom")

    monkeypatch.setattr(httpx, "post", fake_post)
    provider = OpenAiCompatibleProvider(api_key="sk-test", model="m")
    assert provider.check("a", "b", 0.9) is None


def test_provider_defers_on_malformed_response(monkeypatch):
    import httpx

    monkeypatch.setattr(httpx, "post", lambda url, **kw: _fake_response({"choices": []}))
    provider = OpenAiCompatibleProvider(api_key="sk-test", model="m")
    assert provider.check("a", "b", 0.9) is None


def test_settings_default_keeps_writes_llm_free():
    # The heuristic-only default is a product promise; lock it in.
    assert settings.contradiction_llm_provider == ""


@pytest.mark.parametrize("similarity", [0.5, 0.95])
def test_provider_accepts_any_similarity(similarity: float, monkeypatch):
    import httpx

    monkeypatch.setattr(
        httpx,
        "post",
        lambda url, **kw: _fake_response(
            {"choices": [{"message": {"content": '{"contradiction": false}'}}]}
        ),
    )
    provider = OpenAiCompatibleProvider(api_key="sk-test", model="m")
    assert provider.check("a", "b", similarity) == (False, "llm verdict")
