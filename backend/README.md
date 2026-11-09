# Mnemo backend

A Python API that stores application-approved facts, retrieves cited context and
flags possible changes for explicit review. FastAPI, a local MiniLM encoder,
SQLAlchemy and PostgreSQL/pgvector run as one backend service. Your application
supplies the facts and owns answer generation.

## Run locally

```bash
cd backend
docker compose up --build
```

Docker applies migrations and warms the encoder before accepting requests.
`GET /health` checks process liveness; `GET /ready` checks the database. Keep
application keys scoped to their namespaces. The bootstrap key is an operator
credential. See [deployment](../docs/deployment.md) for direct Python setup.

## Write and recall flow

1. Embed the supplied text locally; do not infer that every chat message is a fact.
2. Take an exclusive transaction-scoped namespace lock. Concurrent writes in
   the same namespace see previous committed writes; unrelated namespaces can
   continue independently.
3. Look for near duplicates and potential conflicts. A derived assertion index
   finds matching subject/attribute records even outside the five nearest vector
   neighbours. Unknown statements retain the existing similarity/negation path.
4. Commit the memory, conflict flags, audit events and webhook outbox together.
   Flags never choose a winner automatically.
5. On context requests, concurrent readers share the namespace lock. Retrieval
   and pending-conflict checks agree on the application's committed write state.
   Expired, inactive and actionable disputed facts are excluded by default.
6. Pack complete facts into a character budget with citations and inclusion /
   exclusion reasons. The application decides whether to generate or abstain.

The lock wait is bounded to five seconds. A busy namespace returns 503 with
`Retry-After: 1`; no partial memory is committed. More than 1,000 recognized
candidate facts for one subject/attribute returns 409 instead of silently
truncating a conflict check. Archive or review unnecessary active records.

## Supported changes and limits

The versioned parser recognizes literal English subjects and a small set of
current assertions: city of residence, employer, favourite cuisine, monthly
grocery budget and work start time. Explicit from/to changes additionally cover
learning goals and running routines. Multiple learning goals or routines alone
are not treated as mutually exclusive.

Plans, alternatives and historical qualifiers are declined. Equivalent clock
formats and same-currency amounts normalize to the same value; currencies are
not converted. Subject aliases, pronouns, arbitrary paraphrases, multilingual
claims and general numeric relationships are not resolved. A flag is a request
for review, not proof that either statement is true.

`assertions_v1.py` is a frozen derived-index format after release. Migration
0015 backfills existing source records in batches of 500 without rewriting text.
It requires an online database connection. A future extraction version needs an
explicit reindex migration. New writes, content edits and logical restores
maintain the same index transactionally.

An unresolved pair is actionable only while both memories are active and
unexpired in the same namespace. Context, paginated open-conflict lists and open
counts apply that rule. Historical pairs remain in exports; archiving one side
does not invent an automatic resolution decision.

## Structure

| Directory | Responsibility |
| --- | --- |
| `app/api/` | Authentication, request validation and HTTP routes |
| `app/core/` | Embeddings, assertion rules, ranking, budgets and observability |
| `app/services/` | Transactions, context assembly, access keys and outbox jobs |
| `app/models/` | Database models and public DTOs |
| `app/db/` | Engine and request-session lifecycle |
| `alembic/` | Versioned schema and data migrations |
| `tests/` | Logic, API, concurrency and failure regressions |
| `benchmark/` | Retrieval comparisons and numerical regression gates |
| `evaluation/` | Context, lifecycle, conflict, load and recovery measurements |

## Validate

Use an explicitly disposable `MNEMO_TEST_DATABASE_URL` whose database name
starts with `mnemo_test_`. Integration tests create and drop their test tables.

```bash
# From backend/, in the API Python environment:
pip install -e ../sdk
python -m pytest tests/ -q
ruff check . ../sdk
mypy app
python benchmark/gate.py
```

The regression gate rejects missing, non-finite and out-of-range metrics. It
cannot silently pass NaN scores or overwrite a baseline with invalid numbers.
Ranking defaults have not been changed to chase this small benchmark. The
[retrieval comparison](benchmark/README.md) still reports where raw cosine wins.

## Measured evidence

- [Original conflict run](evaluation/reports/conflicts.json): 7 true positives,
  5 missed conflicts and no false positives over 24 authored pairs.
- [After hardening](evaluation/reports/conflicts-after-hardening.json): 12 true
  positives, no misses and no false positives on those same pairs. These cases
  informed development; the result is a regression check, **not independent
  accuracy**. The original report is preserved.
- [Local load sample](evaluation/reports/load-local.json): 120 concurrent-scheduled
  context requests at concurrency 4, over 200 synthetic memories, including
  known-fact checks and HTTP/SDK handling. Inspect the recorded environment and
  failures before comparing timings. This does not establish production capacity.
- [Recovery drill](evaluation/reports/recovery.json): a real `pg_dump` /
  `pg_restore` round trip, matching table hashes, preserved reviewed state,
  migration backfill and reclamation of an expired job lease.
- [Retrieval recheck](evaluation/reports/retrieval-recheck.json): the existing
  query-only holdout rerun after hardening, with its shared-corpus scope retained.

To rerun load against a disposable local API, set `MNEMO_API_KEY` to a dedicated
read/write key, then use:

```bash
python -m evaluation.conflicts --output /tmp/conflicts.json
python -m evaluation.load --requests 120 --concurrency 4 --corpus-size 200 \
  --output /tmp/load.json
```

The runners use fresh namespaces with expiring synthetic facts and archive only
the rows they created. Soft-deleted history and audit records can remain.

For recovery, set `DATABASE_URL` to a local PostgreSQL server connection and run
from a development machine with matching `pg_dump` / `pg_restore` tools:

```bash
python -m evaluation.recovery --output /tmp/recovery.json
```

The drill requires CREATEDB permission. It creates and removes two new UUID
`mnemo_test_recovery_*` databases; it never dumps or drops the database named in
your connection string. Temporary dump files are private and removed afterwards.
This is not a production backup procedure or an RPO/RTO guarantee.

PATCH replaces a source record; the audit records the mutation but does not
provide an immutable copy of every previous text version. Soft deletion and
logical exports preserve existing records; they are not physical privacy purges.

Independent user/corpus evaluation, generated-answer correctness and sustained
operational use remain necessary before making broader production claims.
