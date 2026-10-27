# Mnemo Commit Plan (38 commits)

Takes the repo from "working prototype" to a full product. Python-heavy by
design. Nothing here has been committed or pushed yet; this is the plan and the
exact commit messages. Execute top to bottom, one commit per row.

Conventions: conventional commits, lowercase, imperative, no emojis.

## Phase 1 - Python service hardening (1-5)

1. `chore: add backend pyproject with pinned deps and dev extras`
   Promote `backend/` to a proper Python package (`mnemo-api`), mirror
   `requirements-api.txt` into `pyproject.toml`, add `ruff`/`mypy`/`pytest`
   extras. No behavior change.

2. `feat: add ruff and mypy configuration with clean first pass`
   Lint + type-check config tuned to the existing style, fix whatever surfaces,
   add `make lint` and wire into CI.

3. `feat: add structured json logging with request ids and duration`
   Replace print/log defaults with JSON lines, attach `X-Request-ID`,
   method, path, status, latency. Human-readable mode in dev.

4. `feat: add prometheus metrics endpoint`
   `/metrics` with request counters, latency histograms, contradiction
   flags/resolve counters. Unauthenticated, like `/health`.

5. `feat: add cors and security headers middleware`
   Configurable CORS allowlist, strict headers, request body size cap,
   gzip for large list/export responses.

## Phase 2 - API surface (6-15)

6. `feat: add tags and metadata to memories with search filters`
   `tags: list[str]`, `metadata: dict` columns + Alembic migration.
   Filter on list/search (`tags=`, `metadata=`), tag intersection matching.

7. `feat: add bulk import endpoint with per-item results`
   `POST /v1/memories/bulk` accepts up to N memories, runs each through the
   normal write path, returns per-item ok/error rows. Powers the SDK helper.

8. `feat: add namespace crud with per-namespace scoring overrides`
   Create/list/update/delete namespaces; per-namespace
   half-life, floor, similarity threshold overrides with graceful fallback
   to global settings.

9. `feat: add multiple api keys with hashed secrets and scopes`
   New `api_keys` table (hashed secret, label, scopes, last_used_at).
   `require_api_key` resolves against the table; legacy env key stays as
   bootstrap. Migration included.

10. `feat: add key management routes and rotation`
    `POST /v1/keys`, `GET /v1/keys`, `DELETE /v1/keys/{id}` guarded by an
    admin scope. Secret shown once at creation; rotation endpoint included.

11. `feat: add per-key rate limiting middleware`
    Sliding-window limiter in Postgres (no Redis dependency), headers
    `X-RateLimit-*`, configurable limits per key, `429` with `Retry-After`.

12. `feat: add memory ttl with expiry sweep`
    Optional `expires_at` on create/update, `is_active=False` on expiry,
    CLI `sweep-expired` plus a doc how to cron it.

13. `feat: add cursor pagination for lists`
    Opaque cursor alongside existing limit/offset everywhere, stable
    ordering by `(created_at, id)`, keeps old params working.

14. `feat: add audit log of every mutation`
    `audit_log` table recording memory create/update/soft-delete and
    contradiction resolve with key id and request id. No hard deletes,
    consistent with the audit-trail principle.

15. `feat: add admin events endpoint for audit log`
    `GET /v1/events` (admin scope) with cursor pagination and
    resource/id/verb filters.

## Phase 3 - Retrieval and contradiction quality (16-22)

16. `feat: add hybrid keyword search fused with vector ranking`
    `tsvector` column + trigger, SQL full-text half of the score,
    fusion in Python next to the decay term, `keyword_weight` setting.

17. `feat: add ann index migration and query tuning`
    HNSW index on the embedding column with configurable `m`/`ef`,
    guarded by a benchmark comparison before/after.

18. `feat: add near-duplicate detection on write`
    Reject or flag writes above a dedup threshold against existing active
    memories; response reports `deduplicated_of`. Threshold setting +
    tests.

19. `feat: add mmr diversity option for search`
    Optional maximal-marginal-relevance re-rank pass so a query about a
    person does not return five near-identical facts.

