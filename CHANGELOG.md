# Changelog

All notable changes to Mnemo. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Fixed
- Repaired the Alembic migration chain: `0002` now points at the real base
  revision id (`0001`), and the HNSW index migration drops the initial
  schema's same-named index before rebuilding it. `alembic upgrade head`
  completes from an empty database.
- The outbox parks jobs whose kind has no registered handler as terminally
  `failed` instead of retrying them forever.
- Contradiction dedup detects conflicts via `RETURNING` rather than
  `rowcount`, which psycopg3 reports as unknown for plain inserts.
- Sweeps write one namespaced audit row per swept memory, and `sweep_expired`
  (and the CLI `sweep-expired` command) accept a namespace scope.
- `GET /v1/memories` and `GET /v1/contradictions` emit `next_cursor` on the
  first page, so keyset pagination can be walked from the start.
- Deleting a namespace that only exists implicitly (created by memory writes)
  is refused with 409 instead of a misleading 404.
- CI: the lint job no longer installs `types-httpx`, which does not exist on
  PyPI (httpx ships its own inline types).
- The API explorer on the site documents all twenty-six routes, and the
  browser smoke tests match the current copy.

## [1.0.0] — 2026-10-27

First complete release: the semantic memory service, its SDK, CLI, benchmark
suite and documentation.

### Backend — API
- `POST /v1/memories` with tags, metadata, importance and TTL; server-side
  embeddings (`all-MiniLM-L6-v2`).
- `POST /v1/memories/search` — hybrid search: vector similarity x decay x
  importance with keyword-evidence fusion (`KEYWORD_WEIGHT`, per-query
  override) and optional MMR diversity (`diversity` in [0,1]).
- `POST /v1/memories/bulk` — up to 100 items with per-item results; failures
  isolated.
- `GET/PATCH/DELETE /v1/memories/{id}` — fetch, partial update (re-embed +
  re-check on content change), soft delete. Namespace-scoped.
- `GET /v1/memories` — offset + cursor pagination (opaque base64url), tag
  filters, TTL-aware.
- `GET /v1/contradictions`, `POST /v1/contradictions/resolve` — flagged
  conflicts with both sides inlined; resolution names a winner and soft-deletes
  the loser.
- Namespaces CRUD with per-namespace scoring overrides (half-life, floor,
  contradiction threshold) applied by search and flagging.
- Namespace export (JSON) plus JSONL/CSV formats; import with optional id
  preservation; per-namespace stats.

### Backend — platform
- Structured JSON logging with request ids and durations.
- Prometheus `/metrics` (hand-rolled registry), `/health`, `/ready`.
- CORS, gzip, security headers, request-body cap.
- Multiple API keys: SHA-256-hashed secrets, prefixes, scopes
  (read/write/admin), rotation, revocation, per-key rate-limit override.
- Per-key rate limiting (Postgres fixed-minute window), opt-in, standard
  `X-RateLimit-*` headers.
- TTL (`expires_at`) with live-read exclusion and `sweep-expired` soft-delete.
- Append-only audit log of every mutation, written in the same transaction;
  admin `/v1/events`.
- Near-duplicate detection on write: `flag` (reports `deduplicated_of`) or
  `reject` (409) modes.
- Optional LLM verdict hook for contradictions (OpenAI-compatible endpoints,
  self-hosted included); failures defer to the local heuristic.
- Outbox job runner: `jobs` table, `FOR UPDATE SKIP LOCKED` claims,
  exponential-backoff retries, in-process worker thread (cron alternative).
- Webhooks: per-namespace subscriptions for `contradiction.flagged`, HMAC
  `X-Mnemo-Signature` delivery through the outbox with retries.
- Unique contradiction-pair index + `ON CONFLICT DO NOTHING` so concurrent
  writes can never double-flag a pair.
- Alembic migrations 0001–0012; CI migrates a real pgvector database.

### SDK (`sdk/`)
- `MnemoClient` (sync) and `AsyncMnemoClient` — typed frozen-dataclass models,
  typed error hierarchy mapping every status, retry policy for idempotent GETs.
- Agent-pattern helpers: `remember` (last-write-wins auto-resolution),
  `recall`, `forget`, `context_block`.
- Packaging (`mnemo-sdk` on PyPI, `py.typed`), README, publish workflow with
  PyPI trusted publishing.

### CLI
- `export` (json/jsonl/csv), `import`, `dump` (all namespaces), `stats`,
  `sweep-expired`, `jobs run|stats`, `keys create|list|rotate|revoke`,
  `bench` (latency percentiles), `doctor` (database, migrations, embeddings,
  outbox, settings).

### Benchmark
- Retrieval benchmark with top-1/top-k accuracy, MRR, NDCG@k and search
  latency percentiles; decay on/off comparison mode.
- Deterministic synthetic dataset generator at any scale.
- Regression gate against pinned baselines (`benchmark/gate.py --update`).

### CI / tests
- Three test tiers: hermetic (pure logic, MockTransport), CI-tier
  (`@requires_db` against real pgvector), frontend-parity source contracts.
- Contract tests pinning every response schema's key set.
- Concurrency stress test for contradiction flagging.
- CI: Python 3.12 + 3.13 matrix, lint job (ruff + mypy), SDK job, pgvector
  integration job.

### Documentation
- Complete API reference with examples for every route.
- Architecture and data-model deep dive.
- Deployment guide with configuration reference and runbook.
- Frontend design kit (`landing-kit/`) and frontend docs.

[1.0.0]: https://github.com/pranavgawaii/mnemo/releases/tag/v1.0.0
