"""Hybrid search fusion: keyword ranking boosts vector relevance.

The vector path stays the source of truth for *relevance* (similarity x decay x
importance). Keyword evidence is a multiplier, not a competitor:

    final = relevance * (1 + keyword_weight * kw_norm)

where ``kw_norm`` is the row's ``ts_rank`` normalised against the best keyword
match in the candidate set. A memory that both matches semantically and hits the
query terms rises; a keyword hit with weak vector similarity does not outrank a
clearly better semantic match.

Pure functions only — unit-tested without a database in tests/test_hybrid.py.
"""

from __future__ import annotations

import uuid
from typing import Any


def normalize_ranks(ranks: dict[uuid.UUID, float]) -> dict[uuid.UUID, float]:
    """Scale keyword ranks to [0, 1] against the best match in the set.

    Returns {} for empty input; a single hit normalises to 1.0. Ranks are
    non-negative; the max is trusted from the caller's query.
    """
    if not ranks:
        return {}
    best = max(ranks.values())
    if best <= 0:
        return {key: 0.0 for key in ranks}
    return {key: value / best for key, value in ranks.items()}


def apply_keyword_boost(
    scored: list[tuple[Any, float, float, float]],
    keyword_ranks: dict[uuid.UUID, float],
    keyword_weight: float,
) -> list[tuple[Any, float, float, float]]:
    """Multiply relevance by the keyword evidence for each scored row.

    ``scored`` rows are ``(memory, similarity, relevance, age_days)``. Rows not
    in ``keyword_ranks`` keep their relevance unchanged. Sorting is the
    caller's job (it may want to return top-k after this).
    """
    if keyword_weight <= 0 or not keyword_ranks:
        return scored
    boosted: list[tuple[Any, float, float, float]] = []
    for memory, similarity, relevance, age in scored:
        boost = 1.0 + keyword_weight * keyword_ranks.get(memory.id, 0.0)
        boosted.append((memory, similarity, relevance * boost, age))
    return boosted
