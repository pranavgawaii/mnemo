"""Retrieval benchmark for Mnemo.

Seeds a dedicated namespace with the memories in ``dataset.json`` (backdating
``created_at`` so the decay ranking is genuinely exercised), runs every labelled
query through the real search path in ``app.services.memory_service``, and
reports top-1 / top-3 accuracy and MRR.

A query counts as correct at rank *k* if **any** of its gold memory ids appears
in the top *k* results — several questions have more than one defensible answer
(e.g. "any food allergies?" matches both the peanut and lactose memories).

Usage::

    export DATABASE_URL=postgresql+psycopg://mnemo:mnemo@localhost:5432/mnemo
    PYTHONPATH=. python benchmark/run.py [--decay/--no-decay]

``--no-decay`` re-ranks by raw cosine similarity only, so the contribution of
the decay/importance scoring can be measured rather than asserted.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import delete, text

from app.core.embedding import embed
from app.db.session import SessionLocal
from app.models.models import Contradiction, Memory
from app.services import memory_service

DATASET = Path(__file__).with_name("dataset.json")


def seed(db, data: dict) -> dict[str, str]:
    """Wipe the benchmark namespace and insert the dataset. Returns id->uuid map."""
    namespace = data["namespace"]

    # Contradictions reference memories, so clear them first.
    db.execute(
        delete(Contradiction).where(Contradiction.namespace == namespace)
    )
    db.execute(delete(Memory).where(Memory.namespace == namespace))
    db.commit()

    now = datetime.now(timezone.utc)
    id_map: dict[str, str] = {}

    for row in data["memories"]:
        created = now - timedelta(days=float(row["age_days"]))
        memory = Memory(
            namespace=namespace,
            content=row["content"],
            importance=int(row["importance"]),
            embedding=embed(row["content"]),
            is_active=True,
            created_at=created,
            updated_at=created,
        )
        db.add(memory)
        db.flush()
        id_map[row["id"]] = str(memory.id)

    db.commit()
    return id_map


def rank_of_gold(hits, gold_uuids: set[str]) -> int | None:
    """1-indexed rank of the first gold memory in ``hits``, or None if absent."""
    for i, (memory, *_rest) in enumerate(hits, start=1):
        if str(memory.id) in gold_uuids:
            return i
    return None


def search_no_decay(db, *, query: str, namespace: str, limit: int):
    """Baseline: rank by raw cosine similarity, ignoring decay and importance."""
    vector = embed(query)
    distance = Memory.embedding.cosine_distance(vector)
    from sqlalchemy import select

    stmt = (
        select(Memory, distance.label("distance"))
        .where(Memory.namespace == namespace, Memory.is_active.is_(True))
        .order_by(distance)
        .limit(limit)
    )
    return [
        (memory, 1.0 - float(dist), 1.0 - float(dist), 0.0)
        for memory, dist in db.execute(stmt).all()
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--no-decay",
        action="store_true",
        help="Rank by raw cosine similarity only (baseline comparison).",
    )
    parser.add_argument("--k", type=int, default=3, help="Top-k cutoff (default 3).")
    parser.add_argument(
        "--verbose", action="store_true", help="Print every miss with its top hits."
    )
    args = parser.parse_args()

    data = json.loads(DATASET.read_text())
    namespace = data["namespace"]

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        print(f"Seeding {len(data['memories'])} memories into namespace "
              f"'{namespace}' (embedding model load may take a moment)...")
        id_map = seed(db, data)

        queries = data["queries"]
        top1 = 0
        topk = 0
        reciprocal_sum = 0.0
        misses: list[tuple[str, list[str]]] = []

        searcher = search_no_decay if args.no_decay else memory_service.search

        for q in queries:
            gold_uuids = {id_map[g] for g in q["gold"]}
            hits = searcher(db, query=q["query"], namespace=namespace, limit=10)
            rank = rank_of_gold(hits, gold_uuids)

            if rank == 1:
                top1 += 1
            if rank is not None and rank <= args.k:
                topk += 1
            else:
                misses.append(
                    (q["query"], [m.content for m, *_ in hits[: args.k]])
                )
            if rank is not None:
                reciprocal_sum += 1.0 / rank

        n = len(queries)
        mode = "raw cosine (no decay)" if args.no_decay else "similarity x decay x importance"
        print()
        print("=" * 66)
        print(f"Mnemo retrieval benchmark — {n} queries, {len(data['memories'])} memories")
        print(f"Ranking: {mode}")
        print("=" * 66)
        print(f"  Top-1 accuracy : {top1}/{n}  ({100.0 * top1 / n:.1f}%)")
        print(f"  Top-{args.k} accuracy : {topk}/{n}  ({100.0 * topk / n:.1f}%)")
        print(f"  MRR            : {reciprocal_sum / n:.3f}")
        print("=" * 66)

        if misses:
            print(f"\n{len(misses)} miss(es) outside top-{args.k}:")
            for query, tops in misses:
                print(f"\n  ? {query}")
                if args.verbose:
                    for t in tops:
                        print(f"      -> {t}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
