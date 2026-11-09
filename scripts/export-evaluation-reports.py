"""Publish saved evaluation reports without rerunning or altering measurements.

    python scripts/export-evaluation-reports.py
    python scripts/export-evaluation-reports.py --check

Backend reports are canonical. The frontend copies expose the same complete
artifacts and support static imports. A changed source must be republished;
CI rejects drift. No environment values or live data are read.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "backend/evaluation/reports"
DESTINATION = ROOT / "frontend/public/evaluation"
NAMES = ("retrieval-holdout.json", "lifecycle.json", "conflicts.json")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    stale = []
    for name in NAMES:
        source = SOURCE / name
        payload = source.read_bytes()
        report = json.loads(payload)
        fixtures = {
            "retrieval-holdout.json": {
                "corpus_sha256": ROOT / "backend/benchmark/dataset.json",
                "queries_sha256": ROOT / "backend/benchmark/holdout-queries.json",
            },
            "conflicts.json": {"cases_sha256": ROOT / "backend/evaluation/conflict-cases.json"},
        }
        for field, fixture in fixtures.get(name, {}).items():
            if report.get(field) != hashlib.sha256(fixture.read_bytes()).hexdigest():
                print(f"Saved {name} does not match its fixture. Rerun the evaluation before publishing.")
                return 1
        target = DESTINATION / name
        if args.check:
            if not target.exists() or target.read_bytes() != payload:
                stale.append(name)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(payload)
    if stale:
        print("Stale public evaluation reports: " + ", ".join(stale))
        return 1
    print("Saved evaluation reports match." if args.check else "Published saved evaluation reports.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
