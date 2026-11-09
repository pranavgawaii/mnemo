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

## Query-only holdout

`holdout-queries.json` freezes 30 additional manually labelled questions, disjoint
from the original 50 questions, over the same 60 synthetic memories. It does not
hold out entities or the memory corpus. The policies are fixed in advance and
this runner does not tune weights or overwrite gate baselines.

```bash
PYTHONPATH=. python -m benchmark.holdout --output /tmp/mnemo-holdout.json
```

The runner uses a fresh UUID namespace and removes its own synthetic rows in a
finally block. It never clears the ordinary benchmark or application namespaces.
The report records dataset hashes, settings, local timings, every query's gold
rank and top IDs, and misses. Inspect the
[saved run](../evaluation/reports/retrieval-holdout.json) alongside the original
comparison; an easier query set is not evidence of an improvement in the system.

For state changes, run `python -m evaluation.lifecycle --output /tmp/lifecycle.json`
against a disposable development/demo API with `MNEMO_API_KEY` set. It performs
27 checks across seven authored scenarios: four update types, keeping the old
fact, a second move, history preservation and TTL exclusion. It creates expiring
synthetic facts in fresh namespaces and soft-deletes them afterwards. Its context
threshold is -1 to isolate lifecycle checks from semantic quality. This is a
workflow regression suite, not a held-out contradiction benchmark or model test.

## Authored conflict challenges

With the SDK installed and a local disposable API running, from `backend/`:

```bash
python -m evaluation.conflicts --output /tmp/conflicts.json
```

Set `MNEMO_API_KEY` to a read/write key for that API. Use default
`DEDUP_MODE=flag`; a reject policy turns duplicate writes into request errors.
The frozen [24-pair fixture](../evaluation/conflict-cases.json) includes 12
labelled conflicts and 12 compatible, unrelated or uncertain pairs. It tests
actual API writes, local embeddings, pgvector candidates and conflict flags.
Each pair uses an isolated namespace. Facts expire in 30 minutes and are
soft-deleted after inspection; history, audit events and jobs may remain.

The [saved report](../evaluation/reports/conflicts.json) records 7 true positives,
0 false positives, 5 false negatives and 12 true negatives: 100% flag precision
on just 7 flags, but only 58.3% recall over 12 conflicts. The five misses are
implicit city/employer changes and numeric updates. These are deliberately
reported limitations; no detector rules were tuned to make this set pass.

API failures are excluded from the confusion matrix and make the run incomplete.
Cleanup failures also return a nonzero exit code. A completed measurement can
contain false positives and misses; exit 0 does not mean perfect quality. Tests
exercise both real writes and failure accounting. These authored, synthetic
labels are not independent annotation, an unseen-entity holdout or an end-to-end
answer evaluation. Use independent data before making general accuracy claims.

Saved backend reports are canonical. Run
`python scripts/export-evaluation-reports.py` from the repository root to publish
them to the website. CI uses `--check` to reject stale public copies. Publishing
reports never reruns a measurement or changes the original ranking baselines.
