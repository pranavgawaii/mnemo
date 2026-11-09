"""Sync/async context contracts and provider-neutral tools without live services."""

from __future__ import annotations

import asyncio
import copy
import json
import uuid

import httpx
import pytest
from mnemo import AsyncMnemoClient, ForbiddenError, MnemoClient, NotFoundError
from mnemo.agent import AgentMemory, ToolInputError

from .test_client import MEMORY

MEMORY_ID = str(uuid.uuid4())
CONTEXT = {
    "query": "Where does Riya live?", "namespace": "agent", "status": "ready",
    "context": "Stored data", "used_chars": 11, "max_chars": 4000,
    "has_pending_review": False, "candidate_count": 1,
    "citations": [{
        "citation": "M1", "memory_id": MEMORY_ID, "text": "Riya lives in Pune",
        "source_content": "Riya moved from Bengaluru to Pune", "used_current_statement": True,
        "similarity": 0.9, "relevance_score": 0.8, "pending_review": False,
    }],
    "decisions": [{"memory_id": MEMORY_ID, "rank": 1, "reason": "included", "citation": "M1"}],
}


def client(handler, **options):
    return MnemoClient(base_url="https://example.test", api_key="private", default_namespace="agent",
                       transport=httpx.MockTransport(handler), **options)


def test_sync_context_sends_defaults_and_parses_provenance():
    def respond(request):
        assert request.method == "POST" and request.url.path == "/v1/context"
        assert request.headers["X-API-Key"] == "private"
        payload = json.loads(request.content)
        assert payload == {
            "query": "Where does Riya live?", "namespace": "agent", "candidate_limit": 30,
            "max_chars": 4000, "min_similarity": 0.25, "current_values": True,
            "exclude_conflicts": True, "tags": [], "diversity": 0.0,
        }
        return httpx.Response(200, json=CONTEXT)

    with client(respond) as api:
        result = api.context("Where does Riya live?")
    assert result.status == "ready"
    citation = result.citations[0]
    assert citation.memory_id == uuid.UUID(MEMORY_ID)
    assert citation.text == "Riya lives in Pune"
    assert citation.source_content == "Riya moved from Bengaluru to Pune"
    assert citation.used_current_statement
    assert result.decisions[0].citation == "M1"


def test_all_context_options_are_forwarded_without_boolean_or_zero_loss():
    sent = []
    with client(lambda request: sent.append(json.loads(request.content)) or httpx.Response(200, json=CONTEXT)) as api:
        api.context("city", namespace="other", candidate_limit=12, max_chars=600,
                    min_similarity=-0.1, current_values=False, exclude_conflicts=False,
                    tags=["work"], keyword_weight=0, diversity=0.3)
    assert sent[0] == {
        "query": "city", "namespace": "other", "candidate_limit": 12, "max_chars": 600,
        "min_similarity": -0.1, "current_values": False, "exclude_conflicts": False,
        "tags": ["work"], "keyword_weight": 0, "diversity": 0.3,
    }


def test_empty_context_is_not_replaced_with_a_fabricated_prompt():
    body = {**CONTEXT, "status": "empty", "context": "", "used_chars": 0,
            "citations": [], "decisions": [], "candidate_count": 0}
    with client(lambda request: httpx.Response(200, json=body)) as api:
        result = api.context("unknown")
    assert result.context == "" and result.citations == []


@pytest.mark.parametrize("status,error", [(403, ForbiddenError), (404, NotFoundError)])
def test_errors_propagate_without_falling_back_to_unbounded_search(status, error):
    calls = []
    def respond(request):
        calls.append(request.url.path)
        return httpx.Response(status, json={"detail": "unavailable"})
    with client(respond) as api, pytest.raises(error):
        api.context("query")
    assert calls == ["/v1/context"]


def test_async_context_has_the_same_payload_and_typed_models():
    async def run():
        calls = []
        def respond(request):
            calls.append(json.loads(request.content))
            return httpx.Response(200, json=CONTEXT)
        async with AsyncMnemoClient(base_url="https://example.test", api_key="private",
                                   default_namespace="agent", transport=httpx.MockTransport(respond)) as api:
            result = await api.context("Where does Riya live?", max_chars=600, keyword_weight=0)
        assert result.citations[0].memory_id == uuid.UUID(MEMORY_ID)
        assert calls[0]["max_chars"] == 600 and calls[0]["keyword_weight"] == 0
        assert calls[0]["exclude_conflicts"] and calls[0]["current_values"]
    asyncio.run(run())


