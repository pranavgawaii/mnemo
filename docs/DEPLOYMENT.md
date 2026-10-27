# Deploying Mnemo

From laptop to production: local development, configuration reference, and the
deployment checklist. For the API surface see [API.md](API.md); for internals
see [ARCHITECTURE.md](ARCHITECTURE.md).

## Local development

```bash
# 1. A Postgres with the pgvector extension (Docker one-liner).
docker run --name mnemo-pg -e POSTGRES_USER=mnemo -e POSTGRES_PASSWORD=mnemo \
  -e POSTGRES_DB=mnemo -p 5432:5432 -d pgvector/pgvector:pg16

# 2. Backend venv + dependencies.
cd backend
python3.14 -m venv .venv && . .venv/bin/activate
pip install -r requirements-api.txt

# 3. Schema (migrations) and an embedding-model warm-up.
alembic upgrade head

# 4. Run the API.
export MNEMO_API_KEY=mnemo_dev_local_secret
uvicorn app.main:app --reload
# open http://localhost:8000/docs - Swagger UI is generated from the app

# 5. Sanity checks.
PYTHONPATH=. python -m app.cli doctor
make test            # hermetic suite (DB-tier tests skip without Postgres)
```

The `MNEMO_API_KEY` you export is the **bootstrap admin key**: it authenticates
every request and can issue scoped keys through `POST /v1/keys`.

## Configuration reference

All settings are environment variables (prefix-free, see
`app/core/config.py`):

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://...` | Postgres (must have pgvector) |
| `MNEMO_API_KEY` | empty | bootstrap admin key; requests without it 401 |
| `LOG_JSON` / `LOG_LEVEL` | `false` / `info` | structured logs, verbosity |
| `CORS_ALLOW_ORIGINS` | `[]` | extra allowed origins for the console |
| `MAX_BODY_BYTES` | 1 MiB | request-body cap (413 beyond) |
| `RATE_LIMIT_ENABLED` | `false` | per-key fixed-minute window in Postgres |
| `RATE_LIMIT_PER_MINUTE` | 120 | default budget (per-key override column) |
| `KEYWORD_WEIGHT` | `0.25` | hybrid keyword boost multiplier |
| `ANN_EF_SEARCH` | 40 | `hnsw.ef_search` set per search query |
| `DEDUP_MODE` | `flag` | `flag` reports / `reject` 409s near-duplicates |
| `DEDUP_THRESHOLD` | `0.97` | cosine threshold for near-duplicates |
| `CONTRADICTION_LLM_PROVIDER` | empty | `openai` enables the LLM verdict hook |
| `CONTRADICTION_LLM_*` | — | `API_KEY`, `BASE_URL`, `MODEL`, `TIMEOUT_SECONDS` |
| `JOB_WORKER_ENABLED` | `true` | in-process outbox worker (off = cron) |
| `WEBHOOK_TIMEOUT_SECONDS` | `5` | webhook delivery timeout |

## Production checklist

1. **Postgres** — managed Postgres with pgvector (or self-hosted). The HNSW
   index is created by the migrations; rebuild time is a few seconds per 100k
   memories.
2. **Migrations on deploy** — run `alembic upgrade head` as a release step
   before/with the new process (CI does exactly this, so a broken revision
   never reaches you).
3. **API process** — `uvicorn app.main:app --workers 4` behind TLS. The app is
   stateless apart from the DB and the outbox worker.
4. **Job worker** — leave `JOB_WORKER_ENABLED=true` for a single deployment
   (the thread is idle-light). For multi-replica deployments, enable the
   worker on exactly one replica (or turn it off everywhere and cron
   `mnemo jobs run` — the claim protocol is multi-consumer safe either way).
5. **Rate limiting** — turn on (`RATE_LIMIT_ENABLED=true`) once traffic is
   real; it costs one upsert per request.
6. **CORS** — set `CORS_ALLOW_ORIGINS` to the console origin(s).
7. **Observability** — scrape `/metrics` (Prometheus text format); ship the
   JSON logs (`LOG_JSON=true`); alert on `mnemo_contradictions_open` and the
   job `failed` count (`mnemo jobs stats`).
8. **Cron** — `mnemo sweep-expired` hourly keeps namespace counts honest when
   TTLs are used.

### Vercel / monorepo notes

The web deployment is the Next.js app at the repo root; `.vercelignore`
keeps `backend/`, `sdk/`, `landing-kit/`, tests and docs out of the upload.
`requirements-api.txt` carries the `-api` suffix so Vercel's monorepo detector
does not mistake `backend/` for a deployable Python project.

## SDK quickstart

Install from the packaged distribution (`pip install mnemo-sdk`) or from the
repo (`pip install ./sdk`). Full reference in [sdk/README.md](../sdk/README.md).

```python
from mnemo import MnemoClient

with MnemoClient(base_url="https://mnemo.internal", api_key="mnemo_...") as client:
    client.add_memory("Riya lives in Pune", importance=3, tags=["people"])
    for hit in client.search("where does Riya live").hits:
        print(hit.memory.content, round(hit.relevance_score, 3))
```

Async twin and the agent-pattern helpers (`remember`/`recall`/`forget`/
`context_block`):

```python
from mnemo import AsyncMnemoClient
from mnemo.helpers import remember, recall, context_block

async with AsyncMnemoClient(base_url="...", api_key="...") as client:
    memory, resolved = await remember(client, "Riya moved to Berlin")  # see note
    memories = await recall(client, "Riya's city")
```

Note: the helpers are sync-flavoured today; async callers use the client
methods directly (the async client mirrors every method).

## Operational runbook (short)

- **401s everywhere** — `MNEMO_API_KEY` changed or missing; the bootstrap key
  is env-only, no rotation endpoint (rotate by redeploying).
- **Search slow** — check HNSW exists (`\d memories`), raise `ANN_EF_SEARCH`
  for recall/quality trade-offs, and confirm the embedding model is warm.
- **Webhooks not arriving** — `mnemo jobs stats` (pending/failed), `doctor`
  checks the outbox, and delivery failures are in the job's `last_error`.
- **Duplicate flags** — shouldn't happen (unique pair index + ON CONFLICT);
  if you see it, verify migration 0012 is applied (`doctor` reports
  migration state).
