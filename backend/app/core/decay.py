"""Relevance decay scoring.

Relevance combines three signals::

    relevance = similarity * decay_factor(age, half_life) * importance_weight

The decay factor is exponential in the memory's age, parameterised by a
half-life (default 180 days) and floored at ``DECAY_FLOOR`` (default 0.7).

**Why the floor is high.** Both multipliers must stay in a *narrower* band than
cosine similarity itself, or ranking stops being about relevance. Similarity
across a real corpus spans roughly 0.3-0.8 (under 3x), so a decay term that
spans 20x (the original half-life 30 / floor 0.05) does not nudge the ranking —
it dictates it, degenerating search into "newest first". The benchmark caught
this directly: that configuration scored 36% top-3 versus 94% for the tuned one
(see ``benchmark/``). The floor bounds the penalty at 30%, enough to break ties
between comparably-relevant memories without ever overriding a clearly better
semantic match.

Importance is deliberately gentler still (0.9-1.1) for the same reason.

These functions are pure and deterministic — they have no DB or model
dependencies and are unit-tested in ``tests/test_core.py``.
"""

from __future__ import annotations

import math

from app.core.config import settings


def decay_factor(
    age_days: float,
    half_life_days: float | None = None,
    floor: float | None = None,
) -> float:
    """Exponential decay factor for a memory of the given age.

    At ``age_days == 0`` the factor is ``1.0``; after one half-life it is
    ``0.5``; after two, ``0.25``; and so on — never dropping below ``floor``.

    Args:
        age_days: Age of the memory in days. Negative values (clock skew /
            future timestamps) are clamped to ``0``.
        half_life_days: Days for the factor to halve. Defaults to the configured
            ``DECAY_HALF_LIFE_DAYS``.
        floor: Minimum returned factor. Defaults to configured ``DECAY_FLOOR``.
    """
    half_life = settings.decay_half_life_days if half_life_days is None else half_life_days
    fl = settings.decay_floor if floor is None else floor

    if half_life <= 0:
        raise ValueError("half_life_days must be positive")

    age = max(0.0, age_days)
    factor = math.pow(0.5, age / half_life)
    return max(fl, factor)


def importance_weight(importance: int) -> float:
    """Map a 1-5 importance rating to a multiplicative weight.

    Importance is a small integer scale where 3 is "neutral" (weight ``1.0``).
    Lower importance dampens relevance; higher importance boosts it. The band is
    deliberately narrow (±10%) so importance breaks ties without outranking a
    better semantic match — the wider 0.6-1.4 band this replaced cost 10 points
    of top-3 accuracy on the benchmark.

    Args:
        importance: Integer in the inclusive range ``[1, 5]``. Out-of-range
            values are clamped.
    """
    clamped = max(1, min(5, importance))
    # 1 -> 0.90, 2 -> 0.95, 3 -> 1.00, 4 -> 1.05, 5 -> 1.10
    return 1.0 + (clamped - 3) * 0.05


def relevance_score(
    similarity: float,
    age_days: float,
    importance: int,
    half_life_days: float | None = None,
    floor: float | None = None,
) -> float:
    """Combine cosine similarity, age decay, and importance into one score.

    Args:
        similarity: Cosine similarity in ``[-1, 1]`` (typically ``[0, 1]``).
        age_days: Age of the memory in days.
        importance: Integer importance rating (1-5).
        half_life_days: Optional half-life override.
        floor: Optional decay-floor override.

    Returns:
        The composite relevance score. Not clamped to ``[0, 1]`` — importance
        can push it slightly above the raw similarity, which is intentional.
    """
    return (
        similarity
        * decay_factor(age_days, half_life_days=half_life_days, floor=floor)
        * importance_weight(importance)
    )