def test_tool_definitions_are_fresh_and_writes_are_disabled_by_default():
    with client(lambda request: httpx.Response(500)) as api:
        tools = AgentMemory(api, namespace="agent")
        definitions = tools.definitions()
        assert [item["name"] for item in definitions] == ["mnemo_recall"]
        definitions[0]["parameters"]["properties"]["query"]["maxLength"] = 99999
        assert tools.definitions()[0]["parameters"]["properties"]["query"]["maxLength"] == 8000
        with pytest.raises(ToolInputError, match="disabled"):
            tools.call("mnemo_remember", {"content": "A fact"})


def test_tool_recall_owns_namespace_budget_and_review_policy():
    sent = []
    with client(lambda request: sent.append(json.loads(request.content)) or httpx.Response(200, json=CONTEXT)) as api:
        tools = AgentMemory(api, namespace="agent", max_chars=700, min_similarity=0.4)
        result = tools.call("mnemo_recall", '{"query":"Where does Riya live?"}')
    assert result["status"] == "ready"
    assert result["citations"][0]["memory_id"] == MEMORY_ID
    assert sent[0]["namespace"] == "agent" and sent[0]["max_chars"] == 700
    assert sent[0]["min_similarity"] == 0.4
    assert sent[0]["exclude_conflicts"] and sent[0]["current_values"]
    json.dumps(result)  # No UUIDs or dataclass instances escape into tool JSON.


@pytest.mark.parametrize("arguments", [
    "not JSON", "[]", "null", "1", {}, {"query": ""}, {"query": " "},
    {"query": True}, {"query": "x" * 8001}, {"query": "q", "namespace": "foreign"},
    {"query": "q", "exclude_conflicts": False}, {"query": "q", "max_chars": 32000},
])
def test_invalid_tool_arguments_fail_before_any_http_request(arguments):
    sent = []
    with client(lambda request: sent.append(request) or httpx.Response(500)) as api:
        tools = AgentMemory(api, namespace="agent")
        with pytest.raises(ToolInputError):
            tools.call("mnemo_recall", arguments)
    assert sent == []


def test_unknown_tool_cannot_reach_an_arbitrary_endpoint():
    with client(lambda request: pytest.fail("unexpected HTTP")) as api:
        tools = AgentMemory(api, namespace="agent", allow_writes=True)
        with pytest.raises(ToolInputError):
            tools.call("/v1/keys", {"scopes": ["admin"]})


def test_explicit_write_tool_hands_conflicts_to_review_without_resolving_them():
    paths = []
    conflict_id = str(uuid.uuid4())
    def respond(request):
        paths.append(request.url.path)
        assert json.loads(request.content)["namespace"] == "agent"
        return httpx.Response(201, json={"memory": MEMORY, "contradictions": [{
            "id": conflict_id, "namespace": "agent", "new_memory": MEMORY,
            "existing_memory": {**MEMORY, "id": str(uuid.uuid4())}, "similarity": 0.9,
            "reason": "changed fact", "status": "open",
        }]})
    with client(respond) as api:
        tools = AgentMemory(api, namespace="agent", allow_writes=True)
        assert len(tools.definitions()) == 2
        result = tools.call("mnemo_remember", {"content": "Riya moved to Pune"})
    assert result["status"] == "needs_review"
    assert result["conflicts"] == [{"id": conflict_id, "status": "open"}]
    assert paths == ["/v1/memories"]


def test_pending_review_is_preserved_in_read_tool_result():
    body = copy.deepcopy(CONTEXT)
    body.update(status="needs_review", context="", used_chars=0, citations=[], has_pending_review=True)
    with client(lambda request: httpx.Response(200, json=body)) as api:
        result = AgentMemory(api, namespace="agent").call("mnemo_recall", {"query": "city"})
    assert result == {"status": "needs_review", "context": "", "has_pending_review": True, "citations": []}


@pytest.mark.parametrize("options", [
    {"namespace": ""}, {"namespace": " a"}, {"namespace": "x" * 129},
    {"max_chars": True}, {"max_chars": 127}, {"max_chars": 32001},
    {"min_similarity": float("nan")}, {"min_similarity": 2},
])
def test_adapter_configuration_is_validated(options):
    with client(lambda request: httpx.Response(500)) as api, pytest.raises(ValueError):
        AgentMemory(api, **{"namespace": "agent", **options})
