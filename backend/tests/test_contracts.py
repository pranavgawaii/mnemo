"""Contract tests: exact response key sets for every API model.

The hermetic half pins each response model's field set — a key added or
removed silently breaks this test, which is exactly what a contract is for.
The CI-tier half exercises the real routes and checks the JSON a client
actually receives (aliases included, e.g. ``metadata``).
"""

from __future__ import annotations

from pydantic import BaseModel

from app.models.schemas import (
    ApiKeyCreated,
    ApiKeyList,
    ApiKeyOut,
    AuditEventList,
    AuditEventOut,
    BulkMemoryResult,
    BulkMemoryResultItem,
    ContradictionList,
    ContradictionOut,
    MemoryCreateResult,
    MemoryList,
    MemoryOut,
    NamespaceList,
    NamespaceOut,
    NamespaceStats,
    SearchHit,
    SearchResponse,
    WebhookCreated,
    WebhookList,
    WebhookOut,
)

CONTRACTS: dict[str, type[BaseModel]] = {
    "MemoryOut": MemoryOut,
    "MemoryCreateResult": MemoryCreateResult,
    "MemoryList": MemoryList,
    "BulkMemoryResult": BulkMemoryResult,
    "BulkMemoryResultItem": BulkMemoryResultItem,
    "SearchResponse": SearchResponse,
    "SearchHit": SearchHit,
    "ContradictionOut": ContradictionOut,
    "ContradictionList": ContradictionList,
    "NamespaceOut": NamespaceOut,
    "NamespaceList": NamespaceList,
    "NamespaceStats": NamespaceStats,
    "ApiKeyOut": ApiKeyOut,
    "ApiKeyCreated": ApiKeyCreated,
    "ApiKeyList": ApiKeyList,
    "AuditEventOut": AuditEventOut,
    "AuditEventList": AuditEventList,
    "WebhookOut": WebhookOut,
    "WebhookCreated": WebhookCreated,
    "WebhookList": WebhookList,
}

EXPECTED_FIELDS: dict[str, set[str]] = {
    "MemoryOut": {"id", "namespace", "content", "importance", "is_active", "tags", "meta", "expires_at", "created_at", "updated_at"},
    "MemoryCreateResult": {"memory", "contradictions", "deduplicated_of"},
    "MemoryList": {"items", "total", "limit", "offset", "next_cursor"},
    "BulkMemoryResult": {"created", "errors", "results"},
    "BulkMemoryResultItem": {"index", "status", "memory", "contradictions", "error"},
    "SearchResponse": {"query", "namespace", "hits"},
    "SearchHit": {"memory", "similarity", "relevance_score", "age_days"},
    "ContradictionOut": {
        "id", "namespace", "similarity", "reason", "status",
        "new_memory", "existing_memory", "resolved_winner_id", "created_at", "resolved_at",
    },
    "ContradictionList": {"items", "total", "limit", "offset", "next_cursor"},
    "NamespaceOut": {"name", "decay_half_life_days", "decay_floor", "contradiction_sim_threshold", "created_at", "total_memories"},
    "NamespaceList": {"items", "total"},
    "NamespaceStats": {
        "namespace", "total_memories", "active_memories", "inactive_memories",
        "open_contradictions", "resolved_contradictions", "average_importance",
        "oldest_memory_at", "newest_memory_at", "importance_counts",
    },
    "ApiKeyOut": {"id", "label", "key_prefix", "scopes", "is_active", "created_at", "last_used_at", "rate_limit_per_minute"},
    "ApiKeyCreated": {"id", "label", "key_prefix", "scopes", "is_active", "created_at", "last_used_at", "rate_limit_per_minute", "key"},
    "ApiKeyList": {"items", "total"},
    "AuditEventOut": {"id", "namespace", "action", "resource_type", "resource_id", "actor_key_id", "request_id", "details", "created_at"},
    "AuditEventList": {"items", "total", "limit", "offset"},
    "WebhookOut": {"id", "namespace", "url", "is_active", "created_at"},
    "WebhookCreated": {"id", "namespace", "url", "is_active", "created_at", "secret"},
    "WebhookList": {"items", "total"},
}


