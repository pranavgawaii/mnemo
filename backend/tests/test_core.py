"""Unit tests for the pure scoring/contradiction logic (no DB required)."""

from __future__ import annotations

import math

import pytest

from app.core.contradiction import ContradictionVerdict, check_contradiction
from app.core.decay import decay_factor, importance_weight, relevance_score


# --------------------------------------------------------------------------- #
# Decay
# --------------------------------------------------------------------------- #
def test_decay_factor_at_zero_age_is_one():
    assert decay_factor(0.0, half_life_days=30) == pytest.approx(1.0)


def test_decay_factor_halves_each_half_life():
    # floor=0.0 so the raw exponential is visible; the production floor (0.7)
    # would otherwise clamp both of these.
    assert decay_factor(30.0, half_life_days=30, floor=0.0) == pytest.approx(0.5)
    assert decay_factor(60.0, half_life_days=30, floor=0.0) == pytest.approx(0.25)


def test_decay_factor_respects_floor():
    # Ancient memory: factor would be ~0 but is floored.
    assert decay_factor(10_000.0, half_life_days=30, floor=0.05) == pytest.approx(0.05)


def test_decay_factor_clamps_negative_age():
    # Future timestamp / clock skew shouldn't exceed 1.0.
    assert decay_factor(-5.0, half_life_days=30) == pytest.approx(1.0)


def test_decay_factor_rejects_nonpositive_half_life():
    with pytest.raises(ValueError):
        decay_factor(10.0, half_life_days=0)


def test_importance_weight_scale():
    assert importance_weight(3) == pytest.approx(1.0)
    assert importance_weight(1) == pytest.approx(0.90)
    assert importance_weight(5) == pytest.approx(1.10)
    # Clamping out-of-range values.
    assert importance_weight(99) == pytest.approx(1.10)
    assert importance_weight(-3) == pytest.approx(0.90)


def test_relevance_combines_all_signals():
    sim = 0.9
    expected = sim * decay_factor(30, half_life_days=30) * importance_weight(5)
    assert relevance_score(sim, 30, 5, half_life_days=30) == pytest.approx(expected)


def test_recency_breaks_ties_at_equal_similarity():
    """Between two equally-relevant memories, the fresher one wins."""
    fresh = relevance_score(0.7, 10, 3)
    stale = relevance_score(0.7, 400, 3)
    assert fresh > stale


def test_relevance_never_lets_decay_outrank_a_better_match():
    """Regression: decay must modulate ranking, never dominate it.

    The original tuning (half-life 30d, floor 0.05) spanned 20x, which swamped
    cosine similarity entirely and turned search into "newest first" — it scored
    36% top-3 on the benchmark versus 94% once corrected. This pins the
    invariant: a clearly better semantic match must still win, however old it is.
    """
    ancient_strong_match = relevance_score(0.85, 3650, 1)  # 10 years old, low importance
    fresh_weak_match = relevance_score(0.45, 0, 5)  # brand new, top importance
    assert ancient_strong_match > fresh_weak_match


def test_combined_multiplier_stays_within_a_narrow_band():
    """The decay x importance multiplier must span less than cosine similarity."""
    best = decay_factor(0) * importance_weight(5)
    worst = decay_factor(10_000) * importance_weight(1)
    # Under 2x spread, versus the ~3x spread of similarity across a real corpus.
    assert best / worst < 2.0


# --------------------------------------------------------------------------- #
# Contradiction
# --------------------------------------------------------------------------- #
def test_similarity_below_gate_is_not_contradiction():
    v = check_contradiction("a", "b", similarity=0.5)
    assert isinstance(v, ContradictionVerdict)
    assert v.is_contradiction is False


def test_negation_flip_flags_contradiction():
    v = check_contradiction(
        "Pranav no longer lives in Bengaluru",
        "Pranav lives in Bengaluru",
        similarity=0.95,
    )
    assert v.is_contradiction is True
    assert "polarity" in v.reason.lower() or "negation" in v.reason.lower()


def test_same_polarity_not_contradiction():
    v = check_contradiction(
        "Pranav lives in Bengaluru",
        "Pranav is based in Bengaluru",
        similarity=0.95,
    )
    assert v.is_contradiction is False


def test_negation_without_shared_subject_not_flagged():
    # Both similar and one negated, but no meaningful shared content words.
    v = check_contradiction("not really", "totally really", similarity=0.9)
    # "really" is shared -> could flag; use clearly disjoint subjects instead:
    v2 = check_contradiction("never Berlin", "Tokyo always", similarity=0.9)
    assert v2.is_contradiction is False


def test_llm_check_overrides_heuristic():
    # LLM says "no contradiction" even though heuristic would flag it.
    def always_no(new: str, old: str, sim: float):
        return (False, "LLM judged these compatible.")

    v = check_contradiction(
        "Pranav no longer lives in Bengaluru",
        "Pranav lives in Bengaluru",
        similarity=0.95,
        llm_check=always_no,
    )
    assert v.is_contradiction is False
    assert "LLM" in v.reason


def test_llm_check_deferring_falls_back_to_heuristic():
    # Returning None means "no opinion" -> heuristic decides.
    def defer(new: str, old: str, sim: float):
        return None

    v = check_contradiction(
        "Pranav no longer lives in Bengaluru",
        "Pranav lives in Bengaluru",
        similarity=0.95,
        llm_check=defer,
    )
    assert v.is_contradiction is True


def test_llm_check_not_called_below_gate():
    calls = {"n": 0}

    def counting(new: str, old: str, sim: float):
        calls["n"] += 1
        return (True, "should not be reached")

    v = check_contradiction("a", "b", similarity=0.1, llm_check=counting)
    assert v.is_contradiction is False
    assert calls["n"] == 0
