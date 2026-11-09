"""Regenerate the public local comparison snapshot without changing baselines.

Run from backend: PYTHONPATH=. python benchmark/report.py
Uses the benchmark dataset's namespace; run against a development database.
"""

import hashlib
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from app.db.session import SessionLocal
from benchmark.run import DATASET, public_scores, run_benchmark


def main() -> None:
    rows = []
    data = json.loads(DATASET.read_text())
    for label, no_decay, weight in [("decay", False, 0.0), ("cosine", True, 0.0), ("hybrid", False, 0.25)]:
        with SessionLocal() as db:
            scores = run_benchmark(db, data, no_decay=no_decay, keyword_weight=weight)
        rows.append({"mode": label, **public_scores(scores)})
    report = {
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "python": platform.python_version(),
        "platform": platform.platform(),
        "embedding_model": settings.embedding_model,
        "dataset": "backend/benchmark/dataset.json",
        "dataset_sha256": hashlib.sha256(DATASET.read_bytes()).hexdigest(),
        "scoring": {
            "decay_half_life_days": settings.decay_half_life_days,
            "decay_floor": settings.decay_floor,
            "importance_weights": [1 + (importance - 3) * 0.05 for importance in range(1, 6)],
        },
        "scope": "Local in-sample retrieval; not a held-out or end-to-end agent evaluation",
        "results": rows,
    }
    destination = Path(__file__).resolve().parents[2] / "public" / "benchmark-results.json"
    destination.write_text(json.dumps(report, indent=2) + "\n")
    print(f"Saved {destination}")


if __name__ == "__main__":
    main()
