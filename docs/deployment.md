# Deploying Mnemo

The Python API and Next.js website run separately. Vercel hosts the website;
the real API needs a Python/container host and PostgreSQL with pgvector.
Deploying the website does not deploy the backend. Local development and a
recruiter demonstration do not require paid public hosting.

## Local development

With Docker and Compose installed, from the repository root:

```bash
cd backend
docker compose up --build
```

This starts PostgreSQL on port 5432 and the API on port 8000, applies migrations,
and warms the encoder before the container serves requests. The first image
build downloads dependencies and model weights. The checked-in development key
is for local use; replace it before exposing the API publicly.

Alternatively, run Python against an existing development pgvector database:

```bash
cd backend
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r requirements-api.txt
cp .env.example .env
# Edit DATABASE_URL and MNEMO_API_KEY in the private .env file.
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Python 3.12+ is supported; CI runs 3.12 and 3.13. Provider `postgres://` and
`postgresql://` URLs select the installed psycopg 3 driver automatically, preserving
encoded credentials and query parameters. API documentation is at `/docs`.

`GET /health` checks process liveness. `GET /ready` checks database connectivity,
without running inference. `EMBEDDING_WARMUP=true` validates the encoder during
startup before accepting requests. `/v1/demo/availability` checks read/write key
scopes and the memory table, and reports a cold/warm encoder.

## Configuration reference

The defaults below are generated from Python field definitions, not environment
values. The Docker image overrides `EMBEDDING_WARMUP` to `true`. Settings are
prefix-free environment variables; private `.env` files are supported.

<!-- configuration-reference:start -->
| Variable | Code default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `"postgresql+psycopg://mnemo:mnemo@localhost:5432/mnemo"` | PostgreSQL with pgvector; provider postgres:// and postgresql:// URLs use psycopg 3 automatically. |
| `MNEMO_API_KEY` | `"dev-local-key-change-me"` | Bootstrap operator key. Replace this development default before exposing the API. |
| `EMBEDDING_MODEL` | `"all-MiniLM-L6-v2"` | Local sentence-transformers encoder; must match the configured dimension. |
| `EMBEDDING_DIM` | `384` | Vector dimension; changing it also needs a database migration. |
| `EMBEDDING_WARMUP` | `false` | Load/validate the encoder during startup. The Docker image sets this to true. |
| `DECAY_HALF_LIFE_DAYS` | `180.0` | Age-weight half-life used by relevance ranking. |
| `DECAY_FLOOR` | `0.7` | Minimum age multiplier. |
| `CONTRADICTION_SIM_THRESHOLD` | `0.82` | Similarity gate for heuristic/optional model conflict checks. |
| `KEYWORD_WEIGHT` | `0.25` | Default keyword boost; queries may override it. |
| `ANN_EF_SEARCH` | `100` | HNSW query breadth, 1–1000; increasing it trades speed for recall. |
| `DEDUP_MODE` | `"flag"` | flag, reject or off; flag accepts a write and reports a near duplicate. |
| `DEDUP_THRESHOLD` | `0.97` | Near-duplicate similarity threshold. |
| `CONTRADICTION_LLM_PROVIDER` | `""` | Empty keeps the local detector; openai enables a compatible verdict API. |
| `CONTRADICTION_LLM_API_KEY` | `""` | Optional verdict-provider secret; never expose it through the frontend. |
| `CONTRADICTION_LLM_BASE_URL` | `"https://api.openai.com/v1"` | Optional compatible chat-completions server. |
| `CONTRADICTION_LLM_MODEL` | `"gpt-4o-mini"` | Optional verdict model, not an answer-generation model. |
| `CONTRADICTION_LLM_TIMEOUT_SECONDS` | `10.0` | Verdict request timeout; failures fall back to the heuristic. |
| `JOB_WORKER_ENABLED` | `true` | Enable the in-process outbox worker; external scheduling is required when disabled. |
| `JOB_WORKER_INTERVAL_SECONDS` | `1.0` | Polling interval for the in-process worker. |
| `JOB_LEASE_SECONDS` | `300` | Claim lease; must exceed the longest expected handler duration. |
| `WEBHOOK_TIMEOUT_SECONDS` | `5.0` | Webhook delivery timeout. |
| `LOG_JSON` | `true` | Structured JSON request logging. |
| `LOG_LEVEL` | `"info"` | Application logging level. |
| `CORS_ALLOW_ORIGINS` | `[]` | JSON array of explicitly allowed browser origins; empty adds no CORS middleware. |
| `MAX_BODY_BYTES` | `1048576` | Hard HTTP request-body limit. |
| `RATE_LIMIT_ENABLED` | `false` | Enable per-key fixed-minute counters; turn on for a public demo. |
| `RATE_LIMIT_PER_MINUTE` | `120` | Default request budget; an issued key may set its own limit. |
<!-- configuration-reference:end -->

Run `python scripts/export-config-reference.py` from the repository root in the
backend environment to refresh this table. CI uses `--check` to catch drift.

## Host the backend

