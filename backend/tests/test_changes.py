"""Source-preserving current views and the generated browser rule contract."""

import json
from pathlib import Path

import pytest

from app.core.changes import browser_rules, current_statement

FIXTURES = Path(__file__).parent / "fixtures/current_statement_cases.json"
CASES = json.loads(FIXTURES.read_text())


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["name"])
def test_current_statement_preserves_source_and_uncertainty(case):
    original = case["content"]
    assert current_statement(original) == case["expected"]
    assert original == case["content"]


def test_browser_rules_are_generated_from_python():
    target = Path(__file__).parents[2] / "frontend/src/lib/memory/generated/change-rules.json"
    assert json.loads(target.read_text()) == browser_rules()
