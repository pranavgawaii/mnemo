# Mnemo architecture

A deep dive into how Mnemo is built: the process layout, every table, the
scoring pipeline, and the invariants that make agent memory trustworthy.

## System layout

```
                      ┌────────────────────────────────────────┐
  agents / SDK / CLI  │  FastAPI (uvicorn)                     │
 ────────────────────►│  auth → rate limit → scope → service   │
                      │  logging + metrics + gzip + CORS       │
                      └───────────────┬────────────────────────┘
                                      │ SQLAlchemy (sync, psycopg)
                      ┌───────────────▼────────────┐
                      │ Postgres + pgvector        │
                      │  memories (HNSW + tsvector)│
                      │  namespaces, api_keys,     │
                      │  contradictions, audit_log │
                      │  rate_limit_counters       │
                      │  jobs (outbox), webhooks   │
                      └───────────────┬────────────┘
                                      │ FOR UPDATE SKIP LOCKED
                      ┌───────────────▼────────────┐
                      │ JobWorker (daemon thread)  │──► webhook HTTP delivery
                      └────────────────────────────┘
```

- **API process** — FastAPI, fully sync SQLAlchemy (a connection pool is
  cheaper to reason about than a sync-over-async bridge). Lifespan starts one
  `JobWorker` thread; `JOB_WORKER_ENABLED=false` moves jobs to cron.
- **Worker** — polls the outbox every second, claims one job with
  `FOR UPDATE SKIP LOCKED`, runs its handler, retries with backoff.
- **SDK** — `sdk/mnemo`: typed sync + async clients over httpx with retries
  (GETs only) and frozen dataclass models.
- **CLI** — `app/cli.py`: export/import/dump, stats, sweep-expired, jobs,
  keys, bench, doctor.

## Embeddings and indexes

- Text is embedded with `all-MiniLM-L6-v2` (384-dim, L2-normalized), so cosine
  similarity is a dot product.
- `memories.embedding` is `pgvector` with an **HNSW index** (`m=16`,
  `ef_construction=64`). Search sets `SET LOCAL hnsw.ef_search`
  (`ANN_EF_SEARCH`, default 40) inside the session transaction; a server
  without the GUC is handled by rollback + reopen.
- A **generated tsvector column** (`to_tsvector('english', content)`) with a
  GIN index powers the keyword half of hybrid search.
- `tags` gets a GIN index for ANY-match tag filters.

## Scoring pipeline

Search fetches an overfetch window (limit x `_SEARCH_OVERFETCH`) of the
nearest active, non-expired memories, then fuses signals in Python:

1. **Similarity** — cosine between query and memory vectors.
2. **Decay** — exponential half-life: `exp(-ln(2) * age_days / half_life)`,
   floored at `decay_floor` (global or per-namespace).
3. **Importance** — `1 + 0.25 * (importance - 1)` multiplier.
4. **Keyword fusion** — relevance is multiplied by
   `1 + keyword_weight * keyword_norm`, where `keyword_norm` is the tsvector
   match evidence for the query (pure helpers in `app/core/hybrid.py`). Zero
   weight disables the boost.
5. **MMR (optional)** — `diversity > 0` greedily re-orders candidates with
   `mmr = (1 - d) * relevance - d * max_redundancy(selected)` (pure helpers in
   `app/core/diversity.py`).

`relevance_score = similarity * decay * importance` is the contract the
frontend, SDK and docs all mirror; similarity and age are surfaced separately
so callers can explain every ranking.

## Contradiction detection

On every write (create **and** content update):

1. The new memory's 5 nearest neighbours are fetched
   (`_CONTRADICTION_CANDIDATES`), ignoring itself.
2. Pairs above the namespace's `contradiction_sim_threshold` (global default
   `CONTRADICTION_SIM_THRESHOLD`) go through `app/core/contradiction.py`:
   a negation-marker heuristic ("no longer", "not", "used to", ...) plus
   shared-word overlap decides `is_contradiction` with a reason.
3. **Optional LLM verdict** — `CONTRADICTION_LLM_PROVIDER=openai` asks an
   OpenAI-compatible chat model (self-hosted vLLM/Ollama work) to confirm;
   any failure or timeout defers to the heuristic. Writes are never blocked
   by an LLM.
4. Flags are inserted with **`ON CONFLICT DO NOTHING`** against the unique
   `uq_contradictions_pair(new_memory_id, existing_memory_id)` index, so two
   workers racing on the same memory produce exactly one row — the loser's
   insert becomes a silent no-op instead of a 500 (stress-tested in
   `tests/test_concurrency.py`).
