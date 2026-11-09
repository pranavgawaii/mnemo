"""New evaluation inputs stay disjoint and gates reject irrelevant citations."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from benchmark.holdout import DATASET, QUERIES, load_holdout, main
from evaluation.cases import EvaluationCase
from evaluation.metrics import assess
from tests.test_context_evaluation import FIRST, SECOND, response


def test_holdout_keeps_new_questions_over_an_explicitly_shared_corpus():
    source = json.loads(DATASET.read_text())
    data, scope = load_holdout()
    assert len(data["queries"]) == 30
    assert data["memories"] == source["memories"]
    assert data["namespace"] != source["namespace"]
    assert "Query-only" in scope


@pytest.mark.parametrize("change", ["duplicate-original", "duplicate-new", "unknown-gold", "empty-gold"])
def test_invalid_holdout_cases_fail_instead_of_becoming_fake_quality_scores(tmp_path, change):
    source = json.loads(DATASET.read_text())
    fixture = json.loads(QUERIES.read_text())
    if change == "duplicate-original":
        fixture["queries"][0] = source["queries"][0]
    elif change == "duplicate-new":
        fixture["queries"][1] = fixture["queries"][0]
    else:
        fixture["queries"][0]["gold"] = ["not-present"] if change == "unknown-gold" else []
    path = tmp_path / "queries.json"
    path.write_text(json.dumps(fixture))
    with pytest.raises(ValueError):
        load_holdout(queries_path=path)


def test_full_recall_with_irrelevant_hits_does_not_pass_a_precision_gate():
    case = EvaluationCase("quality", "Where does Riya live?", "eval", frozenset([FIRST]))
    result = assess(case, response([FIRST, SECOND]), min_precision=1)
    assert result.recall == 1 and result.precision == 0.5 and not result.passed
    assert assess(case, response([FIRST, SECOND]), min_precision=0.5).passed


@pytest.mark.parametrize("precision", [-0.1, 1.1, float("nan"), float("inf")])
def test_invalid_precision_thresholds_are_rejected(precision):
    with pytest.raises(ValueError, match="min_precision"):
        assess(EvaluationCase("x", "q", "eval"), response(), min_precision=precision)


def test_holdout_output_cannot_overwrite_gate_baselines(monkeypatch):
    baselines = Path(__file__).parents[1] / "benchmark/baselines.json"
    original = baselines.read_bytes()
    monkeypatch.setattr("sys.argv", ["holdout", "--output", str(baselines)])
    with pytest.raises(SystemExit) as error:
        main()
    assert error.value.code == 2 and baselines.read_bytes() == original