20. `feat: add llm verdict hook for contradiction confirmation`
    Fill the existing `llm_check` slot: optional provider call behind a
    config flag, similarity gate still first, deterministic verdict kept
    when no provider configured.

21. `feat: add webhook notifications for contradiction flags`
    Per-namespace webhook URL + HMAC signature; fires on new flags with
    retry/backoff through the job runner from commit 22 (enable after).

22. `feat: add background job runner with outbox table`
    Lightweight in-process worker + `jobs` outbox table for webhooks and
    expiry sweeps, `jobs stats` in CLI, graceful shutdown.

## Phase 4 - Python SDK and CLI (23-28)

23. `feat: add python sdk core with sync client and typed errors`
    New `sdk/` package `mnemo` (pip-installable, zero heavy deps):
    `MnemoClient` with `add`, `search`, `list`, `get`, `update`, `delete`,
    `resolve`; typed exception hierarchy.

24. `feat: add async client and retries to sdk`
    `AsyncMnemoClient` mirror, timeouts, idempotent-method retries with
    backoff, connection reuse.

25. `feat: add sdk high level helpers for agent memory patterns`
    `remember()` (dedup + contradiction aware), `recall()` (context
    formatting into a prompt block), `remember_many()` over bulk endpoint.

26. `feat: package sdk with pyproject and publish workflow`
    Versioned builds, sdist/wheel workflow (tag-triggered), README with
    quickstart. No push, the workflow ships with the plan.

27. `feat: extend cli with keys, bench, doctor and dump commands`
    `python -m app.cli keys create|list|revoke`, `doctor` (env/db/extension
    checks), `dump` (same snapshot, JSONL), `bench` (run benchmark from CLI).

28. `feat: add jsonl and csv export formats`
    `--format jsonl|csv` for export/dump, streaming friendly, keeps
    default JSON stable.

## Phase 5 - Evaluation and benchmark (29-31)

29. `feat: add benchmark latency percentiles and ndcg reporting`
    Report p50/p95 embed+search latency, nDCG@k and recall@k next to
    top-1/top-3/MRR; `--json` output for CI.

30. `feat: add synthetic benchmark dataset generator`
    Script to generate larger labeled datasets (1k/10k memories) from the
    seed corpus templates, so the headline number is not pinned to 60 rows.

31. `feat: add regression gate for benchmark scores`
    Fail the run when top-3 or MRR drop below pinned thresholds; used in
    CI against the pgvector service.

## Phase 6 - Tests and CI (32-34)

32. `test: add contract tests for all response schemas`
    Every route's response validated against its Pydantic model, including
    error shapes and pagination echo fields, DB-integration tier.

33. `test: add concurrency stress test for contradiction flagging`
    Parallel writes of the same fact family; assert no duplicate flags,
    no lost updates, audit rows consistent.

34. `feat: add ci matrix for python 3.12 and 3.13 plus lint job`
    Test matrix, separate lint/typecheck job, benchmark gate job, Playwright
    job untouched.

## Phase 7 - Docs and release (35-38)

35. `docs: rewrite api reference with examples for every route`
    README API section plus a rendered reference page: every new endpoint
    with request/response JSON, error table, pagination and rate-limit docs.

36. `docs: add architecture and data model deep dive`
    Write path, read path, scoring math, contradiction state machine,
    ER diagram, outbox design, scaling notes.

37. `docs: add deployment guide and sdk quickstart`
    Docker/Fly/Railway for the API, Vercel for the web app, cron for sweeps,
    SDK quickstart for sync/async/agent-helper usage.

38. `chore: add changelog and bump version to 1.0.0`
    `CHANGELOG.md` summarizing all 37 preceding commits, version sync
    across backend package and SDK, release tag `v1.0.0` (created locally,
    not pushed).

## Execution notes

- Schema-touching commits (6, 8, 9, 11, 12, 14, 17, 22) each carry their own
  Alembic migration; never batch migrations across phases.
- Commit 21 depends on 22 only because of the retry/backoff transport; if
  building them in order strictly, swap 21 and 22 and note the webhook fires
  inline until the outbox lands.
- Every Python commit should keep `PYTHONPATH=. pytest tests/test_core.py`
  green; DB-tier commits additionally need the pgvector service up.
