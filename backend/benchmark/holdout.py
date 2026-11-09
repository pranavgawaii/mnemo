"""Compare fixed retrieval policies on new questions without changing baselines.

    PYTHONPATH=. python -m benchmark.holdout --output /tmp/mnemo-holdout.json

Uses the existing synthetic corpus and a unique temporary namespace. The fixture
questions are disjoint from the original 50 queries. This is a query-only holdout,
not unseen people, unseen documents, or proof of answer quality. No policy is
selected or tuned by this runner; misses remain in the report.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.models import Contradiction, Memory
from benchmark.run import DATASET, public_scores, run_benchmark

QUERIES = Path(__file__).with_name("holdout-queries.json")


def load_holdout(corpus_path: Path = DATASET, queries_path: Path = QUERIES) -> tuple[dict, str]:
    corpus = json.loads(corpus_path.read_text())
    holdout = json.loads(queries_path.read_text())
    known_ids = {item["id"] for item in corpus["memories"]}
    old_queries = {item["query"].strip().casefold() for item in corpus["queries"]}
    queries = holdout["queries"]
    seen: set[str] = set()
    if not queries:
        raise ValueError("Holdout needs labelled queries.")
    for item in queries:
        query = item["query"].strip().casefold()
        if not query or query in old_queries or query in seen:
            raise ValueError("Holdout questions must be unique and disjoint from the original queries.")
        if not item["gold"] or not set(item["gold"]) <= known_ids:
            raise ValueError("Holdout gold IDs must refer to known synthetic memories.")
        seen.add(query)
    return {**corpus, "namespace": "holdout-" + uuid.uuid4().hex, "queries": queries}, holdout["scope"]


def run_comparison() -> dict:
    data, scope = load_holdout()
    rows = []
    try:
        for label, no_decay, weight in [("cosine", True, 0.0), ("decay", False, 0.0), ("hybrid", False, 0.25)]:
            with SessionLocal() as db:
                scores = run_benchmark(db, data, no_decay=no_decay, keyword_weight=weight)
            rows.append({"mode": label, **public_scores(scores), "misses": scores.get("misses", []),
                         "query_results": scores["_query_results"]})
    finally:
        # Never touch the ordinary benchmark namespace or application namespaces.
        with SessionLocal() as db:
            db.execute(delete(Contradiction).where(Contradiction.namespace == data["namespace"]))
            db.execute(delete(Memory).where(Memory.namespace == data["namespace"]))
            db.commit()
    return {
        "format_version": 1, "measured_at": datetime.now(timezone.utc).isoformat(),
        "scope": scope, "python": platform.python_version(), "platform": platform.platform(),
        "embedding_model": settings.embedding_model,
        "corpus_sha256": hashlib.sha256(DATASET.read_bytes()).hexdigest(),
        "queries_sha256": hashlib.sha256(QUERIES.read_bytes()).hexdigest(),
        "scoring": {"decay_half_life_days": settings.decay_half_life_days, "decay_floor": settings.decay_floor},
        "results": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    protected = {DATASET.resolve(), QUERIES.resolve(), Path(__file__).with_name("baselines.json").resolve()}
    if args.output.resolve() in protected:
        parser.error("The report must not overwrite fixture data or gate baselines.")
    report = run_comparison()
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    for row in report["results"]:
        print(f"{row['mode']}: top-1={row['top1_accuracy']:.1%}, top-3={row['topk_accuracy']:.1%}, MRR={row['mrr']:.3f}")
    print(f"Saved {args.output}; original gate baselines were not changed.")


if __name__ == "__main__":
    main()
