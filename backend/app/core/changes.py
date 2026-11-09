"""Python-owned change rules and current-value presentation.

The source record is never rewritten. A current statement is a display
projection of a supported English transition, not a verdict that it is true.
Browser rule data is generated from this module.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass

PERSON = r"([a-z][a-z' -]{0,59}?)"
VALUE = r"([a-z0-9][a-z0-9' -]{0,99}?)"
QUALIFIERS = (
    r"(?:\b(if|when|might|may|maybe|could|would|plans|planning|considering|"
    r"last|next|ago|before|after|yesterday|tomorrow|not|never|no|possibly|probably|or)\b|n't\b)"
)
_QUALIFIED = re.compile(QUALIFIERS, re.IGNORECASE | re.ASCII)


@dataclass(frozen=True)
class ChangeRule:
    key: str
    change: str
    fact: str
    template: str
    reason: str


RULES = (
    ChangeRule(
        "relocation",
        rf"^{PERSON} (?:has )?moved from {PERSON} to {PERSON}$",
        rf"^{PERSON} (?:lives|resides|is based) in {PERSON}$",
        "{subject} lives in {value}",
        "Explicit relocation: same subject moved from the recorded city to a different city; "
        "review required.",
    ),
    ChangeRule(
        "cuisine",
        rf"^{PERSON}'s favou?rite cuisine changed from {VALUE} to {VALUE}$",
        rf"^{PERSON}'s favou?rite cuisine is {VALUE}$",
        "{subject}'s favourite cuisine is {value}",
        "Explicit favourite cuisine revision: same subject and recorded previous value; "
        "review required.",
    ),
    ChangeRule(
        "learning",
        rf"^{PERSON} switched from learning {VALUE} to learning {VALUE}$",
        rf"^{PERSON} is learning {VALUE}$",
        "{subject} is learning {value}",
        "Explicit learning goal revision: same subject and recorded previous value; "
        "review required.",
    ),
    ChangeRule(
        "routine",
        rf"^{PERSON} changed running routine from {VALUE} to {VALUE}$",
        rf"^{PERSON} runs {VALUE}$",
        "{subject} runs {value}",
        "Explicit running routine revision: same subject and recorded previous value; "
        "review required.",
    ),
)
_COMPILED = tuple(
    (rule, re.compile(rule.change, re.IGNORECASE | re.ASCII),
     re.compile(rule.fact, re.IGNORECASE | re.ASCII)) for rule in RULES
)


def _normalize(value: str) -> str:
    return " ".join(value.strip().rstrip(".!").split())


def current_statement(content: str) -> str | None:
    """Project supported changes; retain uncertainty and unknown text."""
    normalized = _normalize(content)
    if _QUALIFIED.search(normalized):
        return None
    for rule, change, _ in _COMPILED:
        match = change.fullmatch(normalized)
        if match:
            subject, previous, current = (part.strip() for part in match.groups())
            if previous.lower() != current.lower():
                return rule.template.format(subject=subject, value=current)
    return None


def explicit_change(first: str, second: str, *, relocation: bool) -> str | None:
    """Require the same subject, attribute and exact recorded source value."""
    a, b = _normalize(first), _normalize(second)
    if _QUALIFIED.search(a) or _QUALIFIED.search(b):
        return None
    for incoming, existing in [(a, b), (b, a)]:
        for rule, change_pattern, fact_pattern in _COMPILED:
            if (rule.key == "relocation") != relocation:
                continue
            change = change_pattern.fullmatch(incoming)
            fact = fact_pattern.fullmatch(existing)
            previous_change = change_pattern.fullmatch(existing)
            if not change or not (fact or previous_change):
                continue
            person, previous, current = (part.strip().lower() for part in change.groups())
            if fact:
                owner, recorded = (part.strip().lower() for part in fact.groups())
            else:
                assert previous_change is not None
                owner, _, recorded = (part.strip().lower() for part in previous_change.groups())
            if person == owner and previous == recorded and previous != current:
                return rule.reason
    return None


def browser_rules() -> dict[str, object]:
    return {"version": 1, "qualifiers": QUALIFIERS, "rules": [asdict(rule) for rule in RULES]}
