# Mnemo

**A semantic memory service for AI agents.** Mnemo gives an agent persistent
recall: cosine-similarity search over Postgres + pgvector, time-decay ranking so
fresher facts outrank stale ones, and deterministic contradiction detection with
a soft-delete audit trail.

[![Python 3.12+](https://img.shields.io/badge/python-3.12%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.139-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Postgres + pgvector](https://img.shields.io/badge/Postgres-pgvector-4169E1?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Why Mnemo

- **Recall that fades.** Results rank by `similarity × decay × importance`, not
  raw vector distance, so fresher facts win ties without ever overriding a
  clearly better semantic match.
- **Contradiction-aware.** Adding *"Pranav no longer lives in Bengaluru"* when
  *"Pranav lives in Bengaluru"* already exists **flags** a contradiction for
  human review. It never silently overwrites.
- **Measured, not asserted.** A 50-query benchmark reports retrieval accuracy on
  every change (see [Benchmark](#benchmark)).
- **Local-first embeddings.** `all-MiniLM-L6-v2` (384-dim) via
  `sentence-transformers`. No embedding API key required.
- **One store.** Postgres + pgvector only, no second vector database to run.

---

## Architecture

```
mnemo/
├── app/                      # Next.js 15 App Router (marketing site + docs)
├── components/               # React components
├── lib/                      # client-side logic + page content
├── public/                   # fonts and static assets
├── backend/                  # FastAPI service
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py       # single API-key auth
│   │   │   └── routes.py     # /v1/memories, /v1/contradictions
│   │   ├── core/
│   │   │   ├── config.py     # env-backed settings
│   │   │   ├── embedding.py  # local sentence-transformers embedding
│   │   │   ├── decay.py      # time-decay × importance scoring
│   │   │   └── contradiction.py  # similarity gate + negation heuristic
│   │   ├── db/session.py     # engine + session
│   │   ├── models/           # SQLAlchemy models + Pydantic schemas
│   │   ├── services/
│   │   │   └── memory_service.py # pgvector queries + flag/resolve flow
│   │   ├── cli.py            # export, import and namespace stats
│   │   └── main.py           # app entrypoint + /health
│   ├── alembic/              # migrations
│   ├── benchmark/            # retrieval benchmark (dataset + runner)
│   ├── tests/                # unit (core) + DB-integration (api)
│   ├── docker-compose.yml    # Postgres+pgvector + API
│   ├── Dockerfile
│   ├── requirements-api.txt
│   └── .env.example
├── package.json              # web dependencies + scripts
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── .env.example              # optional web env override
├── docs/frontend.md          # component map
└── .github/workflows/ci.yml
```

**Search path:** embed the query locally → pgvector cosine-distance scan filtered
by namespace → over-fetch 4× → re-rank in Python by
`similarity × decay × importance` → return the top *k*.

**Write path:** embed the new memory → scan its 5 nearest neighbours → run the
two-stage contradiction check against each → flag (never auto-resolve) any
conflict → commit.

---

## Quickstart

Requires Postgres 16+ with the `pgvector` extension.

### Docker (recommended)

```bash
cd backend
docker compose up
```

Brings up Postgres + pgvector and the API together. The API runs migrations on
boot and listens on <http://localhost:8000> (interactive docs at `/docs`).

### Local

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-api.txt
cp .env.example .env

export DATABASE_URL=postgresql+psycopg://mnemo:mnemo@localhost:5432/mnemo
alembic upgrade head
uvicorn app.main:app --reload
```

Check it's alive:

```bash
curl localhost:8000/health     # {"status":"ok"}
```

### Try it

```bash
KEY=dev-local-key-change-me

# Store a memory
curl -s localhost:8000/v1/memories \
  -H "X-API-Key: $KEY" -H 'Content-Type: application/json' \
  -d '{"content":"Pranav lives in Bengaluru","namespace":"default","importance":4}'

# Contradict it: the response comes back with a flagged contradiction
curl -s localhost:8000/v1/memories \
  -H "X-API-Key: $KEY" -H 'Content-Type: application/json' \
  -d '{"content":"Pranav no longer lives in Bengaluru","namespace":"default"}'

# Search (ranked by relevance, not raw similarity)
curl -s localhost:8000/v1/memories/search \
  -H "X-API-Key: $KEY" -H 'Content-Type: application/json' \
  -d '{"query":"Where does Pranav live?","namespace":"default"}'
```

---

## API

All routes require an `X-API-Key` header.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/memories` | Store a memory; returns any contradictions it triggers |
| `POST` | `/v1/memories/search` | Semantic search, relevance-ranked |
| `GET` | `/v1/memories` | Paginated list for a namespace |
| `GET` | `/v1/memories/{id}` | Fetch one (optional `?namespace=` scope) |
| `DELETE` | `/v1/memories/{id}` | Soft-delete (`is_active=False`; optional `?namespace=` scope) |
| `GET` | `/v1/contradictions` | List flagged contradictions |
| `POST` | `/v1/contradictions/resolve` | Resolve by naming the winner |
| `GET` | `/v1/namespaces/{namespace}/export` | Snapshot memories and contradictions |
| `GET` | `/v1/namespaces/{namespace}/stats` | Aggregate namespace counts |

`GET /health` (liveness) and `GET /ready` (readiness: queries the database)
are unauthenticated. Full request/response schemas are in
`backend/app/models/schemas.py` and rendered at `/docs`.

### Namespace administration

The CLI writes a portable JSON snapshot, restores it into an empty namespace,
and prints aggregate counts without going through HTTP. Exports include
soft-deleted memories and the contradiction audit trail; vectors are omitted
because the text is re-embedded on import.

```bash
cd backend
PYTHONPATH=. python -m app.cli export --namespace default --file backup.json
PYTHONPATH=. python -m app.cli import --file backup.json --namespace restored
PYTHONPATH=. python -m app.cli stats --namespace default
```

Imports remap UUIDs by default, so a snapshot can be restored alongside the
original namespace. Use `--preserve-ids` only when restoring into an empty
database and the original IDs must survive.

---

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://mnemo:mnemo@localhost:5432/mnemo` | Postgres + pgvector |
| `MNEMO_API_KEY` | `dev-local-key-change-me` | Sent as `X-API-Key` |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Change ⇒ also change `EMBEDDING_DIM` **and** the `Vector(...)` size in the migration |
| `EMBEDDING_DIM` | `384` | Must match the model |
| `DECAY_HALF_LIFE_DAYS` | `180` | Days for the decay factor to halve |
| `DECAY_FLOOR` | `0.7` | Floor on the decay multiplier, high on purpose; see below |
| `CONTRADICTION_SIM_THRESHOLD` | `0.82` | Similarity gate before the negation check |

---

## Benchmark

`backend/benchmark/` holds 60 seed memories from a personal-assistant memory (profile,
habits, health, people, side projects, infrastructure) and 50 hand-labelled
natural-language queries. Queries are paraphrases rather than substrings, so the
benchmark measures semantic recall rather than keyword overlap. `created_at` is
backdated per memory, and several facts are deliberately superseded by fresher
ones, so the decay ranking is genuinely exercised.

```bash
cd backend
export DATABASE_URL=postgresql+psycopg://mnemo:mnemo@localhost:5432/mnemo
PYTHONPATH=. python benchmark/run.py

# Baseline: rank by raw cosine only, to isolate what decay contributes
PYTHONPATH=. python benchmark/run.py --no-decay
```

Current results (50 queries, 60 memories, `all-MiniLM-L6-v2`):

| Ranking | Top-1 | Top-3 | MRR |
|---|---|---|---|
| `similarity × decay × importance` | **80.0%** | **94.0%** | **0.875** |
| raw cosine similarity (baseline) | 78.0% | 94.0% | 0.864 |

A query counts as correct at rank *k* if any of its gold memory ids appears in
the top *k*, since several questions have more than one defensible answer.

**What the benchmark caught.** The original scoring used a 30-day half-life with
a 0.05 floor and an importance band of 0.6 to 1.4. Together those spanned ~28×,
while cosine similarity across the corpus spans under 3×, so the decay term
didn't nudge the ranking, it *dictated* it, degenerating search into "newest
first". That configuration scored **36% top-3**. Widening the half-life to 180
days, raising the floor to 0.7, and narrowing importance to 0.9 to 1.1 brought it to
94%. `backend/tests/test_core.py` now pins the invariant so it can't regress.

**Honest caveat.** On this benchmark decay is worth about +2 points of top-1 over
raw cosine and nothing at top-3. Its value shows up on the six recency-sensitive
queries (where a fact has been superseded), where it takes top-3 from 83% to
100%. The parameters were tuned against these same 50 queries, so treat the
headline number as an in-sample result.

---

## Testing

```bash
cd backend

# Pure-logic unit tests (decay + contradiction), no DB needed
PYTHONPATH=. pytest tests/test_core.py -v

# Full suite. DB-integration tests exercise real pgvector cosine ops and are
# auto-skipped unless Postgres+pgvector is reachable at DATABASE_URL.
export DATABASE_URL=postgresql+psycopg://mnemo:mnemo@localhost:5432/mnemo
PYTHONPATH=. pytest tests/ -v
```

`backend/tests/test_frontend_parity.py` parses both `backend/app/core/` and
`lib/mnemo.ts` and asserts the browser-side mirror of the thresholds, limits and
negation markers still matches the backend. It needs no database and runs in CI
alongside `test_core.py`.

`.github/workflows/ci.yml` also runs the full suite against a `pgvector/pgvector`
service, typechecks and builds the web app, and runs the Playwright smoke tests
for the landing page, docs and playground.

---

## Frontend

The repo root is a Next.js 15 (App Router) + Tailwind marketing site, an
interactive documentation page and a standalone playground. The landing sections
and the docs guide body are MDX; interactive islands stay TypeScript. They are
**static at runtime**: the demos reuse the real ranking formula and contradiction
logic ported into `lib/`, so no API key is ever exposed in the browser.

```bash
pnpm install
pnpm dev        # http://localhost:3005  (docs at /docs, playground at /playground)
pnpm build      # production build
pnpm typecheck  # tsc --noEmit
pnpm test:e2e   # Playwright smoke tests
```

See [`docs/frontend.md`](docs/frontend.md) for the component map. The "View on
GitHub" CTAs default to this repository; set `NEXT_PUBLIC_GITHUB_URL` in
`.env.local` only to point them elsewhere (see `.env.example`).

### Deploying the web app

Import the **repo root** as the Vercel project. The Next.js app is at the root,
and `.vercelignore` keeps `backend/` out of the upload. Set
`NEXT_PUBLIC_SITE_URL` to the production origin (for example
`https://mnemo.dev`) so canonical URLs, the sitemap and the Open Graph tags
resolve to the real domain; without it the app falls back to the domain Vercel
assigns the project. Vercel Web Analytics is already mounted in `app/layout.tsx`
and starts reporting once the project is deployed.

The API is deployed
separately from `backend/` (Docker image or any Python host).

---

## Design notes

- **Contradiction detection is deterministic**, in two stages: a cosine
  similarity gate (0.82) establishes the two memories are about the same thing,
  then a negation-marker heuristic checks whether exactly one side carries a
  polarity flip ("no longer", "stopped", "former", …) while sharing subject
  matter. No LLM call, so it's cheap and explainable; `backend/app/core/contradiction.py`
  has an `llm_check` slot to swap in a model verdict later without touching call
  sites, with the similarity gate still running first.
- **Contradictions are flagged, never auto-resolved.** Resolution is an explicit
  `POST /v1/contradictions/resolve` naming the winner; the loser is
  **soft-deleted** (`is_active=False`) so the audit trail survives. Nothing is
  ever hard-deleted.
- **Namespaces** are the tenant boundary. Every query filters by namespace.
- **Single vector store.** pgvector only, no second vector database.

---

## License

[MIT](LICENSE) © 2026 Pranav Gawai
