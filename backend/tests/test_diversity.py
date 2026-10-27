"""MMR diversity selection — pure, no database needed."""

from __future__ import annotations

import uuid

from app.core.diversity import mmr_select


class Item:
    def __init__(self, vector: list[float], relevance: float) -> None:
        self.embedding = vector
        self.id = uuid.uuid4()
        self.relevance = relevance


def test_diversity_zero_keeps_relevance_order():
    a = Item([1.0, 0.0], relevance=0.9)
    b = Item([0.0, 1.0], relevance=0.5)
    rows = [(a, 0.9, 0.9, 1.0), (b, 0.5, 0.5, 2.0)]
    result = mmr_select(rows, diversity=0.0, limit=2)
    assert [r[0] for r in result] == [a, b]


def test_diversity_pushes_apart_items():
    # a and b are near-identical; c is different. With diversity high, c ranks
    # second despite lower relevance because it adds new information.
    a = Item([1.0, 0.0], relevance=0.9)
    b = Item([0.99, 0.1], relevance=0.8)
    c = Item([0.0, 1.0], relevance=0.6)
    rows = [(a, 0.9, 0.9, 1.0), (b, 0.8, 0.8, 1.0), (c, 0.6, 0.6, 1.0)]

    plain = [r[0] for r in mmr_select(rows, diversity=0.0, limit=3)]
    diverse = [r[0] for r in mmr_select(rows, diversity=0.8, limit=3)]
    assert plain[0] == a
    assert diverse[1] == c, "high diversity should demote the near-duplicate"


def test_limit_truncates():
    items = [Item([float(i), 1.0], relevance=1.0 - i * 0.1) for i in range(5)]
    rows = [(item, 1.0, item.relevance, 0.0) for item in items]
    result = mmr_select(rows, diversity=0.3, limit=2)
    assert len(result) == 2


def test_items_without_embeddings_are_tolerated():
    class NoVec:
        id = uuid.uuid4()

    rows = [(NoVec(), 0.5, 0.7, 1.0)]
    result = mmr_select(rows, diversity=0.5, limit=1)
    assert len(result) == 1
