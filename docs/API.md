# Mnemo API reference

Every route, with a request and a response example. Base URL in the examples
is `https://mnemo.internal`; all `/v1` routes require the `X-API-Key` header.

- Scopes: `read` (GET routes), `write` (memory/contradiction mutations), `admin`
  (namespaces, keys, events, webhooks). The bootstrap key from `MNEMO_API_KEY`
  has every scope.
- Errors follow FastAPI conventions: `{"detail": "..."}` with 401 (no/invalid
  key), 403 (missing scope), 404, 409 (near-duplicate in `reject` mode), 422
  (validation), 429 (rate limit; includes `Retry-After`).
- Every response carries `X-Request-ID`; send it with bug reports.

## Meta endpoints (no auth)

### `GET /health`

Liveness. Does not touch the database.

```json
{"status": "ok"}
```

### `GET /ready`

Readiness. Actually queries Postgres; 503 when the database is unreachable.

```json
{"status": "ready"}
```

### `GET /metrics`

Prometheus text format: mnemo_requests_total, mnemo_request_duration_seconds,
mnemo_memories_active, mnemo_contradictions_open.

## Namespaces (admin)

### `POST /v1/namespaces`

Create a namespace with optional per-namespace scoring overrides.

```bash
curl -X POST https://mnemo.internal/v1/namespaces \
  -H "X-API-Key: $MNEMO_KEY" -H "Content-Type: application/json" \
  -d '{"name": "support-bot", "decay_half_life_days": 30, "decay_floor": 0.1,
       "contradiction_sim_threshold": 0.85}'
```

```json
{
  "name": "support-bot",
  "decay_half_life_days": 30,
  "decay_floor": 0.1,
  "contradiction_sim_threshold": 0.85,
  "created_at": "2026-10-27T09:00:00Z",
  "total_memories": 0
}
```

409 when the name already exists.

### `GET /v1/namespaces` / `GET /v1/namespaces/{name}`

```json
{"items": [{"name": "default", "decay_half_life_days": null, "decay_floor": null,
            "contradiction_sim_threshold": null, "created_at": "...", "total_memories": 12}],
 "total": 1}
```

### `PATCH /v1/namespaces/{name}`

Partial update; explicit `null` resets an override to the global setting.

```bash
curl -X PATCH https://mnemo.internal/v1/namespaces/support-bot \
  -H "X-API-Key: $MNEMO_KEY" -H "Content-Type: application/json" \
  -d '{"decay_floor": null, "contradiction_sim_threshold": 0.9}'
```

### `DELETE /v1/namespaces/{name}` — 204

### `GET /v1/namespaces/{name}/export`

Portable snapshot (vectors are omitted; text is re-embedded on import).
Soft-deleted memories are included.

```json
{
  "namespace": "support-bot",
  "exported_at": "2026-10-27T09:00:00Z",
  "memories": [{"id": "...", "content": "Riya lives in Pune", "importance": 3,
                "is_active": true, "tags": ["people"], "metadata": {"source": "chat"},
                "expires_at": null, "created_at": "...", "updated_at": "..."}],
  "contradictions": [{"id": "...", "new_memory_id": "...", "existing_memory_id": "...",
                      "similarity": 0.93, "reason": "negation marker", "status": "open",
                      "resolved_winner_id": null, "created_at": "...", "resolved_at": null}]
}
```

The CLI can write the same snapshot as JSONL or CSV (`mnemo export --format`).

### `GET /v1/namespaces/{name}/stats`

```json
{
  "namespace": "support-bot",
  "total_memories": 12,
  "active_memories": 10,
  "inactive_memories": 2,
  "open_contradictions": 1,
  "resolved_contradictions": 0,
  "average_importance": 3.2,
  "oldest_memory_at": "2026-01-01T00:00:00Z",
  "newest_memory_at": "2026-10-27T08:59:00Z",
  "importance_counts": [{"importance": 3, "count": 7}]
}
```

## Memories

### `POST /v1/memories` (write)

