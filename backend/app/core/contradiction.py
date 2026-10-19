"""Contradiction detection between memories.

Two-stage design:

1. **Vector similarity gate.** Two memories only *can* contradict if they talk
   about the same thing. We require cosine similarity above
   ``CONTRADICTION_SIM_THRESHOLD`` (default 0.82) before considering them.

2. **Negation-marker heuristic.** Among near-duplicate pairs, a contradiction is
   flagged when one memory carries a negation / reversal marker that the other
   lacks (e.g. "works at X" vs "no longer works at X"). This is a cheap,
   explainable default.

A pluggable ``llm_check`` callable slot lets a real LLM verdict (e.g. a hosted
classification model) be swapped in later without touching call sites. When
provided, it takes precedence over the heuristic for the final verdict, but the
similarity gate still runs first so we never spend an LLM call on unrelated
memories.

Contradictions are *flagged*, never auto-resolved. Resolution is an explicit,
human-driven action.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, Optional

from app.core.config import settings

# Words/phrases that flip or negate a statement's polarity. Kept deliberately
# small and high-precision; the LLM slot is the path to real nuance.
_NEGATION_MARKERS: tuple[str, ...] = (
    "no longer",
    "not",
    "never",
    "n't",
    "isn't",
    "wasn't",
    "doesn't",
    "didn't",
    "stopped",
    "quit",
    "left",
    "former",
    "formerly",
    "ex-",
    "used to",
    "no more",
    "ceased",
    "resigned",
    "cancelled",
    "canceled",
)

_WORD_RE = re.compile(r"[a-z0-9']+|no longer|used to|no more")


@dataclass(frozen=True)
class ContradictionVerdict:
    """Result of a contradiction check between two memories."""

    is_contradiction: bool
    similarity: float
    reason: str


# Signature for a pluggable LLM-based verdict. Given the two memory contents and
# their similarity, it returns (is_contradiction, reason). Return ``None`` to
# defer to the heuristic.
LlmCheck = Callable[[str, str, float], Optional[tuple[bool, str]]]


def _negation_markers(text: str) -> set[str]:
    """Return the set of negation markers present in ``text`` (lowercased)."""
    lowered = text.lower()
    found: set[str] = set()
    for marker in _NEGATION_MARKERS:
        if marker in lowered:
            found.add(marker)
    return found


def _content_words(text: str) -> set[str]:
    """Return meaningful lowercased tokens, dropping negation markers/stopwords."""
    tokens = set(_WORD_RE.findall(text.lower()))
    return {t for t in tokens if t not in _NEGATION_MARKERS and len(t) > 2}


def _heuristic_verdict(new_content: str, existing_content: str, similarity: float) -> tuple[bool, str]:
    """Negation-marker heuristic verdict for a near-duplicate pair.

    A contradiction is flagged when the two memories share substantial content
    but differ in negation polarity — one negates what the other asserts.
    """
    new_neg = _negation_markers(new_content)
    old_neg = _negation_markers(existing_content)

    # Symmetric difference: a marker present on exactly one side signals a
    # polarity flip. If both sides negate (or neither does), no contradiction.
    only_one_side = new_neg.symmetric_difference(old_neg)
    if not only_one_side:
        return False, "High similarity but no polarity difference detected."

    # Require meaningful shared subject matter so we don't flag two unrelated
    # negations that merely happen to be similar.
    shared = _content_words(new_content) & _content_words(existing_content)
    if not shared:
        return False, "Polarity differs but no shared subject matter."

    markers = ", ".join(sorted(only_one_side))
    return (
        True,
        f"Similar content (sim={similarity:.2f}) with opposing polarity; "
        f"negation marker(s) on one side only: {markers}.",
    )


def check_contradiction(
    new_content: str,
    existing_content: str,
    similarity: float,
    *,
    sim_threshold: float | None = None,
    llm_check: LlmCheck | None = None,
) -> ContradictionVerdict:
    """Decide whether ``new_content`` contradicts ``existing_content``.

    Args:
        new_content: The incoming memory's text.
        existing_content: The candidate existing memory's text.
        similarity: Precomputed cosine similarity between the two.
        sim_threshold: Override for the similarity gate. Defaults to configured
            ``CONTRADICTION_SIM_THRESHOLD``.
        llm_check: Optional pluggable LLM verdict. When it returns a non-``None``
            result for a pair that passes the gate, it overrides the heuristic.

    Returns:
        A :class:`ContradictionVerdict`.
    """
    threshold = settings.contradiction_sim_threshold if sim_threshold is None else sim_threshold

    # Stage 1: similarity gate.
    if similarity < threshold:
        return ContradictionVerdict(
            is_contradiction=False,
            similarity=similarity,
            reason=f"Similarity {similarity:.2f} below gate {threshold:.2f}.",
        )

    # Stage 2a: optional LLM verdict takes precedence when it has an opinion.
    if llm_check is not None:
        verdict = llm_check(new_content, existing_content, similarity)
        if verdict is not None:
            is_contra, reason = verdict
            return ContradictionVerdict(
                is_contradiction=is_contra,
                similarity=similarity,
                reason=reason,
            )

    # Stage 2b: negation-marker heuristic.
    is_contra, reason = _heuristic_verdict(new_content, existing_content, similarity)
    return ContradictionVerdict(
        is_contradiction=is_contra,
        similarity=similarity,
        reason=reason,
    )
