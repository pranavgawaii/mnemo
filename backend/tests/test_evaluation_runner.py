"""Run labelled evaluations through the SDK transport and exercise CLI failures."""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict

import httpx
import pytest
from mnemo import MnemoClient

from app.core.context import ContextCandidate, pack_context
from evaluation.cases import EvaluationCase
from evaluation.run import evaluate, main

ID = str(uuid.uuid4())


def wire(query="city", namespace="eval", max_chars=4000):
    packed = pack_context([ContextCandidate(uuid.UUID(ID), "Riya lives in Pune", 0.9, 0.8)])
    return json.loads(json.dumps({
        "query": query, "namespace": namespace, "candidate_count": 1,
        **asdict(packed), "max_chars": max_chars,
    }, default=str))


def test_runner_uses_read_only_context_with_fixed_safe_options():
    requests = []
    def respond(request):
        requests.append(request)
        body = json.loads(request.content)
        assert request.method == "POST" and request.url.path == "/v1/context"
        assert body["exclude_conflicts"] and body["current_values"]
        assert body["namespace"] == "eval" and body["tags"] == ["work"]
        return httpx.Response(200, json=wire())
    cases = [EvaluationCase("city", "city", "eval", expected_memory_ids=frozenset([ID]), tags=("work",))]
    with MnemoClient(base_url="https://example.test", api_key="secret", transport=httpx.MockTransport(respond)) as api:
        report = evaluate(api, cases)
    assert report["passed"] == report["cases"] == 1
    assert report["selection_only"] and report["micro_recall"] == 1
    assert len(requests) == 1
    encoded = json.dumps(report)
    assert "Riya lives" not in encoded and "secret" not in encoded


@pytest.mark.parametrize("threshold", [-0.1, 1.1, float("nan"), float("inf")])
def test_runner_rejects_invalid_recall_thresholds_before_http(threshold):
    with pytest.raises(ValueError, match="min_recall"):
        evaluate(None, [EvaluationCase("city", "city", "eval")], min_recall=threshold)


def test_runner_rejects_empty_case_set():
    with pytest.raises(ValueError, match="At least"):
        evaluate(None, [])


def write_case(tmp_path, **options):
    source = tmp_path / "cases.jsonl"
    source.write_text(json.dumps({"id": "city", "query": "city", "namespace": "eval",
                                  "expected_memory_ids": [ID], **options}) + "\n")
    return source


def test_cli_requires_secret_in_environment_without_writing_a_report(tmp_path, monkeypatch, capsys):
    monkeypatch.delenv("MNEMO_API_KEY", raising=False)
    output = tmp_path / "report.json"
    assert main(["--cases", str(write_case(tmp_path)), "--output", str(output)]) == 2
    assert "MNEMO_API_KEY" in capsys.readouterr().err
    assert not output.exists()


@pytest.mark.parametrize("url", ["file:///tmp/test", "https://user:pass@example.test", "localhost:8000", "https://"])
def test_cli_rejects_invalid_or_credential_bearing_urls(tmp_path, monkeypatch, url):
    monkeypatch.setenv("MNEMO_API_KEY", "private")
    assert main(["--cases", str(write_case(tmp_path)), "--output", str(tmp_path / "out.json"), "--base-url", url]) == 2


def test_cli_writes_complete_report_and_returns_failure_for_a_missed_label(tmp_path, monkeypatch):
    monkeypatch.setenv("MNEMO_API_KEY", "private")
    real_client = MnemoClient
    monkeypatch.setattr("mnemo.MnemoClient", lambda **kwargs: real_client(
        **kwargs, transport=httpx.MockTransport(lambda request: httpx.Response(200, json=wire())),
    ))
    output = tmp_path / "report.json"
    source = write_case(tmp_path, expected_memory_ids=[str(uuid.uuid4())])
    assert main(["--cases", str(source), "--output", str(output)]) == 1
    report = json.loads(output.read_text())
    assert report["failed"] == 1 and report["micro_recall"] == 0
    assert report["format_version"] == 2


def test_cli_does_not_overwrite_its_labels(tmp_path, monkeypatch):
    monkeypatch.setenv("MNEMO_API_KEY", "private")
    source = write_case(tmp_path)
    original = source.read_bytes()
    assert main(["--cases", str(source), "--output", str(source)]) == 2
    assert source.read_bytes() == original


@pytest.mark.parametrize("failure", ["connection", "forbidden", "broken_response"])
def test_failed_http_or_contract_does_not_emit_a_successful_report(tmp_path, monkeypatch, capsys, failure):
    monkeypatch.setenv("MNEMO_API_KEY", "private")
    def respond(request):
        if failure == "connection":
            raise httpx.ConnectError("sensitive connection info", request=request)
        if failure == "forbidden":
            return httpx.Response(403, json={"detail": "sensitive server text"})
        return httpx.Response(200, json={"unexpected": "body"})
    real_client = MnemoClient
    monkeypatch.setattr("mnemo.MnemoClient", lambda **kwargs: real_client(
        **kwargs, transport=httpx.MockTransport(respond),
    ))
    output = tmp_path / "out.json"
    result = main(["--cases", str(write_case(tmp_path)), "--output", str(output)])
    assert result == 2 and not output.exists()
    captured = capsys.readouterr()
    assert "sensitive" not in captured.err and "private" not in captured.err


@pytest.mark.parametrize("timeout", ["0", "-1", "nan", "inf"])
def test_cli_rejects_invalid_timeout(tmp_path, monkeypatch, timeout):
    monkeypatch.setenv("MNEMO_API_KEY", "private")
    assert main(["--cases", str(write_case(tmp_path)), "--output", str(tmp_path / "out.json"), f"--timeout={timeout}"]) == 2
