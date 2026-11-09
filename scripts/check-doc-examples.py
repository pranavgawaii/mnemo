"""Validate tutorial responses and execute the documented SDK calls without a server.

From backend: .venv/bin/python ../scripts/check-doc-examples.py
"""

from __future__ import annotations

import contextlib
import io
import json
import re
import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "sdk"))

import httpx
from app.models.schemas import (
    MemoryCreate,
    MemoryCreateResult,
    SearchRequest,
    SearchResponse,
)
from mnemo import MnemoClient

responses = json.loads((ROOT / "lib/api/example-responses.json").read_text())
MemoryCreateResult.model_validate(responses["store"])
SearchResponse.model_validate(responses["search"])
source = (ROOT / "lib/api/examples.ts").read_text()


def template(name: str) -> str:
    match = re.search(rf"(?:export )?const {name} = `(.+?)`;", source, re.DOTALL)
    if not match:
        raise AssertionError(f"Missing documented example: {name}")
    return match.group(1)


payloads: dict[str, dict] = {}
for constant, model, path in [
    ("STORE_MEMORY", MemoryCreate, "/v1/memories"),
    ("SEARCH_MEMORY", SearchRequest, "/v1/memories/search"),
]:
    body = re.search(r"-d '(.+)'", template(constant), re.DOTALL)
    assert body is not None, constant
    payload = json.loads(body.group(1))
    model.model_validate(payload)
    payloads[path] = payload

calls: list[str] = []


def respond(request: httpx.Request) -> httpx.Response:
    assert request.method == "POST"
    assert request.headers["X-API-Key"] == "dev-local-key-change-me"
    payload = json.loads(request.content)
    for key, expected in payloads[request.url.path].items():
        assert payload[key] == expected, f"SDK and cURL disagree on {key}"
    calls.append(request.url.path)
    storing = request.url.path == "/v1/memories"
    return httpx.Response(
        201 if storing else 200, json=responses["store" if storing else "search"]
    )


def example_client(**kwargs: object) -> MnemoClient:
    return MnemoClient(**kwargs, transport=httpx.MockTransport(respond))


for constant in ["PYTHON_STORE", "PYTHON_SEARCH"]:
    code = template(constant).replace("${PYTHON_CLIENT}", template("PYTHON_CLIENT"))
    with (
        patch("mnemo.MnemoClient", example_client),
        contextlib.redirect_stdout(io.StringIO()),
    ):
        # Execute only checked-in tutorial text against the mocked transport.
        exec(compile(code, constant, "exec"), {})  # noqa: S102
assert calls == ["/v1/memories", "/v1/memories/search"]

# Execute the displayed adapter with the real SDK and a fake model boundary.
adapter_scope: dict = {}
adapter_code = template("AGENT_INTEGRATION").replace(r"\\", "\\")
exec(compile(adapter_code, "AGENT_INTEGRATION", "exec"), adapter_scope)  # noqa: S102
answer_with_memory = adapter_scope["answer_with_memory"]
generation_prompts: list[str] = []
scenario = "found"
integration_calls: list[str] = []


def integration_response(request: httpx.Request) -> httpx.Response:
    assert request.headers["X-API-Key"] == "dev-local-key-change-me"
    integration_calls.append(request.url.path)
    if request.url.path == "/v1/contradictions":
        assert request.method == "GET"
        assert request.url.params["namespace"] == "demo"
        assert request.url.params["status"] == "open"
        assert request.url.params["limit"] == "1"
        conflicts = []
        if scenario == "conflict":
            conflicts = [
                {
                    "id": "00000000-0000-0000-0000-000000000099",
                    "namespace": "demo",
                    "new_memory_id": responses["store"]["memory"]["id"],
                    "existing_memory_id": "00000000-0000-0000-0000-000000000098",
                    "similarity": 0.9,
                    "reason": "Possible change",
                    "status": "open",
                }
            ]
        return httpx.Response(
            200,
            json={"items": conflicts, "total": len(conflicts), "limit": 1, "offset": 0},
        )
    assert request.method == "POST" and request.url.path == "/v1/memories/search"
    assert json.loads(request.content)["namespace"] == "demo"
    payload = responses["search"] if scenario == "found" else {"hits": []}
    return httpx.Response(200, json=payload)


def generate(prompt: str) -> str:
    generation_prompts.append(prompt)
    assert "Pranav lives in Bengaluru" in prompt
    assert "\nquestion: Where does Pranav live?" in prompt
    return "Pranav lives in Bengaluru."


with MnemoClient(
    base_url="http://localhost:8000",
    api_key="dev-local-key-change-me",
    default_namespace="demo",
    transport=httpx.MockTransport(integration_response),
) as client:
    assert (
        answer_with_memory(client, "Where does Pranav live?", generate)
        == "Pranav lives in Bengaluru."
    )
    scenario = "empty"
    assert "do not have a stored fact" in answer_with_memory(
        client, "Unknown topic?", generate
    )
    scenario = "conflict"
    assert "Review open memory conflicts" in answer_with_memory(
        client, "Where does Pranav live?", generate
    )
assert len(generation_prompts) == 1, (
    "Empty results and pending review must skip generation"
)
assert integration_calls == [
    "/v1/contradictions",
    "/v1/memories/search",
    "/v1/contradictions",
    "/v1/memories/search",
    "/v1/contradictions",
]
scenario = "found"


def handoff_client(**kwargs: object) -> MnemoClient:
    return MnemoClient(**kwargs, transport=httpx.MockTransport(integration_response))


handoff_scope = {
    **adapter_scope,
    "MnemoClient": handoff_client,
    "your_model_call": generate,
}
with contextlib.redirect_stdout(io.StringIO()) as output:
    exec(compile(template("AGENT_HANDOFF"), "AGENT_HANDOFF", "exec"), handoff_scope)  # noqa: S102
assert output.getvalue().strip() == "Pranav lives in Bengaluru."
print(
    "Tutorial requests, response schemas, SDK calls and agent hand-off agree (no live services)."
)
