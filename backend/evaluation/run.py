"""Evaluate prepared namespaces over HTTP without writing, seeding or deleting.

Example (install the editable SDK first)::

    MNEMO_API_KEY=... python -m evaluation.run --cases labelled.jsonl \
        --base-url http://localhost:8000 --output context-report.json

The secret is read from the environment and is never accepted as a command-line
argument or included in a report. Connection failures abort with a nonzero exit
code. A failed case also returns nonzero, making the same command useful in CI.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from evaluation.cases import EvaluationCase, load_cases
from evaluation.metrics import assess, summarize


def evaluate(client: Any, cases: list[EvaluationCase], *, min_recall: float = 1.0) -> dict[str, Any]:
    """Use a sync MnemoClient-shaped object; transport injection keeps tests offline."""
    if not cases:
        raise ValueError("At least one evaluation case is required.")
    if not math.isfinite(min_recall) or not 0 <= min_recall <= 1:
        raise ValueError("min_recall must be finite and between 0 and 1.")
    from dataclasses import asdict

    assessments = []
    for case in cases:
        response = client.context(
            case.query, namespace=case.namespace, max_chars=case.max_chars,
            min_similarity=case.min_similarity, tags=list(case.tags),
            current_values=True, exclude_conflicts=True,
        )
        raw = asdict(response)
        # SDK models carry UUID values; normalize once to the wire representation.
        raw = json.loads(json.dumps(raw, default=str))
        assessments.append(assess(case, raw, min_recall=min_recall))
    return {"format_version": 1, "selection_only": True, "min_recall": min_recall,
            **summarize(assessments)}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Evaluate labelled agent-context selection (read-only).")
    parser.add_argument("--cases", type=Path, required=True, help="Labelled JSONL cases with existing memory IDs.")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--output", type=Path, required=True, help="Report destination; source text is omitted.")
    parser.add_argument("--min-recall", type=float, default=1.0)
    parser.add_argument("--timeout", type=float, default=60.0)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    key = os.environ.get("MNEMO_API_KEY", "")
    if not key:
        print("error: set MNEMO_API_KEY in the environment.", file=sys.stderr)
        return 2
    parsed = urlsplit(args.base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        print("error: base URL must be HTTP(S), without embedded credentials.", file=sys.stderr)
        return 2
    if not math.isfinite(args.timeout) or args.timeout <= 0:
        print("error: timeout must be a positive finite number.", file=sys.stderr)
        return 2
    try:
        import httpx
        from mnemo import MnemoClient
        from mnemo.errors import MnemoError
    except ImportError:
        print("error: install the SDK with pip install -e ../sdk.", file=sys.stderr)
        return 2
    try:
        cases = load_cases(args.cases)
        if args.output.resolve() == args.cases.resolve():
            raise ValueError("The report must not overwrite the case file.")
        with MnemoClient(base_url=args.base_url, api_key=key, timeout=args.timeout) as client:
            report = evaluate(client, cases, min_recall=args.min_recall)
        args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    except (OSError, ValueError, KeyError, TypeError, MnemoError, httpx.HTTPError) as exc:
        # SDK errors can contain arbitrary server-provided text; don't echo it.
        print(f"error: evaluation failed ({type(exc).__name__}). Check input, access and API availability.", file=sys.stderr)
        return 2
    # A completed report is the only evidence of a completed evaluation.
    print(f"{report['passed']}/{report['cases']} cases passed; report: {args.output}")
    return 0 if report["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
