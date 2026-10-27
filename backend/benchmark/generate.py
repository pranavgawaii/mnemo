"""Synthetic benchmark dataset generator.

Produces ``dataset.json``-shaped data at any scale, deterministically from a
seed — so the benchmark can run on 10 memories for a smoke test or 500 for a
soak, always with the same labels.

    PYTHONPATH=. python benchmark/generate.py --memories 60 --queries 20 \
        --seed 7 --file benchmark/synthetic.json

Facts are generated from name/attribute pools with a seeded RNG: residences,
allergies, projects and preferences. For a subset of people an older fact is
contradicted by a newer one ("no longer lives in ..."), mirroring the kinds of
temporal drift the decay scoring is supposed to handle, and both memory ids go
into the query's gold set (either is a defensible answer, like the real
dataset's multi-gold questions).
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

PEOPLE = [
    "Riya", "Arjun", "Meera", "Kabir", "Nia", "Dev", "Tara", "Ishaan",
    "Zoya", "Rohan", "Anya", "Vikram", "Sana", "Yash", "Mira", "Omar",
]
CITIES = ["Pune", "Bengaluru", "Berlin", "Lisbon", "Toronto", "Kyoto", "Austin", "Seoul"]
ALLERGENS = ["peanuts", "lactose", "gluten", "shellfish", "soy", "eggs"]
PROJECTS = ["mnemo core", "the SDK", "the benchmark suite", "the web console", "the migrator"]
PREFERENCES = ["dark mode", "async updates", "terse replies", "voice notes", "weekly digests"]
QUERY_STYLES = [
    "Where does {person} live?",
    "Which city is {person} based in?",
    "Does {person} have any food allergies?",
    "What is {person} working on?",
    "How does {person} like to receive updates?",
]

AVERAGE_AGE_DAYS = 120.0


def generate_dataset(
    *,
    memories: int = 40,
    queries: int = 15,
    seed: int = 7,
    namespace: str = "bench-synthetic",
) -> dict:
    """Build a dataset dict with the same shape as ``benchmark/dataset.json``.

    Deterministic: identical arguments always yield identical output.
    """
    if memories < len(PEOPLE):
        raise ValueError(f"--memories must be at least {len(PEOPLE)} to cover every person")
    if queries < 1:
        raise ValueError("--queries must be at least 1")

    rng = random.Random(seed)
    rows: list[dict] = []
    gold: dict[tuple[str, str], list[str]] = {}
    counter = 0
    seen_contents: set[str] = set()

    def emit(
        content: str, *, importance: int, age_days: float, person: str, predicate: str
    ) -> bool:
        """Add a fact row; False when the content already exists (skip)."""
        nonlocal counter
        if content in seen_contents:
            return False
        seen_contents.add(content)
        counter += 1
        memory_id = f"m{counter:03d}"
        rows.append(
            {"id": memory_id, "content": content, "importance": importance, "age_days": round(age_days, 1)}
        )
        gold.setdefault((person, predicate), []).append(memory_id)
        return True

    # Cycle the people pool, emitting a fact bundle per person, until the
    # requested memory count is reached (duplicate contents are skipped).
    index = 0
    while len(rows) < memories:
        person = PEOPLE[index % len(PEOPLE)]
        index += 1
        if index > memories * 4:  # pools exhausted safety valve
            break

        # Residence, sometimes superseded by a newer "no longer" fact.
        city = rng.choice(CITIES)
        age = rng.uniform(30, 2 * AVERAGE_AGE_DAYS)
        emit(
            f"{person} lives in {city}.",
            importance=rng.choice([2, 3, 3, 4]),
            age_days=age,
            person=person,
            predicate="residence",
        )
        if rng.random() < 0.25:
            moved_to = rng.choice([c for c in CITIES if c != city])
            emit(
                f"{person} no longer lives in {city}; {person} moved to {moved_to}.",
                importance=4,
                age_days=max(1.0, age / 10.0),
                person=person,
                predicate="residence",
            )

        if rng.random() < 0.6:
            emit(
                f"{person} is allergic to {rng.choice(ALLERGENS)}.",
                importance=5,
                age_days=rng.uniform(10, AVERAGE_AGE_DAYS),
                person=person,
                predicate="allergy",
            )

        if rng.random() < 0.6:
            emit(
                f"{person} is currently working on {rng.choice(PROJECTS)}.",
                importance=3,
                age_days=rng.uniform(5, AVERAGE_AGE_DAYS),
                person=person,
                predicate="project",
            )

        if rng.random() < 0.5:
            emit(
                f"{person} prefers {rng.choice(PREFERENCES)}.",
                importance=2,
                age_days=rng.uniform(1, AVERAGE_AGE_DAYS),
                person=person,
                predicate="preference",
            )

    # Queries: one per (person, predicate) pair that actually exists, shuffled
    # deterministically, until the requested count is reached.
    query_rows: list[dict] = []
    style_by_predicate = {
        "residence": QUERY_STYLES[0:2],
        "allergy": QUERY_STYLES[2:3],
        "project": QUERY_STYLES[3:4],
        "preference": QUERY_STYLES[4:5],
    }
    candidates = list(
        dict.fromkeys(
            (person, predicate)
            for person in PEOPLE
            for predicate in style_by_predicate
            if (person, predicate) in gold
        )
    )
    rng.shuffle(candidates)

    for person, predicate in candidates[:queries]:
        template = rng.choice(style_by_predicate[predicate])
        query_rows.append(
            {"query": template.format(person=person), "gold": list(gold[(person, predicate)])}
        )

    return {
        "description": (
            f"Synthetic benchmark dataset: {len(rows)} memories, {len(query_rows)} queries, "
            f"seed={seed}."
        ),
        "namespace": namespace,
        "memories": rows,
        "queries": query_rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--memories", type=int, default=40)
    parser.add_argument("--queries", type=int, default=15)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--namespace", default="bench-synthetic")
    parser.add_argument(
        "--file", help="Write JSON here; default prints to stdout.",
    )
    args = parser.parse_args()

    dataset = generate_dataset(
        memories=args.memories,
        queries=args.queries,
        seed=args.seed,
        namespace=args.namespace,
    )
    text = json.dumps(dataset, indent=2) + "\n"
    if args.file:
        Path(args.file).write_text(text, encoding="utf-8")
        print(f"Wrote {len(dataset['memories'])} memories and {len(dataset['queries'])} queries to {args.file}.")
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
