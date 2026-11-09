"""Exercise the reusable workflow report and assistant against real pgvector API calls."""

from __future__ import annotations

import json
import uuid

import httpx
from examples.assistant import EvidenceAnswerer, MemoryAssistant, run_demo
from mnemo import MnemoClient

from evaluation.lifecycle import run_suite
from tests.conftest import requires_db


def sdk_transport(client):
    def respond(request):
        response = client.request(request.method, str(request.url),
                                  headers=dict(request.headers), content=request.content)
        # TestClient has already decoded the body. Do not send its original gzip
        # header to the SDK and ask httpx to decompress the same response twice.
        headers = {name: value for name, value in response.headers.items()
                   if name.lower() not in {"content-encoding", "content-length"}}
        return httpx.Response(response.status_code, content=response.content, headers=headers)
    return httpx.MockTransport(respond)


@requires_db
def test_lifecycle_suite_runs_real_requests_and_preserves_source_history(client):
    with MnemoClient(base_url="http://testserver", api_key=client.headers["X-API-Key"], transport=sdk_transport(client)) as api:
        report = run_suite(api)
    assert report["scenarios"] == 7
    assert report["failed"] == 0, report["results"]
    assert report["checks"] == 27
    assert report["passed"] == report["checks"] and report["failed"] == report["cleanup_errors"] == 0
    assert "Riya lives" not in json.dumps(report)


@requires_db
def test_assistant_city_review_persists_across_client_sessions(client, namespace, capsys):
    key = client.post("/v1/keys", json={"label": "assistant integration", "scopes": ["read", "write"], "namespaces": [namespace]}).json()["key"]
    with MnemoClient(base_url="http://testserver", api_key=key, transport=sdk_transport(client)) as api:
        run_demo(MemoryAssistant(api, namespace, EvidenceAnswerer()))
    assert "Before: [M1] Pranav lives in Bengaluru" in capsys.readouterr().out
    with MnemoClient(base_url="http://testserver", api_key=key, transport=sdk_transport(client)) as reopened:
        answer = MemoryAssistant(reopened, namespace, EvidenceAnswerer()).ask("Where does Pranav live?")
    assert answer.text == "[M1] Pranav lives in Pune"


@requires_db
def test_demo_refuses_an_existing_namespace_without_changing_it(client, namespace):
    from pytest import raises

    original = client.post("/v1/memories", json={"namespace": namespace, "content": "Keep this existing fact"}).json()["memory"]
    with MnemoClient(base_url="http://testserver", api_key=client.headers["X-API-Key"], transport=sdk_transport(client)) as api:
        with raises(ValueError, match="empty namespace"):
            run_demo(MemoryAssistant(api, namespace, EvidenceAnswerer()))
    assert client.get(f"/v1/memories/{uuid.UUID(original['id'])}").json()["content"] == original["content"]
