"""Flag possible conflicts without choosing a winner.

The versioned assertion parser compares recognized current values for a literal
subject/attribute. Explicit from/to changes must match the recorded source.
These checks can qualify a pair below the vector threshold. Other candidates
use the similarity-gated polarity heuristic; a configured model verdict takes
precedence above that gate and may defer to the deterministic fallback.

The service combines indexed assertion candidates with nearby vector candidates.
These narrow rules are not general natural-language inference or factual truth.
Every flag still requires an explicit review decision.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, Optional

from app.core.assertions_v1 import assertion_conflict
from app.core.config import settings
from app.core.relocation import RELOCATION_REASON, explicit_relocation
from app.core.revisions import explicit_revision

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
        boundary = r"(?![a-z])" if marker != "ex-" else ""
        matched = re.search(r"(?<![a-z])" + re.escape(marker) + boundary, lowered)
        contraction = marker == "n't" and re.search(r"[a-z]+n't\b", lowered)
        if matched or contraction:
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

    # Different negative phrases can agree ("never" versus "does not").
    # Only compare polarity when exactly one statement contains negation.
    only_one_side = new_neg.symmetric_difference(old_neg)
    if bool(new_neg) == bool(old_neg):
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

    assertion = assertion_conflict(new_content, existing_content)
    relocation = explicit_relocation(new_content, existing_content)
    revision = explicit_revision(new_content, existing_content)
    # Exact subject/source evidence can qualify a relocation below this gate.
    if similarity < threshold and not relocation and not revision and not assertion:
        return ContradictionVerdict(
            is_contradiction=False,
            similarity=similarity,
            reason=f"Similarity {similarity:.2f} below gate {threshold:.2f}.",
        )

    # Stage 2a: optional LLM verdict takes precedence when it has an opinion.
    if llm_check is not None and similarity >= threshold:
        verdict = llm_check(new_content, existing_content, similarity)
        if verdict is not None:
            is_contra, reason = verdict
            return ContradictionVerdict(
                is_contradiction=is_contra,
                similarity=similarity,
                reason=reason,
            )

    if relocation:
        return ContradictionVerdict(True, similarity, RELOCATION_REASON)
    if revision:
        return ContradictionVerdict(True, similarity, revision)

    if assertion:
        return ContradictionVerdict(
            True, similarity,
            "Different confirmed values for the same recognized subject and single-valued attribute; review required.",
        )

    # Stage 2b: negation-marker heuristic.
    is_contra, reason = _heuristic_verdict(new_content, existing_content, similarity)
    return ContradictionVerdict(
        is_contradiction=is_contra,
        similarity=similarity,
        reason=reason,
    )
