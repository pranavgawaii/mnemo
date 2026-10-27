"""Retrieval and latency metrics for the Mnemo benchmark.

Pure functions — no database, fully unit-tested (tests/test_benchmark_metrics.py).

Rank convention: ranks are 1-indexed; ``None`` means the gold memory was not
found within the retrieved window (counts as "not retrieved", not as a rank).
"""

from __future__ import annotations

import math

Rank = int | None


def percentile(values: list[float], fraction: float) -> float:
    """Nearest-rank percentile. ``percentile([], f)`` is 0.0."""
    if not values:
        return 0.0
    ordered = sorted(values)
    rank = min(len(ordered) - 1, int(round(fraction * (len(ordered) - 1))))
    return ordered[rank]


def top1_accuracy(ranks: list[Rank]) -> float:
    """Fraction of queries whose first gold hit is at rank 1."""
    if not ranks:
        return 0.0
    return sum(1 for rank in ranks if rank == 1) / len(ranks)


def topk_accuracy(ranks: list[Rank], k: int) -> float:
    """Fraction of queries with a gold hit inside the top ``k``."""
    if not ranks:
        return 0.0
    return sum(1 for rank in ranks if rank is not None and rank <= k) / len(ranks)


def mrr(ranks: list[Rank]) -> float:
    """Mean reciprocal rank of the first gold hit (misses contribute 0)."""
    if not ranks:
        return 0.0
    reciprocal = sum(1.0 / rank for rank in ranks if rank is not None)
    return reciprocal / len(ranks)


def ndcg_at_k(ranks_per_query: list[list[Rank]], k: int) -> float:
    """NDCG@k with binary relevance, averaged over queries.

    Each query contributes the ranks of *all* its gold hits that were
    retrieved (misses are simply absent). With binary relevance the ideal DCG
    has ``min(len(gold), k)`` hits at the top positions.
    """
    if not ranks_per_query:
        return 0.0
    total = 0.0
    for gold_ranks in ranks_per_query:
        discount = [1.0 / math.log2(position + 2) for position in range(k)]
        dcg = sum(discount[rank - 1] for rank in gold_ranks if rank is not None and rank <= k)
        ideal_hits = min(len(gold_ranks), k)
        idcg = sum(discount[position] for position in range(ideal_hits))
        total += dcg / idcg if idcg > 0 else 0.0
    return total / len(ranks_per_query)
