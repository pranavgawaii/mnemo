"""Synthetic dataset generator - deterministic, hermetic."""

from __future__ import annotations

import pytest

from benchmark.generate import generate_dataset


def test_output_shape_matches_real_dataset():
    dataset = generate_dataset(memories=40, queries=12, seed=7)
    assert set(dataset) == {"description", "namespace", "memories", "queries"}
    assert len(dataset["memories"]) >= 40
    for row in dataset["memories"]:
        assert set(row) == {"id", "content", "importance", "age_days"}
        assert isinstance(row["importance"], int)
        assert 0.0 < row["age_days"] <= 300.0
    for query in dataset["queries"]:
        assert query["gold"], "every query needs gold memories"
        assert set(query["gold"]).issubset({row["id"] for row in dataset["memories"]})


def test_deterministic_given_same_seed():
    first = generate_dataset(memories=40, queries=10, seed=7)
    second = generate_dataset(memories=40, queries=10, seed=7)
    assert first == second


def test_different_seed_changes_content():
    first = generate_dataset(memories=40, queries=10, seed=1)
    second = generate_dataset(memories=40, queries=10, seed=2)
    assert first["memories"] != second["memories"]


def test_ids_are_unique_and_sequential():
    dataset = generate_dataset(memories=60, queries=10, seed=3)
    ids = [row["id"] for row in dataset["memories"]]
    assert len(ids) == len(set(ids))
    assert ids[0] == "m001"


def test_contradiction_pairs_share_gold():
    dataset = generate_dataset(memories=64, queries=20, seed=11)
    # At least one query should exercise a superseded fact (multi-gold).
    multi_gold = [q for q in dataset["queries"] if len(q["gold"]) > 1]
    assert multi_gold, "seed 11 should produce at least one contradiction pair"


def test_too_few_memories_rejected():
    with pytest.raises(ValueError, match="at least 16"):
        generate_dataset(memories=4)
    with pytest.raises(ValueError, match="at least 1"):
        generate_dataset(queries=0)


def test_scale_up_uses_repeated_people():
    dataset = generate_dataset(memories=200, queries=25, seed=5)
    assert len(dataset["memories"]) >= 200
    # Names repeat beyond the pool size, but facts stay distinct rows.
    contents = [row["content"] for row in dataset["memories"]]
    assert len(contents) == len(set(contents))
