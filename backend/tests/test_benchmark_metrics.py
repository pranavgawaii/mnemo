"""Benchmark metrics - pure, no database needed."""

from __future__ import annotations

from benchmark.metrics import mrr, ndcg_at_k, percentile, top1_accuracy, topk_accuracy


def test_percentile_nearest_rank():
    assert percentile([], 0.5) == 0.0
    values = [float(i) for i in range(1, 101)]  # 1..100
    assert percentile(values, 0.0) == 1.0
    assert percentile(values, 1.0) == 100.0
    # Nearest-rank on the (n-1) scale: index round(0.50 * 99) = 50 -> value 51.
    assert percentile(values, 0.5) == 51.0
    assert percentile(values, 0.95) == 95.0
    # Monotone in fraction.
    assert percentile(values, 0.4) <= percentile(values, 0.6)


def test_top1_and_topk():
    ranks = [1, 2, None, 3, 1]
    assert top1_accuracy(ranks) == 2 / 5
    assert topk_accuracy(ranks, k=3) == 4 / 5
    assert topk_accuracy(ranks, k=1) == 2 / 5
    assert topk_accuracy([], 3) == 0.0


def test_mrr_ignores_misses():
    assert mrr([1, 3, None]) == (1 + 1 / 3) / 3
    assert mrr([None, None]) == 0.0


def test_ndcg_perfect_relevance():
    # Two gold hits retrieved at ranks 1 and 2 -> perfect NDCG@2.
    assert ndcg_at_k([[1, 2]], k=2) == 1.0


def test_ndcg_rewards_early_hits():
    # Gold only at rank 2 of 2: dcg = 1/log2(3); idcg = 1/log2(2) = 1.
    score = ndcg_at_k([[2]], k=2)
    assert 0.5 < score < 1.0
    # Miss entirely scores 0.
    assert ndcg_at_k([[None]], k=2) == 0.0


def test_ndcg_averages_queries_and_respects_k():
    # Query 1 perfect at ranks 1,2; query 2 misses both -> mean 0.5 at k=2.
    assert ndcg_at_k([[1, 2], [None]], k=2) == 0.5
    # At k=1 only rank-1 hits count.
    assert ndcg_at_k([[2]], k=1) == 0.0
    assert ndcg_at_k([[1]], k=1) == 1.0


def test_ndcg_empty_input():
    assert ndcg_at_k([], k=3) == 0.0
