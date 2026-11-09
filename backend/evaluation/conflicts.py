"""Measure conflict flags, including misses, over a frozen authored challenge set.

Run against a disposable local API with default dedup_mode=flag and a dedicated
read/write key. Each pair gets an isolated namespace; synthetic facts expire in
30 minutes and are soft-deleted afterwards. API/cleanup failures invalidate a
run instead of becoming true negatives. Reports omit source text and secrets.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import httpx
from mnemo import MnemoClient, MnemoError

DATASET = Path(__file__).with_name("conflict-cases.json")


def load_challenges(path: Path = DATASET) -> dict[str, Any]:
    data = json.loads(path.read_text())
    cases = data.get("cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("Expected a nonempty challenge set.")
    seen = set()
    for case in cases:
        if not isinstance(case, dict) or set(case) != {"id", "category", "existing", "incoming", "conflict"}:
            raise ValueError("Invalid conflict challenge fields.")
        if any(not isinstance(case[name], str) or not case[name].strip()
               for name in ("id", "category", "existing", "incoming")):
            raise ValueError("Challenge text and identifiers must be nonempty strings.")
        if type(case["conflict"]) is not bool or case["id"] in seen:
            raise ValueError("Expected a boolean label and unique case ID.")
        seen.add(case["id"])
    if not isinstance(data.get("scope"), str) or not data["scope"].strip():
        raise ValueError("The challenge set must describe its scope.")
    return data


def confusion(results: list[dict[str, Any]]) -> dict[str, Any]:
    completed = [row for row in results if type(row["flagged"]) is bool]
    tp = sum(row["expected"] and row["flagged"] for row in completed)
    fp = sum(not row["expected"] and row["flagged"] for row in completed)
    fn = sum(row["expected"] and not row["flagged"] for row in completed)
    tn = sum(not row["expected"] and not row["flagged"] for row in completed)
    return {
        "completed": len(completed), "true_positive": tp, "false_positive": fp,
        "false_negative": fn, "true_negative": tn,
        "precision": tp / (tp + fp) if tp + fp else None,
        "recall": tp / (tp + fn) if tp + fn else None,
    }


def run_challenges(client: MnemoClient, dataset_path: Path = DATASET) -> dict[str, Any]:
    data = load_challenges(dataset_path)
    run_id = uuid.uuid4().hex
    expiry = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    results = []
    cleanup_errors = 0
    for case in data["cases"]:
        namespace = f"eval-conflict-{run_id}-{case['id']}"
        created: list[uuid.UUID] = []
        row = {"case_id": case["id"], "category": case["category"],
               "expected": case["conflict"], "flagged": None, "error": None}
        try:
            original, initial_flags = client.add_memory(case["existing"], namespace=namespace, expires_at=expiry)
            created.append(original.id)
            if initial_flags:
                raise ValueError("Unexpected flags in an empty namespace.")
            incoming, flags = client.add_memory(case["incoming"], namespace=namespace, expires_at=expiry)
            created.append(incoming.id)
            row["flagged"] = any(
                {flag.new_memory_id, flag.existing_memory_id} == {original.id, incoming.id}
                for flag in flags
            )
        except (MnemoError, httpx.HTTPError, ValueError) as exc:
            row["error"] = type(exc).__name__
        finally:
            for memory_id in created:
                try:
                    client.delete_memory(memory_id, namespace=namespace)
                except (MnemoError, httpx.HTTPError):
                    cleanup_errors += 1
        results.append(row)
    metrics = confusion(results)
    return {
        "format_version": 1, "measured_at": datetime.now(timezone.utc).isoformat(),
        "scope": ("Authored synthetic development regressions. These cases informed rule changes; not independently annotated, held-out conflict accuracy or generated-answer quality."
                  if dataset_path.resolve() == DATASET.resolve() else data["scope"]),
        "fixture_role": "development_regression" if dataset_path.resolve() == DATASET.resolve() else "provided_labels",
        "cases_sha256": hashlib.sha256(dataset_path.read_bytes()).hexdigest(),
        "cases": len(results), "complete": metrics["completed"] == len(results) and cleanup_errors == 0,
        "request_errors": sum(row["error"] is not None for row in results), "cleanup_errors": cleanup_errors,
        **metrics,
        "by_category": {category: confusion([row for row in results if row["category"] == category])
                        for category in sorted({row["category"] for row in results})},
        "results": results,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    key = os.environ.get("MNEMO_API_KEY")
    if not key:
        parser.error("Set MNEMO_API_KEY to a disposable API read/write key.")
    parsed = urlsplit(args.base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        parser.error("Use an HTTP(S) base URL without embedded credentials.")
    if args.output.resolve() == DATASET.resolve():
        parser.error("A report must not overwrite challenge labels.")
    with MnemoClient(base_url=args.base_url, api_key=key, timeout=60) as client:
        report = run_challenges(client)
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(f"Completed {report['completed']}/{report['cases']} pairs; precision={report['precision']}, recall={report['recall']}.")
    print("Authored challenge results, not independent accuracy. Inspect false positives and false negatives.")
    return 0 if report["complete"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
