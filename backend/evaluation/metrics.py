"""Assess labelled selection and the context wire contract, without a model.

Expected IDs are an exhaustive relevance set only when supplied by an annotator.
Absent labels never become a perfect score. Precision is undefined for an empty
prediction; recall is undefined for an empty relevance set. Aggregates use only
labelled cases and include their counts so small or partial evaluations remain
visible. Forbidden IDs are a separate safety assertion, not inferred negatives.
"""

from __future__ import annotations

import json
import math
import uuid
from dataclasses import asdict, dataclass
from statistics import mean
from typing import Any

from app.core.context import CONTEXT_HEADER
from evaluation.cases import EvaluationCase


@dataclass(frozen=True)
class Assessment:
    case_id: str
    selected_ids: tuple[str, ...]
    relevant_selected: int
    expected_count: int | None
    forbidden_selected: tuple[str, ...]
    precision: float | None
    recall: float | None
    reciprocal_rank: float | None
    status_matches: bool | None
    contract_errors: tuple[str, ...]
    passed: bool


def _context_contract(case: EvaluationCase, response: dict[str, Any]) -> list[str]:
    """Check evidence consistency, including JSONL/citation correspondence.

    The report records concise error codes rather than leaking source content.
    This validator intentionally catches a server claiming a budget it did not
    honour, or citing memory IDs that do not appear in the packed context.
    """
    errors: list[str] = []
    context = response.get("context")
    citations = response.get("citations")
    decisions = response.get("decisions")
    if response.get("namespace") != case.namespace:
        errors.append("namespace_mismatch")
    if response.get("query") != case.query.strip():
        errors.append("query_mismatch")
    if not isinstance(context, str):
        errors.append("context_not_string")
        return errors
    if response.get("max_chars") != case.max_chars:
        errors.append("budget_not_echoed")
    if response.get("used_chars") != len(context) or len(context) > case.max_chars:
        errors.append("character_budget_violation")
    if not isinstance(citations, list) or not all(isinstance(item, dict) for item in citations):
        errors.append("invalid_citations")
        return errors
    if not isinstance(decisions, list) or not all(isinstance(item, dict) for item in decisions):
        errors.append("invalid_decisions")
        return errors
    if response.get("candidate_count") != len(decisions):
        errors.append("decision_count_mismatch")
    ids = [item.get("memory_id") for item in citations]
    labels = [item.get("citation") for item in citations]
    if len(set(str(item) for item in ids)) != len(ids):
        errors.append("duplicate_memory_id")
    if labels != [f"M{i + 1}" for i in range(len(citations))]:
        errors.append("nonsequential_citations")
    try:
        for memory_id in ids:
            uuid.UUID(str(memory_id))
    except ValueError:
        errors.append("invalid_memory_id")
    if any(not isinstance(item.get("text"), str) or not isinstance(item.get("source_content"), str) for item in citations):
        errors.append("invalid_citation_text")
    if any(item.get("pending_review") is not False for item in citations):
        errors.append("pending_fact_in_safe_context")
    included = [item for item in decisions if item.get("reason") == "included"]
    if [(item.get("memory_id"), item.get("citation")) for item in included] != list(zip(ids, labels, strict=True)):
        errors.append("decision_citation_mismatch")
    if context:
        if context.splitlines()[0] != CONTEXT_HEADER:
            errors.append("invalid_context_header")
        try:
            lines = [json.loads(line) for line in context.splitlines()[1:]]
        except (ValueError, TypeError):
            errors.append("invalid_context_jsonl")
        else:
            expected = [{
                "citation": item.get("citation"), "memory_id": item.get("memory_id"),
                "text": item.get("text"), "pending_review": False,
            } for item in citations]
            if lines != expected:
                errors.append("context_citation_mismatch")
    elif citations:
        errors.append("citations_without_context")
    status = response.get("status")
    if not isinstance(status, str) or status not in {"ready", "empty", "needs_review", "budget_exhausted"}:
        errors.append("unknown_status")
    elif (status == "ready") != bool(citations):
        errors.append("status_content_mismatch")
    return errors


def assess(
    case: EvaluationCase, response: dict[str, Any], *, min_recall: float = 1.0,
    min_precision: float | None = None,
) -> Assessment:
    if not math.isfinite(min_recall) or not 0 <= min_recall <= 1:
        raise ValueError("min_recall must be finite and between 0 and 1.")
    if min_precision is not None and (not math.isfinite(min_precision) or not 0 <= min_precision <= 1):
        raise ValueError("min_precision must be finite and between 0 and 1.")
    contract_errors = _context_contract(case, response)
    citations = response.get("citations")
    selected = tuple(str(item.get("memory_id")) for item in citations if isinstance(item, dict)) if isinstance(citations, list) else ()
    selected_set = set(selected)
    expected = case.expected_memory_ids
    relevant = len(selected_set & expected) if expected is not None else 0
    forbidden = tuple(sorted(selected_set & case.forbidden_memory_ids))
    precision = relevant / len(selected) if expected is not None and selected else None
    recall = relevant / len(expected) if expected else None
    rr = None
    if expected:
        rr = next((1 / rank for rank, memory_id in enumerate(selected, 1) if memory_id in expected), 0.0)
    matches = response.get("status") == case.expected_status if case.expected_status is not None else None
    # An explicit empty relevance set asserts that no fact should be included.
    empty_label_ok = expected != frozenset() or not selected
    passed = not contract_errors and not forbidden and matches is not False and empty_label_ok
    if recall is not None:
        passed = passed and recall >= min_recall
    if precision is not None and min_precision is not None:
        passed = passed and precision >= min_precision
    return Assessment(
        case_id=case.id, selected_ids=selected, relevant_selected=relevant,
        expected_count=len(expected) if expected is not None else None,
        forbidden_selected=forbidden, precision=precision, recall=recall, reciprocal_rank=rr,
        status_matches=matches, contract_errors=tuple(contract_errors), passed=passed,
    )


def summarize(assessments: list[Assessment]) -> dict[str, Any]:
    labelled = [item for item in assessments if item.expected_count is not None]
    selected_count = sum(len(item.selected_ids) for item in labelled)
    relevant = sum(item.relevant_selected for item in labelled)
    expected_count = sum(item.expected_count or 0 for item in labelled)
    ranks = [item.reciprocal_rank for item in labelled if item.reciprocal_rank is not None]
    statuses = [item.status_matches for item in assessments if item.status_matches is not None]
    return {
        "cases": len(assessments), "labelled_cases": len(labelled),
        "passed": sum(item.passed for item in assessments),
        "failed": sum(not item.passed for item in assessments),
        "micro_precision": relevant / selected_count if selected_count else None,
        "micro_recall": relevant / expected_count if expected_count else None,
        "mrr": mean(ranks) if ranks else None,
        "status_accuracy": mean(statuses) if statuses else None,
        "forbidden_hits": sum(len(item.forbidden_selected) for item in assessments),
        "contract_failures": sum(bool(item.contract_errors) for item in assessments),
        "results": [asdict(item) for item in assessments],
    }