5. Audit event + webhook outbox jobs (one per active subscriber) are written
   in the same transaction.
6. **Resolution** — `POST /v1/contradictions/resolve` names a winner; the
   loser is soft-deleted and the row becomes `resolved` with
   `resolved_winner_id` set.

## Soft delete, TTL and the sweep

Nothing is ever hard-deleted: `is_active=false` is the tombstone, and the
audit log is append-only. Two exclusions apply to every read:

- `is_active.is_(True)`
- `expires_at IS NULL OR expires_at > now()` (TTL)

`sweep_expired()` (API on startup? no — CLI `sweep-expired`, cron-friendly)
soft-deletes expired rows so counts stay honest; live reads never see expired
memories either way.

## The outbox pattern

Background work (webhook delivery) is written as a `jobs` row **inside the
same transaction as the triggering change**:

```python
audit_service.record(...)          # same transaction
webhook_service.notify_contradiction_flagged(...)   # enqueues jobs rows
db.commit()                        # change + audit + jobs land atomically
```

If the process dies after commit, the worker still delivers later; if the
transaction rolls back, nothing was ever enqueued. Exactly-once-ish delivery
comes from the claim protocol (`FOR UPDATE SKIP LOCKED`) plus retries
(1s, 2s, 4s, ... capped at 60s) and a terminal `failed` state after
`max_attempts`.

## Auth, keys and rate limiting

- The bootstrap key comes from `MNEMO_API_KEY` (all scopes).
- Issued keys are stored as SHA-256 hashes with an 11-char display prefix;
  scopes are `read`, `write`, `admin`; rotation replaces the secret.
- Rate limiting is a **fixed-minute window in Postgres**
  (`rate_limit_counters`): one upsert per request, per-key override column on
  `api_keys`, `X-RateLimit-*`/`Retry-After` response headers. It is off by
  default (`RATE_LIMIT_ENABLED=false`) so hermetic CI cannot flake.

## Observability

- **Structured JSON logs** with a request id and duration on every line
  (`LOG_JSON=true`).
- **Prometheus metrics** hand-rolled in `app/core/metrics.py` (no client
  dependency): request counts and latency histograms by route/status.
- **Audit log** — every mutation records actor key id, request id and
  details in the same transaction as the change (not after it).

## Pagination

Lists offer offset pagination (compat) and **cursor pagination**: an opaque
base64url token of `(created_at, id)`; the service fetches `limit + 1` rows to
detect `next_cursor`. Invalid cursors answer 400. Cursors are stable because
the sort key `(created_at DESC, id DESC)` is total.

## Data model

| Table | Purpose | Notable constraints |
|---|---|---|
| `memories` | The facts | embedding vector(384), generated tsv, GIN(tags), HNSW |
| `namespaces` | Per-namespace scoring overrides | unique name, pattern-checked |
| `api_keys` | Issued keys | unique key_hash; scopes list |
| `rate_limit_counters` | Fixed-window counters | PK (identity, window_start) |
| `contradictions` | Flagged conflicts | unique (new_memory_id, existing_memory_id) |
| `audit_log` | Append-only trail | indexed (namespace, created_at) |
| `jobs` | Outbox queue | indexed (status, run_after) |
| `webhooks` | Subscribers | namespace + url + secret |

Migrations live in `backend/alembic/versions` (one revision per feature:
0002 tags, 0003 namespaces, 0004 api_keys, 0005 rate limiting, 0006 TTL,
0007 audit log, 0008 tsvector, 0009 HNSW, 0010 jobs, 0011 webhooks, 0012
unique pair). CI runs `alembic upgrade head` before the test suite, so a
broken revision fails the build.

## Testing strategy

Three tiers, enforced by marks:

1. **Hermetic** (default, runs anywhere in milliseconds): pure logic — decay,
   hybrid fusion, MMR, contradiction heuristic, pagination codec, export
   formats, benchmark metrics, SDK against `httpx.MockTransport`.
2. **CI-tier** (`@requires_db`): route-level behaviour against real pgvector;
   runs in the `backend-integration` job after `alembic upgrade head`.
3. **Frontend parity**: `tests/test_frontend_parity.py` regex-parses the
   backend source for the constants the TypeScript mirror must match
   (`_CONTRADICTION_CANDIDATES`, `_SEARCH_OVERFETCH`, limits) — if the backend
   changes a constant, the frontend test fails until the mirror catches up.
