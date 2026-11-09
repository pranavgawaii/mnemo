"""Strict, portable JSONL case format for labelled context evaluations."""

from __future__ import annotations

import json
import math
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

STATUSES = {"ready", "empty", "needs_review", "budget_exhausted"}
FIELDS = {
    "id", "query", "namespace", "expected_memory_ids", "forbidden_memory_ids",
    "expected_status", "max_chars", "min_similarity", "tags",
}


@dataclass(frozen=True)
class EvaluationCase:
    id: str
    query: str
    namespace: str
    expected_memory_ids: frozenset[str] | None = None
    forbidden_memory_ids: frozenset[str] = frozenset()
    expected_status: str | None = None
    max_chars: int = 4000
    min_similarity: float = 0.25
    tags: tuple[str, ...] = ()


def _ids(data: Any, name: str) -> frozenset[str]:
    if not isinstance(data, list) or any(not isinstance(item, str) for item in data):
        raise ValueError(f"{name} must be a list of UUID strings.")
    try:
        normalized = [str(uuid.UUID(item)) for item in data]
    except ValueError as exc:
        raise ValueError(f"{name} contains an invalid UUID.") from exc
    if len(set(normalized)) != len(normalized):
        raise ValueError(f"{name} contains duplicate UUIDs.")
    return frozenset(normalized)


def parse_case(data: Any) -> EvaluationCase:
    """Reject typos instead of silently evaluating with unintended defaults."""
    if not isinstance(data, dict):
        raise ValueError("Each evaluation case must be a JSON object.")
    if set(data) - FIELDS:
        raise ValueError(f"Unknown case fields: {', '.join(sorted(set(data) - FIELDS))}.")
    for name, maximum in [("id", 128), ("namespace", 128), ("query", 8000)]:
        value = data.get(name)
        if not isinstance(value, str) or not value.strip() or len(value) > maximum:
            raise ValueError(f"{name} must be nonempty text of at most {maximum} characters.")
    budget = data.get("max_chars", 4000)
    if type(budget) is not int or not 128 <= budget <= 32000:
        raise ValueError("max_chars must be an integer between 128 and 32000.")
    threshold = data.get("min_similarity", 0.25)
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)) or (
        not math.isfinite(threshold) or not -1 <= threshold <= 1
    ):
        raise ValueError("min_similarity must be finite and between -1 and 1.")
    expected = _ids(data["expected_memory_ids"], "expected_memory_ids") if "expected_memory_ids" in data else None
    forbidden = _ids(data.get("forbidden_memory_ids", []), "forbidden_memory_ids")
    if expected is not None and expected & forbidden:
        raise ValueError("Expected and forbidden memory IDs must not overlap.")
    status = data.get("expected_status")
    if status is not None and (not isinstance(status, str) or status not in STATUSES):
        raise ValueError("expected_status must name a context response status.")
    if expected is None and not forbidden and status is None:
        raise ValueError("A case needs expected IDs, forbidden IDs or an expected status.")
    tags = data.get("tags", [])
    if not isinstance(tags, list) or len(tags) > 5 or any(
        not isinstance(tag, str) or not tag.strip() or len(tag) > 64 for tag in tags
    ):
        raise ValueError("tags must contain up to five nonempty strings of at most 64 characters.")
    return EvaluationCase(
        id=data["id"], query=data["query"], namespace=data["namespace"],
        expected_memory_ids=expected, forbidden_memory_ids=forbidden, expected_status=status,
        max_chars=budget, min_similarity=float(threshold), tags=tuple(tags),
    )


def load_cases(path: Path) -> list[EvaluationCase]:
    """Read JSONL with useful line errors and unique case IDs; blank lines are ignored."""
    cases: list[EvaluationCase] = []
    seen: set[str] = set()
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            case = parse_case(json.loads(line))
            if case.id in seen:
                raise ValueError("Duplicate case ID.")
        except (ValueError, TypeError) as exc:
            # Never echo a line containing potentially private queries or facts.
            raise ValueError(f"Invalid evaluation case on line {line_number}: {exc}") from exc
        seen.add(case.id)
        cases.append(case)
    if not cases:
        raise ValueError("The evaluation file contains no cases.")
    return cases
