"""Maximal Marginal Relevance selection for diverse search results.

MMR re-orders an already-scored candidate pool so the top-k balances relevance
against redundancy:

    mmr(item) = (1 - diversity) * relevance
              - diversity * max_redundancy(item, selected)

``diversity`` in [0, 1]: 0 keeps the pure relevance order, 1 greedily picks the
candidate least similar to everything already chosen. Redundancy is the max
cosine similarity between the candidate and any selected item, mapped from
cosine's [-1, 1] to [0, 1] so the two terms share a scale.

Pure functions only — unit-tested without a database (tests/test_diversity.py).
"""

from __future__ import annotations

import math
from typing import Any


def _cosine(a: list[float], b: list[float]) -> float:
    """Cosine similarity with a zero-vector guard (returns 0.0)."""
    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0
    for x, y in zip(a, b, strict=False):
        dot += x * y
        norm_a += x * x
        norm_b += y * y
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))


def mmr_select(
    scored: list[tuple[Any, float, float, float]],
    *,
    diversity: float,
    limit: int,
) -> list[tuple[Any, float, float, float]]:
    """Greedy MMR over ``(item, similarity, relevance, age)`` rows.

    Items must expose ``.embedding`` (list of floats) — ORM Memory rows do.
    Returns at most ``limit`` rows; the returned order is the MMR order. With
    ``diversity == 0`` this is a stable relevance sort.
    """
    if diversity <= 0:
        return sorted(scored, key=lambda row: row[2], reverse=True)[:limit]

    remaining = sorted(scored, key=lambda row: row[2], reverse=True)
    selected: list[tuple[Any, float, float, float]] = []
    selected_vectors: list[list[float]] = []

    while remaining and len(selected) < limit:
        best_row = None
        best_mmr = -math.inf
        best_vector: list[float] = []
        for row in remaining:
            item, similarity, relevance, age = row
            vector = list(getattr(item, "embedding", None) or [])
            redundancy = (
                max(
                    (_cosine(vector, chosen) + 1.0) / 2.0 for chosen in selected_vectors
                )
                if selected_vectors
                else 0.0
            )
            mmr = (1.0 - diversity) * relevance - diversity * redundancy
            if mmr > best_mmr:
                best_mmr = mmr
                best_row = row
                best_vector = vector
        if best_row is None:  # pragma: no cover - remaining is non-empty here
            break
        selected.append(best_row)
        selected_vectors.append(best_vector)
        remaining.remove(best_row)

    return selected
