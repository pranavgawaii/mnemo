"""Regression gate comparison - pure, no database needed."""

from __future__ import annotations

from benchmark.gate import compare

BASELINE = {
    "top1_accuracy_min": 0.8,
    "topk_accuracy_min": 0.9,
    "mrr_min": 0.85,
    "ndcg_at_k_min": 0.85,
    "latency_p95_ms_max": 500.0,
}


def test_gate_passes_at_baselines():
    scores = {
        "top1_accuracy": 0.8,
        "topk_accuracy": 0.9,
        "mrr": 0.85,
        "ndcg_at_k": 0.85,
        "latency_p95_ms": 500.0,
    }
    assert compare(scores, BASELINE) == []


def test_gate_fails_on_quality_drop():
    scores = {**BASELINE_FAIL()}
    failures = compare(scores, BASELINE)
    assert any("top1_accuracy" in failure for failure in failures)
    assert any("mrr" in failure for failure in failures)


def BASELINE_FAIL() -> dict:
    return {
        "top1_accuracy": 0.7,
        "topk_accuracy": 0.9,
        "mrr": 0.84,
        "ndcg_at_k": 0.85,
        "latency_p95_ms": 100.0,
    }


def test_gate_fails_on_latency_regression():
    scores = {
        "top1_accuracy": 0.9,
        "topk_accuracy": 0.95,
        "mrr": 0.9,
        "ndcg_at_k": 0.9,
        "latency_p95_ms": 750.0,
    }
    failures = compare(scores, BASELINE)
    assert failures == ["latency_p95_ms: 750.0 > ceiling 500.0"]


def test_gate_missing_scores_count_as_zero():
    failures = compare({}, BASELINE)
    assert len(failures) == 5  # four quality metrics + latency


def test_gate_missing_baseline_keys_fail():
    failures = compare(
        {
            "top1_accuracy": 0.9,
            "topk_accuracy": 0.9,
            "mrr": 0.9,
            "ndcg_at_k": 0.9,
            "latency_p95_ms": 10.0,
        },
        {},
    )
    assert len(failures) == 5
    assert all("baseline missing" in failure for failure in failures)