```bash
curl -X POST https://mnemo.internal/v1/memories \
  -H "X-API-Key: $MNEMO_KEY" -H "Content-Type: application/json" \
  -d '{"content": "Riya lives in Pune",
       "namespace": "people",
       "importance": 3,
       "tags": ["people"],
       "metadata": {"source": "chat"},
       "expires_at": null}'
```

```json
{
  "memory": {
    "id": "0f8f...-...",
    "namespace": "people",
    "content": "Riya lives in Pune",
    "importance": 3,
    "is_active": true,
    "tags": ["people"],
    "metadata": {"source": "chat"},
    "expires_at": null,
    "created_at": "2026-10-27T09:00:00Z",
    "updated_at": "2026-10-27T09:00:00Z"
  },
  "contradictions": [],
  "deduplicated_of": null
}
```

- `contradictions` lists every conflict flagged **by this write** (resolved
  ones land in `GET /v1/contradictions`).
- `deduplicated_of` is set when `DEDUP_MODE=flag` and the write was within
  `DEDUP_THRESHOLD` (0.97) of an existing memory. `DEDUP_MODE=reject` answers
  409 instead; `off` skips the check.
- The text is embedded server-side (MiniLM by default); decay ranking uses
  `created_at` at query time.

### `POST /v1/memories/bulk` (write)

Up to 100 items; failures are isolated per item.

```bash
curl -X POST https://mnemo.internal/v1/memories/bulk \
  -H "X-API-Key: $MNEMO_KEY" -H "Content-Type: application/json" \
  -d '{"items": [{"content": "Fact A", "namespace": "people"},
                 {"content": "Fact B", "namespace": "people", "importance": 5}]}'
```

```json
{
  "created": 2,
  "errors": 0,
  "results": [
    {"index": 0, "status": "created", "memory": {"id": "...", "...": "..."},
     "contradictions": [], "error": null},
    {"index": 1, "status": "created", "memory": {"id": "...", "...": "..."},
     "contradictions": [], "error": null}
  ]
}
```

### `POST /v1/memories/search`

```bash
curl -X POST https://mnemo.internal/v1/memories/search \
  -H "X-API-Key: $MNEMO_KEY" -H "Content-Type: application/json" \
  -d '{"query": "where does Riya live", "namespace": "people", "limit": 5,
       "tags": ["people"], "keyword_weight": null, "diversity": 0.0}'
```

```json
{
  "query": "where does Riya live",
  "namespace": "people",
  "hits": [
    {
      "memory": {"id": "...", "content": "Riya lives in Pune", "...": "..."},
      "similarity": 0.91,
      "relevance_score": 0.86,
      "age_days": 12.5
    }
  ]
}
```

- Ranking: `similarity x decay x importance`, optionally boosted by keyword
  evidence (`KEYWORD_WEIGHT` global, `keyword_weight` per query; `0` disables).
- `diversity` in `[0,1]` applies MMR: `0` keeps pure relevance order; higher
  values demote near-duplicate results in favour of new information.
- Tag filters are ANY-match; searches only consider active, non-expired
  memories.

### `GET /v1/memories`

```bash
curl "https://mnemo.internal/v1/memories?namespace=people&limit=2&tags=people&cursor="
```

```json
{"items": [{"id": "...", "content": "Riya lives in Pune", "...": "..."}],
 "total": 42, "limit": 2, "offset": 0, "next_cursor": "eyJjIjoxNzQsImlkIjoi..."}
```

Pass `next_cursor` as `cursor` for the next page (opaque base64url of
`(created_at, id)`). `offset`/`limit` also work without cursors.

### `GET /v1/memories/{memory_id}?namespace=people`

### `PATCH /v1/memories/{memory_id}` (write)

Partial update. Content changes are re-embedded and re-checked against
neighbours; new flags appear in the contradictions list. Tags and metadata are
replaced wholesale when present. Passing `expires_at: null` clears the TTL.

```bash
curl -X PATCH "https://mnemo.internal/v1/memories/$ID?namespace=people" \
  -H "X-API-Key: $MNEMO_KEY" -H "Content-Type: application/json" \
  -d '{"importance": 5, "tags": ["people", "vip"]}'
```

### `DELETE /v1/memories/{memory_id}` (write)

