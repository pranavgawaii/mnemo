"""Evaluation metrics must distinguish labelled evidence from missing labels."""

from __future__ import annotations

import copy
import json
import uuid
from dataclasses import asdict

import pytest

from app.core.context import ContextCandidate, pack_context
from evaluation.cases import EvaluationCase, load_cases, parse_case
from evaluation.metrics import assess, summarize

FIRST = str(uuid.uuid4())
SECOND = str(uuid.uuid4())
THIRD = str(uuid.uuid4())


def case(**options):
    return EvaluationCase("city", "Where does Riya live?", "eval", **options)


def response(ids=(FIRST,), **changes):
    candidates = [ContextCandidate(uuid.UUID(item), f"Fact {i}", 0.9, 0.8) for i, item in enumerate(ids)]
    packed = pack_context(candidates)
    raw = json.loads(json.dumps(asdict(packed), default=str))
    return {"namespace": "eval", "query": "Where does Riya live?", "candidate_count": len(candidates), **raw, **changes}


def test_full_relevant_set_has_perfect_selection_metrics():
    result = assess(case(expected_memory_ids=frozenset([FIRST, SECOND])), response([FIRST, SECOND]))
    assert result.passed and result.contract_errors == ()
    assert result.precision == result.recall == result.reciprocal_rank == 1


def test_partial_recall_and_irrelevant_first_hit_are_measured_separately():
    result = assess(case(expected_memory_ids=frozenset([SECOND, THIRD])), response([FIRST, SECOND]))
    assert result.precision == 0.5 and result.recall == 0.5 and result.reciprocal_rank == 0.5
    assert not result.passed
    assert assess(case(expected_memory_ids=frozenset([SECOND, THIRD])), response([FIRST, SECOND]), min_recall=0.5).passed


def test_missing_labels_never_become_a_perfect_quality_score():
    result = assess(case(expected_status="ready"), response())
    assert result.passed
    assert result.precision is result.recall is result.reciprocal_rank is None
    summary = summarize([result])
    assert summary["labelled_cases"] == 0
    assert summary["micro_precision"] is summary["micro_recall"] is summary["mrr"] is None
    assert summary["status_accuracy"] == 1


def test_explicit_empty_label_fails_if_any_fact_is_included():
    labelled = case(expected_memory_ids=frozenset())
    assert not assess(labelled, response()).passed
    assert assess(labelled, response([])).passed


def test_forbidden_old_fact_fails_even_when_recall_passes():
    labelled = case(expected_memory_ids=frozenset([SECOND]), forbidden_memory_ids=frozenset([FIRST]))
    result = assess(labelled, response([FIRST, SECOND]))
    assert result.recall == 1 and not result.passed
    assert result.forbidden_selected == (FIRST,)


def test_status_assertion_catches_a_review_regression():
    result = assess(case(expected_status="needs_review"), response())
    assert not result.passed and result.status_matches is False


@pytest.mark.parametrize("changes,code", [
    ({"namespace": "other"}, "namespace_mismatch"),
    ({"query": "wrong"}, "query_mismatch"),
    ({"used_chars": 0}, "character_budget_violation"),
    ({"max_chars": 128}, "budget_not_echoed"),
    ({"context": 42}, "context_not_string"),
    ({"citations": "bad"}, "invalid_citations"),
    ({"decisions": None}, "invalid_decisions"),
    ({"candidate_count": 9}, "decision_count_mismatch"),
    ({"status": "unknown"}, "unknown_status"),
    ({"status": "empty"}, "status_content_mismatch"),
])
def test_wire_contract_violations_cannot_pass_an_evaluation(changes, code):
    result = assess(case(expected_status="ready"), response(**changes))
    assert code in result.contract_errors and not result.passed


def test_context_and_citations_must_describe_the_same_ids_and_text():
    raw = response()
    raw["citations"][0]["text"] = "Different claim"
    result = assess(case(expected_status="ready"), raw)
    assert "context_citation_mismatch" in result.contract_errors


