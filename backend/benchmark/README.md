# Retrieval benchmark

The dataset contains 60 memories and 50 hand-labelled queries. Each query has
one or more acceptable memory IDs. The runner uses the real embedding,
pgvector selection and memory-service ranking path.

## Reproduce the public comparison

Use a development PostgreSQL database with pgvector, migrations applied and the
API dependencies installed. From `backend/`:

```bash
PYTHONPATH=. python benchmark/report.py
```

This command deletes and reseeds the dataset's `benchmark` namespace, including
its contradiction rows, for each policy. Do not keep application data in that
namespace. It writes `frontend/public/benchmark-results.json` and leaves the saved gate
baselines unchanged.

The report compares:

1. Raw cosine: no decay, importance or keyword boost.
2. Base relevance: similarity × decay × importance, with zero keyword weight.
3. Default keyword policy: base relevance plus keyword weight 0.25.

Created timestamps are backdated from the dataset's `age_days` values. The
snapshot records the dataset hash, model, scoring settings, environment and
measurement time. Results depend on the model, database and environment.

## Metrics and scope

Top-1 / top-3 count a query as correct when any gold memory appears at rank 1 /
within the first 3 hits. MRR uses the first correct result's reciprocal rank.
The runner also records NDCG and search latency percentiles. Those timings are
local search-path measurements, not a hosted service's end-to-end latency.

The saved run favors raw cosine. This small in-sample comparison does not
establish agent answer quality, conflict accuracy, tenant isolation or
production-scale throughput. Tune on separate development data and evaluate
unseen cases before claiming a quality improvement.

For the regression gate and individual policy options, inspect `gate.py` and
`run.py`; `PYTHONPATH=. python benchmark/run.py --help` lists the runner arguments.
