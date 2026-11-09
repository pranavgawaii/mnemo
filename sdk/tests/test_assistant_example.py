"""The complete example gates generation and validates model citation references."""

from __future__ import annotations

import json
from unittest.mock import Mock

import httpx
import pytest
from examples.assistant import (
    EvidenceAnswerer,
    GenerationError,
    MemoryAssistant,
    OllamaAnswerer,
)
from mnemo._parsing import parse_context

from .test_context import CONTEXT


def test_safe_context_reaches_answerer_but_pending_or_empty_context_does_not():
    api = Mock()
    answerer = Mock()
    assistant = MemoryAssistant(api, "app", answerer)
    for fields in [
        {"status": "needs_review", "has_pending_review": True, "citations": []},
        {"status": "empty", "has_pending_review": False, "citations": []},
        {"status": "budget_exhausted", "has_pending_review": False, "citations": []},
        {"status": "ready", "has_pending_review": True},
    ]:
        api.context.return_value = parse_context({**CONTEXT, **fields})
        assistant.ask("city")
    answerer.answer.assert_not_called()
    api.context.return_value = parse_context(CONTEXT)
    assistant.ask("city")
    answerer.answer.assert_called_once()
    assert api.context.call_args.kwargs["namespace"] == "app"


def test_evidence_mode_is_explicit_and_retains_citation_labels():
    result = EvidenceAnswerer().answer("city", parse_context(CONTEXT))
    assert result.status == "evidence" and result.text == "[M1] Riya lives in Pune"


def test_ollama_uses_unprivileged_evidence_and_structured_output():
    def respond(request):
        payload = json.loads(request.content)
        assert request.url.path == "/api/chat"
        assert payload["stream"] is False and payload["model"] == "test-model"
        assert payload["messages"][0]["role"] == "system"
        assert "Stored data" not in payload["messages"][0]["content"]
        assert payload["messages"][1]["role"] == "user"
        assert json.loads(payload["messages"][1]["content"])["memory_evidence"] == "Stored data"
        return httpx.Response(200, json={"done": True, "message": {"content": json.dumps({
            "status": "answered", "answer": "Riya lives in Pune [M1].", "citations": ["M1"],
        })}})
    answerer = OllamaAnswerer("test-model", transport=httpx.MockTransport(respond))
    assert answerer.answer("city", parse_context(CONTEXT)).citations == ("M1",)


@pytest.mark.parametrize("output", [
    {"status": "answered", "answer": "Pune", "citations": ["M9"]},
    {"status": "answered", "answer": "Pune", "citations": []},
    {"status": "answered", "answer": "Pune", "citations": ["M1", "M1"]},
    {"status": "insufficient_evidence", "answer": "Unknown", "citations": ["M1"]},
    {"status": "answered", "answer": "", "citations": ["M1"]},
    {"status": "answered", "answer": "Pune", "citations": "M1"},
    {"status": [], "answer": "Pune", "citations": ["M1"]},
    {"answer": "Pune"}, [],
])
def test_invalid_or_invented_model_references_are_rejected(output):
    answerer = OllamaAnswerer("test", transport=httpx.MockTransport(lambda request: httpx.Response(
        200, json={"done": True, "message": {"content": json.dumps(output)}},
    )))
    with pytest.raises(GenerationError):
        answerer.answer("city", parse_context(CONTEXT))


@pytest.mark.parametrize("body", [{"done": False}, {"done": True, "message": {"content": "not JSON"}}, []])
def test_incomplete_or_malformed_ollama_envelopes_fail_clearly(body):
    answerer = OllamaAnswerer("test", transport=httpx.MockTransport(lambda request: httpx.Response(200, json=body)))
    with pytest.raises(GenerationError):
        answerer.answer("city", parse_context(CONTEXT))


def test_model_failure_never_falls_back_to_a_fake_generated_answer():
    def fail(request):
        raise httpx.ConnectError("offline", request=request)
    with pytest.raises(GenerationError):
        OllamaAnswerer("test", transport=httpx.MockTransport(fail)).answer("city", parse_context(CONTEXT))