def test_every_model_is_under_contract():
    """No response model may bypass the contract table."""
    from app.models import schemas

    listed = set(CONTRACTS)
    response_models = {
        name
        for name, value in vars(schemas).items()
        if isinstance(value, type)
        and issubclass(value, BaseModel)
        and name.endswith(("Out", "List", "Result", "Created", "Response", "Stats"))
        and not name.startswith("MemoryExport")
    }
    missing = response_models - listed
    assert not missing, f"response models without a contract: {sorted(missing)}"


def test_contract_key_sets_are_pinned():
    for name, model in CONTRACTS.items():
        assert set(model.model_fields) == EXPECTED_FIELDS[name], (
            f"{name} fields changed: "
            f"+{set(model.model_fields) - EXPECTED_FIELDS[name]} "
            f"-{EXPECTED_FIELDS[name] - set(model.model_fields)}"
        )


def test_memory_metadata_uses_json_alias():
    # FastAPI serializes with by_alias=True, so clients see "metadata".
    assert MemoryOut.model_fields["meta"].serialization_alias == "metadata"
    assert ApiKeyCreated.model_fields["key"].is_required()


# --------------------------------------------------------------------------- #
# CI tier: the JSON clients actually receive
# --------------------------------------------------------------------------- #
from tests.conftest import requires_db  # noqa: E402

MEMORY_KEYS = sorted(EXPECTED_FIELDS["MemoryOut"])


@requires_db
def test_memory_create_contract(client, namespace):
    response = client.post(
        "/v1/memories",
        json={"content": "Contract fact one", "namespace": namespace},
    )
    assert response.status_code == 201
    body = response.json()
    assert sorted(body) == ["contradictions", "deduplicated_of", "memory"]
    assert sorted(body["memory"]) == MEMORY_KEYS


@requires_db
def test_memory_list_contract(client, namespace):
    client.post("/v1/memories", json={"content": "Contract fact two", "namespace": namespace})
    body = client.get(f"/v1/memories?namespace={namespace}").json()
    assert sorted(body) == ["items", "limit", "next_cursor", "offset", "total"]
    assert all(sorted(item) == MEMORY_KEYS for item in body["items"])


@requires_db
def test_search_contract(client, namespace):
    client.post("/v1/memories", json={"content": "Contract fact three", "namespace": namespace})
    body = client.post(
        "/v1/memories/search",
        json={"query": "contract fact", "namespace": namespace, "limit": 3},
    ).json()
    assert sorted(body) == ["hits", "namespace", "query"]
    hit = body["hits"][0]
    assert sorted(hit) == ["age_days", "memory", "relevance_score", "similarity"]
    assert sorted(hit["memory"]) == MEMORY_KEYS


@requires_db
def test_bulk_contract(client, namespace):
    body = client.post(
        "/v1/memories/bulk",
        json={"items": [{"content": "Bulk contract a", "namespace": namespace},
                        {"content": "Bulk contract b", "namespace": namespace}]},
    ).json()
    assert sorted(body) == ["created", "errors", "results"]
    assert sorted(body["results"][0]) == ["contradictions", "error", "index", "memory", "status"]


@requires_db
def test_key_and_event_and_webhook_contracts(client, namespace):
    created_key = client.post("/v1/keys", json={"label": "contract", "scopes": ["read"]}).json()
    assert sorted(created_key) == sorted(EXPECTED_FIELDS["ApiKeyCreated"])

    memory = client.post(
        "/v1/memories", json={"content": "Contract fact four", "namespace": namespace}
    ).json()["memory"]
    event_body = client.get("/v1/events?limit=1").json()
    assert sorted(event_body) == ["items", "limit", "offset", "total"]
    assert sorted(event_body["items"][0]) == sorted(EXPECTED_FIELDS["AuditEventOut"])

    webhook = client.post(
        "/v1/webhooks", json={"namespace": namespace, "url": "https://hooks.example/x"}
    ).json()
    assert sorted(webhook) == sorted(EXPECTED_FIELDS["WebhookCreated"])

    listed = client.get(f"/v1/webhooks?namespace={namespace}").json()
    assert sorted(listed) == ["items", "total"]
    assert sorted(listed["items"][0]) == sorted(EXPECTED_FIELDS["WebhookOut"])
    del memory


@requires_db
def test_namespace_stats_contract(client, namespace):
    body = client.get(f"/v1/namespaces/{namespace}/stats").json()
    assert sorted(body) == sorted(EXPECTED_FIELDS["NamespaceStats"])


@requires_db
def test_meta_endpoints_contract(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").json() == {"status": "ready"}