Soft-delete (`is_active: false`). Rows are never hard-deleted; the audit trail
preserves the tombstone. Returns the updated memory.

## Contradictions

### `GET /v1/contradictions?namespace=people&status=open&limit=20`

```json
{
  "items": [
    {
      "id": "...",
      "namespace": "people",
      "similarity": 0.93,
      "reason": "negation marker: 'no longer'",
      "status": "open",
      "new_memory": {"id": "...", "content": "Riya no longer lives in Pune", "...": "..."},
      "existing_memory": {"id": "...", "content": "Riya lives in Pune", "...": "..."},
      "resolved_winner_id": null,
      "created_at": "...",
      "resolved_at": null
    }
  ],
  "total": 1, "limit": 20, "offset": 0, "next_cursor": null
}
```

`status` is `open` (default) or `resolved`. Contradictions are detected on
write: the new memory is compared against its 5 nearest neighbours
(`CONTRADICTION_CANDIDATES`) with a negation-marker heuristic; an optional LLM
verdict hook (`CONTRADICTION_LLM_PROVIDER=openai`) can confirm or veto.

### `POST /v1/contradictions/resolve` (write)

```bash
curl -X POST https://mnemo.internal/v1/contradictions/resolve \
  -H "X-API-Key: $MNEMO_KEY" -H "Content-Type: application/json" \
  -d '{"contradiction_id": "...", "winner_memory_id": "..."}'
```

The loser is soft-deleted; the contradiction becomes `resolved` with
`resolved_winner_id` set. Both sides are returned inlined.

## API keys (admin)

### `POST /v1/keys`

```bash
curl -X POST https://mnemo.internal/v1/keys \
  -H "X-API-Key: $MNEMO_KEY" -H "Content-Type: application/json" \
  -d '{"label": "support-bot", "scopes": ["read", "write"], "rate_limit_per_minute": 60}'
```

```json
{
  "id": "...", "label": "support-bot", "key_prefix": "mnemo_1a2b3", "scopes": ["read", "write"],
  "is_active": true, "created_at": "...", "last_used_at": null,
  "rate_limit_per_minute": 60,
  "key": "mnemo_4f8d2e7c1b..."
}
```

`key` is the plaintext secret — shown exactly once. Keys are stored as
SHA-256 hashes.

### `GET /v1/keys`

All keys, prefixes only, never secrets.

### `POST /v1/keys/{key_id}/rotate`

New secret, same label/scopes; the old secret stops working immediately.
The new plaintext is in this one response only.

### `DELETE /v1/keys/{key_id}` — 204

Revoke: auth starts failing at once.

## Audit events (admin)

### `GET /v1/events?namespace=people&limit=20`

Append-only trail of every mutation: `memory.created/updated/deleted/swept`,
`contradiction.flagged/resolved`, `namespace.imported`.

```json
{
  "items": [{"id": "...", "namespace": "people", "action": "memory.created",
             "resource_type": "memory", "resource_id": "...", "actor_key_id": null,
             "request_id": "req_...", "details": {"importance": 3, "tags": []},
             "created_at": "..."}],
  "total": 51, "limit": 20, "offset": 0
}
```

## Webhooks (admin)

### `POST /v1/webhooks`

Subscribe a URL to `contradiction.flagged` events for one namespace. Delivery
runs through the outbox job runner with retries; the body is signed:

```
X-Mnemo-Signature: <hex hmac-sha256(secret, body)>
```

```bash
curl -X POST https://mnemo.internal/v1/webhooks \
  -H "X-API-Key: $MNEMO_KEY" -H "Content-Type: application/json" \
  -d '{"namespace": "people", "url": "https://hooks.example/mnemo"}'
```

```json
{"id": "...", "namespace": "people", "url": "https://hooks.example/mnemo",
 "is_active": true, "created_at": "...", "secret": "8f4c..."}
```

`secret` is shown once; store it to verify signatures.

### `GET /v1/webhooks?namespace=people`

```json
{"items": [{"id": "...", "namespace": "people", "url": "...", "is_active": true, "created_at": "..."}],
 "total": 1}
```

### `DELETE /v1/webhooks/{id}` — 204

Deactivates the subscription; deliveries stop immediately.
