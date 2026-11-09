"""Frozen v1 parser for a small set of single-valued English assertions.

This is a derived index, not entity resolution or general language understanding.
Qualifiers, histories, alternatives and unknown sentence forms are declined.
Migration 0015 uses this version to backfill existing rows; introduce a new
version and migration instead of changing its interpretation after release.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal

SUBJECT = r"([a-z][a-z' -]{0,59}?)"
VALUE = r"([a-z][a-z0-9&.' -]{0,99}?)"
_FLAGS = re.IGNORECASE | re.ASCII
_UNCERTAIN = re.compile(
    r"\b(if|when|might|may|maybe|could|would|will|plans?|planning|considering|"
    r"last|next|ago|before|after|yesterday|tomorrow|not|never|no|possibly|probably|"
    r"or|and|also|former|formerly|previously|was|were|used to)\b|n't\b|\bin \d{4}\b",
    _FLAGS,
)
_DIRECT = (
    ("residence", rf"^{SUBJECT} (?:lives|resides|is based) in {VALUE}(?: now)?$"),
    ("residence", rf"^{SUBJECT} (?:has )?relocated to {VALUE}(?: now)?$"),
    ("employer", rf"^{SUBJECT}'s employer is (?:now )?{VALUE}$"),
    ("employer", rf"^{SUBJECT} works at {VALUE}(?: now)?$"),
    ("favourite_cuisine", rf"^{SUBJECT}'s favou?rite cuisine is {VALUE}$"),
    ("learning", rf"^{SUBJECT} is learning {VALUE}$"),
    ("running_routine", rf"^{SUBJECT} runs {VALUE}$"),
)
_TRANSITIONS = (
    ("residence", rf"^{SUBJECT} (?:has )?moved from {VALUE} to {VALUE}$"),
    ("favourite_cuisine", rf"^{SUBJECT}'s favou?rite cuisine changed from {VALUE} to {VALUE}$"),
    ("learning", rf"^{SUBJECT} switched from learning {VALUE} to learning {VALUE}$"),
    ("running_routine", rf"^{SUBJECT} changed running routine from {VALUE} to {VALUE}$"),
)
_DIRECT_RULES = tuple((key, re.compile(pattern, _FLAGS)) for key, pattern in _DIRECT)
_TRANSITION_RULES = tuple((key, re.compile(pattern, _FLAGS)) for key, pattern in _TRANSITIONS)
_BUDGET = re.compile(
    rf"^{SUBJECT}'s monthly grocery budget is (?:now )?([0-9]{{1,12}}(?:\.[0-9]{{1,2}})?) (rupees|inr|dollars|usd)$",
    _FLAGS,
)
_START = re.compile(
    rf"^{SUBJECT} (?:now )?starts work at (\d{{1,2}})(?::(\d{{2}}))?\s*(am|pm)?$", _FLAGS
)


def normalize(value: str) -> str:
    return " ".join(value.split()).casefold()


@dataclass(frozen=True)
class Assertion:
    subject: str
    attribute: str
    value: str
    previous: str | None = None


def parse_assertion(content: str) -> Assertion | None:
    content = " ".join(content.strip().rstrip(".!").split())
    if _UNCERTAIN.search(content):
        return None
    for key, pattern in _TRANSITION_RULES:
        match = pattern.fullmatch(content)
        if match:
            subject, previous, value = map(normalize, match.groups())
            if previous == value:
                return None
            return Assertion(subject, key, value, previous)
    for key, pattern in _DIRECT_RULES:
        match = pattern.fullmatch(content)
        if match:
            subject, value = map(normalize, match.groups())
            return Assertion(subject, key, value)
    budget = _BUDGET.fullmatch(content)
    if budget:
        subject, amount, currency = budget.groups()
        unit = "inr" if currency.casefold() in {"rupees", "inr"} else "usd"
        return Assertion(
            normalize(subject), f"monthly_grocery_budget:{unit}", str(Decimal(amount).normalize())
        )
    start = _START.fullmatch(content)
    if start:
        subject, hour_text, minute_text, period = start.groups()
        hour, minute = int(hour_text), int(minute_text or 0)
        if (
            minute > 59
            or (period and not 1 <= hour <= 12)
            or (not period and (hour > 23 or minute_text is None))
        ):
            return None
        if period:
            hour = hour % 12 + (12 if period.casefold() == "pm" else 0)
        return Assertion(normalize(subject), "work_start_time", str(hour * 60 + minute))
    return None


def assertion_conflict(first: str, second: str) -> bool:
    """Only compare equal identities/attributes; transitions must match source."""
    a, b = parse_assertion(first), parse_assertion(second)
    if (
        a is None
        or b is None
        or (a.subject, a.attribute) != (b.subject, b.attribute)
        or a.value == b.value
    ):
        return False
    # Learning goals and running routines can coexist. Only an explicit
    # from/to transition makes those attributes mutually exclusive here.
    if a.attribute in {"learning", "running_routine"} and a.previous is None:
        return False
    # The first argument is incoming. An explicit from/to transition must
    # match the recorded current source; a fresh direct assertion need not
    # repeat that source. Do not infer chronology by reversing the arguments.
    return a.previous == b.value if a.previous is not None else True
