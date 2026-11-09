"""Reproducible synthetic memory workflows over the public Python SDK.

    MNEMO_API_KEY=... python -m evaluation.lifecycle --output /tmp/lifecycle.json

Creates expiring synthetic facts in fresh namespaces and archives them after
inspection. Run against a disposable development/demo API using a dedicated
read/write key with access to those namespaces. Reports contain IDs and metrics,
not stored source text. These are authored workflow regressions, not a held-out
conflict benchmark or an end-to-end LLM answer evaluation.
"""

from __future__ import annotations

import argparse
import json
import os
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from mnemo import MnemoClient, MnemoError

from evaluation.cases import EvaluationCase
from evaluation.metrics import assess


@dataclass(frozen=True)
class Scenario:
    id: str
    initial: str
    change: str
    query: str
    current: str
    keep_initial: bool = False
    second_change: str | None = None
    final: str | None = None


SCENARIOS = (
    Scenario("city", "Riya lives in Bengaluru", "Riya moved from Bengaluru to Pune",
             "Where does Riya live?", "Riya lives in Pune"),
    Scenario("cuisine", "Aarav's favourite cuisine is Thai",
             "Aarav's favourite cuisine changed from Thai to Japanese",
             "What is Aarav's favourite cuisine?", "Aarav's favourite cuisine is Japanese"),
    Scenario("learning", "Mira is learning Rust on weekends",
             "Mira switched from learning Rust on weekends to learning Go on weekends",
             "What is Mira learning?", "Mira is learning Go on weekends"),
    Scenario("routine", "Dev runs 5 kilometres three mornings a week",
             "Dev changed running routine from 5 kilometres three mornings a week to 3 kilometres twice a week",
             "What is Dev's running routine?", "Dev runs 3 kilometres twice a week"),
    Scenario("keep-original", "Isha lives in Bengaluru", "Isha moved from Bengaluru to Pune",
             "Where does Isha live?", "Isha lives in Bengaluru", keep_initial=True),
    Scenario("second-move", "Neha lives in Bengaluru", "Neha moved from Bengaluru to Pune",
             "Where does Neha live?", "Neha lives in Pune",
             second_change="Neha moved from Pune to Delhi", final="Neha lives in Delhi"),
)


