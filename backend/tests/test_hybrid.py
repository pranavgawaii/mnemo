"""Hybrid search fusion — pure, no database needed."""

from __future__ import annotations

import uuid

from app.core.hybrid import apply_keyword_boost, normalize_ranks


class FakeMemory:
    def __init__(self, memory_id: str) -> None:
        self.id = uuid.UUID(memory_id)


def _fake(mem_id: str) -> FakeMemory:
    return FakeMemory(mem_id)


def test_normalize_ranks_scales_to_one():
    a, b = uuid.uuid4(), uuid.uuid4()
    ranks = {a: 0.4, b: 0.2}
    assert normalize_ranks(ranks) == {a: 1.0, b: 0.5}


def test_normalize_ranks_empty_and_single():
    assert normalize_ranks({}) == {}
    single = {uuid.uuid4(): 0.123}
    assert normalize_ranks(single) == {next(iter(single)): 1.0}


def test_normalize_ranks_zero_best():
    a = uuid.uuid4()
    assert normalize_ranks({a: 0.0}) == {a: 0.0}


def test_boost_multiplies_relevance():
    ids = ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"]
    scored = [(_fake(ids[0]), 0.9, 0.8, 1.0), (_fake(ids[1]), 0.5, 0.5, 2.0)]
    boosted = apply_keyword_boost(scored, {uuid.UUID(ids[0]): 1.0}, 0.25)
    assert boosted[0][2] == 0.8 * 1.25
    assert boosted[1][2] == 0.5  # no keyword evidence: unchanged


def test_boost_disabled_with_zero_weight():
    ids = ["11111111-1111-1111-1111-111111111111"]
    scored = [(_fake(ids[0]), 0.9, 0.8, 1.0)]
    assert apply_keyword_boost(scored, {uuid.UUID(ids[0]): 1.0}, 0.0) == scored


def test_boost_preserves_similarity_and_age():
    ids = ["11111111-1111-1111-1111-111111111111"]
    scored = [(_fake(ids[0]), 0.9, 0.8, 3.5)]
    boosted = apply_keyword_boost(scored, {uuid.UUID(ids[0]): 0.5}, 0.4)
    assert boosted[0][0].id == uuid.UUID(ids[0])
    assert boosted[0][1] == 0.9
    assert boosted[0][3] == 3.5
    assert boosted[0][2] == 0.8 * 1.2