Public hosting is optional. It allows visitors to try real persistence and
retrieval without installing the backend. Your laptop's localhost cannot be
used as the backend for a website running on Vercel.

1. Provision persistent PostgreSQL with pgvector and supply its connection string
   as the private `DATABASE_URL`.
2. Build `backend/Dockerfile` with `backend/` as the Docker context. Set a unique
   private `MNEMO_API_KEY`, `RATE_LIMIT_ENABLED=true` and `EMBEDDING_WARMUP=true`.
3. The image applies migrations, then starts Uvicorn on `0.0.0.0` using the host's
   `PORT` or port 8000. Configure HTTPS and a `/ready` health check.
4. Allow enough startup time and memory for the encoder. Start with one process
   and measure RSS and latency; each additional process holds its own model.
   A successful image build does not establish runtime capacity.
5. Configure backups and test a restore. An export or a passing migration is not
   evidence that recovery has been tested.

The in-process worker uses PostgreSQL job leases. Multiple consumers are fenced
by the claim protocol. For external scheduling, set `JOB_WORKER_ENABLED=false`
and repeatedly invoke `python -m app.cli jobs run`; each invocation processes
one runnable job. Set `JOB_LEASE_SECONDS` above the longest handler duration.

Issue namespace-restricted keys for applications. The bootstrap key and older
unrestricted keys retain deployment-wide access. Namespace grants are API
controls, without database row-level security or tenant account provisioning.

## Connect the Live API walkthrough

Use a dedicated demo API/database without private application data. The public
walkthrough creates random `web-demo-*` namespaces, so its dedicated read/write
key intentionally has no exact namespace grant. It cannot administer keys.
Enable rate limiting and rotate the expiring key before it expires.

For local development, set the operator `MNEMO_API_KEY` in your shell, then run
from the repository root:

```bash
python scripts/connect-live-demo.py --api-url http://127.0.0.1:8000
```

The script issues a read/write key with a 30-day expiry and 120-request/minute
override, validates availability access, and writes only the issued key and API
origin to ignored `frontend/.env.local` with file mode 0600. Other variables are
preserved. If setup fails, it attempts to revoke the new key. Restart the frontend:

```bash
cd frontend
pnpm dev
```

In another terminal, from the repository root:

```bash
python scripts/check-live-demo.py --web-url http://127.0.0.1:3005
```

This verifies all four real save/search/change/review scenarios, source
projections and inactive history. It does not substitute simulated results.

For the hosted website, add these **server-only** variables to the matching
Vercel deployment environment and redeploy:

```dotenv
MNEMO_DEMO_API_URL=https://your-public-demo-api.example
MNEMO_DEMO_API_KEY=your-issued-read-write-key
```

The URL must be reachable by Vercel and contain no path or embedded credentials.
Never use `NEXT_PUBLIC_` for either value. Store them as sensitive variables.
Preview and production variables are separate; saving variables does not change
an existing deployment. Verify `GET /api/demo` on the new deployed URL and then
run the same four-scenario checker against it. `available` confirms the probe;
`unconfigured` means missing/invalid settings, while `unavailable` means an actual
access, rate-limit, network or storage check failed.

The signed demo session and synthetic facts expire after 15 minutes. Expiry
excludes facts from active retrieval; it does not physically purge stored rows.
Schedule `python -m app.cli sweep-expired` to mark expired rows inactive.

## Vercel / monorepo notes

Set Root Directory to `frontend`, select Next.js, and use `frontend/vercel.json`.
The commands run inside that directory:

```bash
pnpm install --frozen-lockfile
pnpm build
```

Production output is `.next`; `.next-3005` is local development output. The
Browser simulation remains available without a backend. Website deployment
success alone does not establish Live API availability.

## Python assistant and evaluation

Install the SDK with `pip install -e ./sdk` from the repository root. Give the
[complete Python assistant](../sdk/examples/README.md) a namespace-restricted
read/write key through `MNEMO_APP_KEY`. It supports persistent facts, explicit
review, evidence-only answers and an optional local Ollama model.

The [agent guide](agent-context.md) describes labelled context selection. The
query-only holdout compares retrieval policies, while the lifecycle runner checks
review and expiry. Neither establishes generated-answer quality or load capacity.

## Operations

From `backend/`:

```bash
python -m app.cli doctor
python -m app.cli jobs stats
python -m app.cli export --namespace demo --file backup.json
python -m app.cli sweep-expired
```

Scrape `/metrics`, ship JSON logs, and monitor errors, latency and failed jobs.
There is no measured universal HNSW rebuild-time guarantee. Increasing
`ANN_EF_SEARCH` trades additional query work for potentially better recall.

## Integration test isolation

Set `MNEMO_TEST_DATABASE_URL` to a disposable pgvector database named
`mnemo_test_*`. Tests create and drop its tables, never an ordinary application
database. Database tests skip without an explicit test database; an explicitly
configured database that is unavailable fails collection.

```bash
cd backend
python -m pytest tests/ -q
```

See [Contributing](../CONTRIBUTING.md) for schema exports, documentation contract
checks and the complete verification workflow.