def run_suite(client: MnemoClient) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    cleanup_errors = 0
    run_id = uuid.uuid4().hex
    expiry = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()

    def inspect(
        case_id: str, namespace: str, query: str, expected: set[str], forbidden: set[str],
        status: str, expected_text: str | None = None, source: str | None = None,
    ) -> None:
        # -1 isolates lifecycle correctness from semantic-similarity tuning. The
        # separate query-only holdout measures actual retrieval ranking quality.
        response = client.context(query, namespace=namespace, min_similarity=-1)
        case = EvaluationCase(case_id, query, namespace, frozenset(expected), frozenset(forbidden), status,
                              min_similarity=-1)
        assessment = assess(case, json.loads(json.dumps(asdict(response), default=str)), min_precision=1)
        errors = list(assessment.contract_errors)
        if expected_text is not None and [item.text for item in response.citations] != [expected_text]:
            errors.append("current_statement_mismatch")
        if source is not None and [item.source_content for item in response.citations] != [source]:
            errors.append("source_not_preserved")
        results.append({"case_id": case_id, "passed": assessment.passed and not errors,
                        "errors": errors, "forbidden_hits": len(assessment.forbidden_selected),
                        "status_matches": assessment.status_matches})

    for scenario in SCENARIOS:
        namespace = f"eval-{run_id}-{scenario.id}"
        created: list[uuid.UUID] = []
        try:
            original, initial_flags = client.add_memory(scenario.initial, namespace=namespace, expires_at=expiry)
            created.append(original.id)
            if initial_flags:
                raise ValueError("Unexpected initial conflict in a fresh namespace.")
            inspect(scenario.id + ":initial", namespace, scenario.query, {str(original.id)}, set(), "ready",
                    scenario.initial, scenario.initial)
            changed, flags = client.add_memory(scenario.change, namespace=namespace, expires_at=expiry)
            created.append(changed.id)
            pair = [item for item in flags if {item.new_memory_id, item.existing_memory_id} == {original.id, changed.id}]
            if len(pair) != 1:
                raise ValueError("Expected exactly one source-matched conflict.")
            inspect(scenario.id + ":pending", namespace, scenario.query, set(), set(map(str, created)), "needs_review")
            winner = original if scenario.keep_initial else changed
            loser = changed if scenario.keep_initial else original
            client.resolve_contradiction(pair[0].id, winner_memory_id=winner.id)
            inspect(scenario.id + ":reviewed", namespace, scenario.query, {str(winner.id)}, {str(loser.id)},
                    "ready", scenario.current, winner.content)
            history = client.get_memory(loser.id, namespace=namespace)
            results.append({"case_id": scenario.id + ":history", "passed": not history.is_active and history.content == loser.content,
                            "errors": [] if not history.is_active and history.content == loser.content else ["history_mismatch"]})
            if scenario.second_change:
                newest, flags = client.add_memory(scenario.second_change, namespace=namespace, expires_at=expiry)
                created.append(newest.id)
                pair = [item for item in flags if {item.new_memory_id, item.existing_memory_id} == {winner.id, newest.id}]
                if len(pair) != 1:
                    raise ValueError("A second change did not match the current active source.")
                inspect(scenario.id + ":second-pending", namespace, scenario.query, set(), set(map(str, created)), "needs_review")
                client.resolve_contradiction(pair[0].id, winner_memory_id=newest.id)
                inspect(scenario.id + ":second-reviewed", namespace, scenario.query, {str(newest.id)},
                        {str(original.id), str(changed.id)}, "ready", scenario.final, newest.content)
        except (MnemoError, httpx.HTTPError, ValueError) as exc:
            results.append({"case_id": scenario.id + ":request", "passed": False,
                            "errors": [type(exc).__name__]})
        finally:
            for memory_id in created:
                try:
                    client.delete_memory(memory_id, namespace=namespace)
                except (MnemoError, httpx.HTTPError):
                    cleanup_errors += 1
    # A past-expiry record is visible by ID but must never be supplied as context.
    namespace = f"eval-{run_id}-expiry"
    expired = None
    try:
        expired, _ = client.add_memory("Omar lives in Jaipur", namespace=namespace,
                                       expires_at=(datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat())
        inspect("expiry:excluded", namespace, "Where does Omar live?", set(), {str(expired.id)}, "empty")
    except (MnemoError, httpx.HTTPError, ValueError) as exc:
        results.append({"case_id": "expiry:request", "passed": False, "errors": [type(exc).__name__]})
    finally:
        if expired:
            try:
                client.delete_memory(expired.id, namespace=namespace)
            except (MnemoError, httpx.HTTPError):
                cleanup_errors += 1
    return {
        "format_version": 1, "measured_at": datetime.now(timezone.utc).isoformat(),
        "scope": "Authored synthetic lifecycle regressions; not held-out conflict accuracy or generated-answer quality.",
        "min_similarity": -1, "scenarios": len(SCENARIOS) + 1,
        "checks": len(results), "passed": sum(item["passed"] for item in results),
        "failed": sum(not item["passed"] for item in results), "cleanup_errors": cleanup_errors,
        "results": results,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    key = os.environ.get("MNEMO_API_KEY")
    if not key:
        parser.error("Set MNEMO_API_KEY to a development/demo read/write key.")
    with MnemoClient(base_url=args.base_url, api_key=key, timeout=60) as client:
        report = run_suite(client)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(f"{report['passed']}/{report['checks']} lifecycle checks passed; cleanup errors: {report['cleanup_errors']}.")
    return 0 if report["failed"] == 0 and report["cleanup_errors"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
