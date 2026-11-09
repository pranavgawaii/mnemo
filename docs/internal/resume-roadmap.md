# Mnemo student project and resume roadmap

Mnemo is an intermediate student capstone for backend and applied AI roles.
Python, SQL, HTTP APIs and basic embeddings are enough to build the main flow.
Transactions, concurrent writes and recoverable jobs are the advanced work.
Using a pretrained embedder alone provides limited evidence of model development.

Focus on a small PostgreSQL memory service with inspectable retrieval, source
evidence and explicit conflict review. Keep FastAPI, PostgreSQL, pgvector and the
Python SDK. A modular backend is sufficient.

## Ratings before and after this repair pass

These subjective ratings measure completeness and evidence, not student ability
or hiring odds. They reflect source review, database reproductions and desktop
and mobile browser inspection.

| Area | Before / 10 | Current / 10 | Main remaining limitation |
|---|---:|---:|---|
| Problem relevance | 8 | 8 | Crowded category |
| Visual frontend | 7.5 | 7.5 | Presentation is ahead of the working product flow |
| Mobile usability | 6 | 6 | Composer sits far below the memory field |
| Developer onboarding | 4 | 6.5 | Fresh-clone Docker setup still needs a separate smoke test |
| Product flow | 5 | 5 | Demonstrations use simulated memory |
| Architecture | 6.5 | 6.5 | Large route and service modules |
| Backend reliability | 4 | 6.5 | More operational and load evidence needed |
| SDK integration | 4 | 7 | Broader consumer examples needed |
| Evaluation credibility | 4 | 5.5 | Published results are reproducible but use a small tuned dataset |
| Applied AI depth | 4 | 4 | No complete agent evaluation |
| ML development depth | 2.5 | 2.5 | No trained ranker or controlled embedding experiment |
| Backend and SDE resume readiness | 5 | 6.5 | Needs a complete demo and measured systems trade-offs |

Current validation: 197 backend tests, 22 SDK tests and four browser tests pass.
Type checks, Ruff, the frontend production build, the retrieval gate and a
migration upgrade/downgrade cycle also pass. These are development checks;
they do not establish production scale or a full security audit.

## Priority zero repair correctness

This change addresses nested SDK responses, HTTP retry headers, clearing expiry,
read/admin scopes, transaction-local webhook jobs, expiring job leases,
stale-worker fencing, serialized conflict resolution, bulk expiry, expired
candidates, disposable test databases, ANN tuning and benchmark correctness.
It also corrects website claims, support links and simulation labels.

Migration 0013 adds worker lease columns. Apply migrations before deploying the
new API or worker. Delivery is at least once: receivers deduplicate the stable
X-Mnemo-Event-ID. The SDK remember helper now leaves conflicts open by default;
pass auto_resolve=True to request last-write-wins.

Exit criteria: real SDK/server contracts, failed-transaction rollback, competing
resolutions, lease recovery, expiry and scope checks pass against PostgreSQL.
CI must migrate a real database and execute the retrieval gate.

## Priority one clarify the architecture

Split API routes by resource. Split memory_service into writes, retrieval and
conflict resolution. Keep pure ranking and conflict policies in core; place SQL
queries and ORM models in db; isolate embedding/model providers and workers.
Retain separate sdk, benchmark, examples and docs directories. Preserve public
contracts during this refactor.

Suggested target (keep the existing Next.js app, components and lib at the root):

```text
backend/app/
  api/routes/       # memories, search, conflicts, namespaces, admin
  services/         # writes, retrieval, conflict resolution
  core/             # pure ranking, decay and conflict policies
  db/               # models, session and reusable SQL queries
  integrations/     # embedding and optional LLM providers
  workers/          # outbox claims and webhook delivery
sdk/
backend/benchmark/
examples/
docs/
```

Each application operation owns one transaction. Participating helpers flush
rather than commit. Keep inference and external HTTP outside database locks
where possible. Test observable behavior rather than directory structure.

Add tenant-bound keys before serving mutually untrusted users. Add immutable
fact versions and complete administrative auditing before claiming a full
reconstructable history. Until then, describe the deployment as single tenant
and namespaces as retrieval buckets.

## Priority two complete the agent and UI flow

Build one SDK-driven support or personal-assistant example. Session one records
a preference; session two changes it; session three recalls the current value.
Show source evidence, time, score components and the chosen conflict policy.
Persistence must survive an API restart.

Add a server-connected memory inspector with facts, search evidence and conflict
review. Keep API credentials on the server. The public simulation now places its
composer ahead of the memory field, supports keyboard recall and shares store
operations with the docs demo. Next, add a sample conflict near the top on mobile.
Retain the public simulation as an introduction.

Exit criteria: a fresh clone runs the example through documented commands; a
short recording and an automated end-to-end test demonstrate the same behavior.

## Priority three establish AI and ML evidence

Freeze development and test splits by user and time before tuning. Include
changing facts, agreeing negatives, marker fragments, numeric/date conflicts,
long inputs and unanswered questions. Adapt a documented subset of
[LongMemEval](https://xiaowu0162.github.io/long-mem-eval/) once ingestion and answer
generation exist.

| Experiment | Measure |
|---|---|
| Raw vectors versus decay and importance | Recall at k, MRR, NDCG and stale-answer rate |
| Keyword versus hybrid retrieval | Quality by query type and latency |
| Two small local embedding models | Quality, CPU inference time and index size |
| Optional reranker over fixed candidates | Quality gained versus added latency |
| Same agent without memory versus with memory | Grounded answer accuracy and abstention |
| Conflict detector alternatives | Precision, recall and false-positive categories |

For an ML-focused version, train a small ranker on similarity, keyword evidence,
age and importance. Evaluate unseen users or later time periods. Publish
negative results and ablations; retain raw cosine if it wins. The current saved
snapshot in public/benchmark-results.json is an in-sample retrieval comparison,
not a held-out agent result.

Run separate backend load experiments at increasing corpus sizes. Record
hardware, corpus construction, concurrency, warm/cold state, p50/p95 latency,
throughput and failures. Do not extrapolate from 60 memories to production scale.

## Resume evidence

For SDE/backend applications, lead with transactions, authorization, SQL indexes,
pagination, failure recovery and SDK compatibility. For applied AI applications,
lead with the agent workflow and evaluation. For ML applications, lead with the
dataset, experiment and model results.

Include an architecture diagram, reproducible setup, a short demo, CI results
and three explained trade-offs. Quantify only measured results with dataset and
hardware context. Do not claim production readiness, novel ML, users or quality
improvements without evidence.

## Frontend delivery

The frontend now has five landing sections, four task-focused docs pages, a
three-action browser playground and optional scoring experiments. The existing
hero and typography are preserved. The API reference reads an exported OpenAPI
snapshot; demos disclose their lexical similarity approximation and run without
backend requests. This is a product demonstration, not evidence of agent
quality, production throughput or conflict accuracy. Those still need the
experiments above.
