"""HTTP semantics and current nested API responses."""

import json
import uuid

import httpx
from mnemo._parsing import parse_contradiction
from mnemo.helpers import remember

from .test_client import MEMORY, make_client


def test_nested_contradiction_matches_server_shape():
    other = {**MEMORY, "id": str(uuid.uuid4())}
    row = parse_contradiction({
        "id": str(uuid.uuid4()), "namespace": "default", "new_memory": MEMORY,
        "existing_memory": other, "similarity": 0.9, "reason": "candidate", "status": "open",
    })
    assert str(row.new_memory_id) == MEMORY["id"]
    assert str(row.existing_memory_id) == other["id"]


def test_retry_after_header_controls_backoff(monkeypatch):
    delays = []
    monkeypatch.setattr("mnemo._retry.sleep_sync", delays.append)
    calls = 0

    def handler(request):
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(429, json={"detail": "limited"}, headers={"Retry-After": "3"})
        return httpx.Response(200, json=MEMORY)

    with make_client(handler) as client:
        client.get_memory(MEMORY["id"])
    assert delays == [3.0]


def test_update_distinguishes_clear_expiry_from_omission():
    sent = []

    def handler(request):
        sent.append(json.loads(request.content))
        return httpx.Response(200, json=MEMORY)

    with make_client(handler) as client:
        client.update_memory(MEMORY["id"], importance=4)
        client.update_memory(MEMORY["id"], expires_at=None)
    assert "expires_at" not in sent[0]
    assert sent[1] == {"expires_at": None}


def test_remember_leaves_conflicts_for_review_by_default():
    paths = []
    flag = {
        "id": str(uuid.uuid4()), "namespace": "default", "new_memory": MEMORY,
        "existing_memory": {**MEMORY, "id": str(uuid.uuid4())},
        "similarity": 0.9, "reason": "candidate", "status": "open",
    }

    def handler(request):
        paths.append(request.url.path)
        return httpx.Response(201, json={"memory": MEMORY, "contradictions": [flag]})

    with make_client(handler) as client:
        _, flags = remember(client, "A changed fact")
    assert flags[0].status == "open"
    assert paths == ["/v1/memories"]


def test_current_statement_is_additive_and_source_content_is_retained():
    source = "Riya moved from Bengaluru to Pune"
    body = {**MEMORY, "content": source, "current_statement": "Riya lives in Pune"}
    with make_client(lambda request: httpx.Response(200, json=body)) as client:
        memory = client.get_memory(MEMORY["id"])
    assert memory.content == source
    assert memory.current_statement == "Riya lives in Pune"
