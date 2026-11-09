"""Regression gate comparison - pure, no database needed."""

from __future__ import annotations

import pytest

from benchmark.gate import compare, save_baselines

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


def test_gate_cli_loads_baseline_file(tmp_path, monkeypatch):
    import json
    import sys
    from unittest.mock import Mock

    from benchmark import gate

    dataset = tmp_path / "dataset.json"
    dataset.write_text("{}")
    baselines = tmp_path / "baselines.json"
    baselines.write_text(json.dumps(BASELINE))
    monkeypatch.setattr(sys, "argv", ["gate", "--dataset", str(dataset), "--baselines", str(baselines)])
    monkeypatch.setattr(gate, "SessionLocal", Mock())
    monkeypatch.setattr(gate, "run_benchmark", lambda *a, **kw: {
        "top1_accuracy": 0.8, "topk_accuracy": 0.9, "mrr": 0.85,
        "ndcg_at_k": 0.85, "latency_p95_ms": 500,
    })
    assert gate.main() == 0


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), -0.1, 1.1, None, "0.9", True])
def test_bad_quality_values_never_pass_or_get_pinned(tmp_path, bad):
    scores = {"top1_accuracy": bad, "topk_accuracy": 0.9, "mrr": 0.9,
              "ndcg_at_k": 0.9, "latency_p95_ms": 1}
    assert compare(scores, BASELINE)
    target = tmp_path / "baseline.json"
    target.write_text("original")
    with pytest.raises(ValueError):
        save_baselines(target, scores)
    assert target.read_text() == "original"


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), -1, None, "500", True])
def test_invalid_latency_baselines_fail_closed(bad):
    scores = {"top1_accuracy": 1, "topk_accuracy": 1, "mrr": 1,
              "ndcg_at_k": 1, "latency_p95_ms": 1}
    failures = compare(scores, {**BASELINE, "latency_p95_ms_max": bad})
    assert failures == ["baseline invalid: latency_p95_ms_max"]
