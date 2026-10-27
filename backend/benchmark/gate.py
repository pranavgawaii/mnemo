"""Benchmark regression gate.

Runs the retrieval benchmark and fails (exit 1) when the current scores drop
below the committed baselines in ``benchmark/baselines.json`` — so a ranking
change that quietly hurts retrieval cannot merge unnoticed.

    PYTHONPATH=. python benchmark/gate.py                 # compare
    PYTHONPATH=. python benchmark/gate.py --update        # re-pin baselines
    PYTHONPATH=. python benchmark/gate.py --dataset benchmark/synthetic.json

Quality metrics (top1/top-k accuracy, MRR, NDCG@k) must stay at or above the
baseline; search latency p95 must stay at or below its ceiling. The pure
comparison lives in :func:`compare` and is unit-tested without a database.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.db.session import SessionLocal
from benchmark.run import DATASET, run_benchmark

BASELINES = Path(__file__).with_name("baselines.json")

QUALITY_METRICS = ("top1_accuracy", "topk_accuracy", "mrr", "ndcg_at_k")


def compare(scores: dict, baselines: dict) -> list[str]:
    """Return failure descriptions; empty list means the gate passes.

    Baseline keys are ``<metric>_min`` for quality metrics and
    ``latency_p95_ms_max`` for the latency ceiling.
    """
    failures: list[str] = []
    for metric in QUALITY_METRICS:
        key = f"{metric}_min"
        if key not in baselines:
            failures.append(f"baseline missing: {key}")
            continue
        actual = float(scores.get(metric, 0.0))
        minimum = float(baselines[key])
        if actual < minimum:
            failures.append(f"{metric}: {actual:.3f} < baseline {minimum:.3f}")

    if "latency_p95_ms_max" not in baselines:
        failures.append("baseline missing: latency_p95_ms_max")
    else:
        actual = float(scores.get("latency_p95_ms", float("inf")))
        ceiling = float(baselines["latency_p95_ms_max"])
        if actual > ceiling:
            failures.append(f"latency_p95_ms: {actual:.1f} > ceiling {ceiling:.1f}")
    return failures


def load_baselines(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_baselines(path: Path, scores: dict) -> None:
    """Re-pin baselines from the current run's public scores."""
    public = {key: value for key, value in scores.items() if not key.startswith("_") and key != "misses"}
    baseline = {
        "top1_accuracy_min": public["top1_accuracy"],
        "topk_accuracy_min": public["topk_accuracy"],
        "mrr_min": public["mrr"],
        "ndcg_at_k_min": public["ndcg_at_k"],
        "latency_p95_ms_max": public["latency_p95_ms"],
    }
    path.write_text(json.dumps(baseline, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", default=str(DATASET), help="Dataset JSON to evaluate.")
    parser.add_argument(
        "--baselines", default=str(BASELINES), help="Baseline JSON to compare against."
    )
    parser.add_argument(
        "--update", action="store_true", help="Overwrite baselines with this run's scores."
    )
    parser.add_argument("--k", type=int, default=3)
    args = parser.parse_args()

    data = json.loads(Path(args.dataset).read_text(encoding="utf-8"))
    db = SessionLocal()
    try:
        scores = run_benchmark(db, data, k=args.k)
    finally:
        db.close()

    baselines_path = Path(args.baselines)
    if args.update:
        save_baselines(baselines_path, scores)
        print(f"Baselines re-pinned to {baselines_path}.")
        return 0

    failures = compare(scores, baselines_path)
    if not failures:
        print("gate: benchmark meets baselines")
        return 0
    print("gate: benchmark regressed")
    for failure in failures:
        print(f"  - {failure}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
