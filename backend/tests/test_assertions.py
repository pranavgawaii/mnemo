"""Supported fact differences and hard negatives, without embeddings or a DB."""

import pytest

from app.core.assertions_v1 import assertion_conflict, parse_assertion
from app.core.contradiction import check_contradiction


@pytest.mark.parametrize(
    "old,new",
    [
        ("Nora lives in Lisbon", "Nora lives in Porto now"),
        ("Owen resides in Bristol", "Owen has relocated to York"),
        ("Nora's employer is Atlas", "Nora's employer is now Beacon"),
        ("Nora works at Atlas", "Nora works at Beacon now"),
        (
            "Owen's monthly grocery budget is 3000 rupees",
            "Owen's monthly grocery budget is now 4500 INR",
        ),
        ("Nora starts work at 9 AM", "Nora now starts work at 10 AM"),
        ("Nora starts work at 09:30", "Nora starts work at 10:30 AM"),
        ("Nora moved from Madrid to Lisbon", "Nora lives in Porto now"),
    ],
)
def test_confirmed_same_attribute_changes_flag_even_below_vector_gate(old, new):
    assert check_contradiction(new, old, 0.2).is_contradiction
    assert assertion_conflict(new, old)


@pytest.mark.parametrize(
    "old,new",
    [
        ("Nora lives in Lisbon", "Owen lives in Porto now"),
        ("Nora lives in Lisbon", "Nora's employer is Beacon"),
        ("Nora lives in Lisbon", "Nora might relocate to Porto"),
        ("Nora lives in Lisbon", "Nora plans to live in Porto"),
        ("Nora lives in Lisbon", "Nora lived in Porto in 2020"),
        ("Nora lives in Lisbon", "Nora lives in Porto or Madrid"),
        ("Nora lives in Lisbon", "Nora lives in Porto and Madrid"),
        ("Nora lives in Lisbon", "Nora moved from Paris to Porto"),
        ("Nora's employer is Atlas", "Nora also works at Beacon"),
        ("Nora starts work at 9 AM", "Nora starts work at 09:00"),
        ("Nora starts work at 12 PM", "Nora starts work at 12:00"),
        ("Nora starts work at 12 AM", "Nora starts work at 00:00"),
        (
            "Nora's monthly grocery budget is 3000 rupees",
            "Nora's monthly grocery budget is 3000.00 INR",
        ),
        (
            "Nora's monthly grocery budget is 3000 rupees",
            "Nora's monthly grocery budget is 4000 USD",
        ),
        ("Nora's favourite cuisine is Thai", "Nora also likes Japanese food"),
        ("Nora lives in Lisbon", "Nora lives in lisbon now"),
        ("Nora is learning Rust", "Nora is learning Go"),
        ("Nora runs 4 kilometres on Mondays", "Nora runs 6 kilometres on Fridays"),
    ],
)
def test_identity_units_equivalence_uncertainty_and_source_guards(old, new):
    assert not assertion_conflict(new, old)
    assert not check_contradiction(new, old, 0.2).is_contradiction


@pytest.mark.parametrize(
    "text",
    [
        "Nora starts work at 25:00",
        "Nora starts work at 12:90",
        "Nora starts work at 0 AM",
        "Nora starts work at 9",
        "Nora's employer was Atlas",
        "Nora will relocate to Porto",
        "Nora's monthly grocery budget is -10 rupees",
        "The answer is complicated",
    ],
)
def test_unknown_or_invalid_forms_decline_extraction(text):
    assert parse_assertion(text) is None