def test_included_pending_fact_is_an_explicit_contract_failure():
    raw = response()
    raw["citations"][0]["pending_review"] = True
    assert "pending_fact_in_safe_context" in assess(case(), raw).contract_errors


def test_duplicate_and_nonsequential_citations_are_detected():
    raw = response([FIRST, SECOND])
    raw["citations"][1]["memory_id"] = FIRST
    raw["citations"][1]["citation"] = "M9"
    errors = assess(case(), raw).contract_errors
    assert "duplicate_memory_id" in errors and "nonsequential_citations" in errors


def test_aggregate_uses_micro_counts_and_reports_labelled_case_count():
    first = assess(case(expected_memory_ids=frozenset([FIRST, SECOND])), response([FIRST]))
    second = assess(case(expected_memory_ids=frozenset([SECOND])), response([SECOND, THIRD]))
    unlabelled = assess(case(expected_status="empty"), response([]))
    summary = summarize([first, second, unlabelled])
    assert summary["cases"] == 3 and summary["labelled_cases"] == 2
    assert summary["micro_precision"] == pytest.approx(2 / 3)
    assert summary["micro_recall"] == pytest.approx(2 / 3)
    assert summary["passed"] == 2 and summary["failed"] == 1
    encoded = json.dumps(summary)
    assert "Fact 0" not in encoded and "Where does Riya" not in encoded


def test_valid_case_normalizes_uuids_and_keeps_labels_explicit():
    parsed = parse_case({"id": "moved", "query": "city", "namespace": "eval", "expected_memory_ids": [FIRST.upper()],
                         "forbidden_memory_ids": [SECOND], "expected_status": "ready", "tags": ["work"]})
    assert parsed.expected_memory_ids == frozenset([FIRST])
    assert parsed.tags == ("work",)


@pytest.mark.parametrize("changes", [
    {"extra": True}, {"id": ""}, {"namespace": None}, {"query": " "},
    {"max_chars": True}, {"max_chars": 127}, {"min_similarity": float("nan")},
    {"min_similarity": "high"}, {"expected_status": "found"}, {"expected_status": []},
    {"expected_memory_ids": ["not-a-uuid"]}, {"expected_memory_ids": [FIRST, FIRST]},
    {"expected_memory_ids": [FIRST], "forbidden_memory_ids": [FIRST]},
    {"tags": ["a"] * 6}, {"tags": [True]},
])
def test_invalid_cases_do_not_silently_use_defaults(changes):
    with pytest.raises(ValueError):
        parse_case({"id": "a", "query": "q", "namespace": "eval", "expected_status": "empty", **changes})


def test_unlabelled_case_is_rejected():
    with pytest.raises(ValueError, match="needs"):
        parse_case({"id": "a", "query": "q", "namespace": "eval"})


def test_loader_reports_line_number_without_echoing_query(tmp_path):
    path = tmp_path / "cases.jsonl"
    path.write_text('\n{"id":"a","query":"private fact","namespace":"eval","expected_status":"typo"}\n')
    with pytest.raises(ValueError) as error:
        load_cases(path)
    assert "line 2" in str(error.value) and "private fact" not in str(error.value)


def test_loader_rejects_duplicate_case_ids_and_empty_files(tmp_path):
    path = tmp_path / "cases.jsonl"
    path.write_text("")
    with pytest.raises(ValueError, match="no cases"):
        load_cases(path)
    row = json.dumps({"id": "a", "query": "q", "namespace": "eval", "expected_status": "empty"})
    path.write_text(row + "\n" + row)
    with pytest.raises(ValueError, match="Duplicate"):
        load_cases(path)


def test_reports_do_not_mutate_the_response():
    raw = response()
    before = copy.deepcopy(raw)
    assess(case(), raw)
    assert raw == before
