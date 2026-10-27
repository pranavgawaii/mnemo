"""Retrieval benchmark for Mnemo.

Seeds a dedicated namespace with the memories in ``dataset.json`` (backdating
``created_at`` so the decay ranking is genuinely exercised), runs every labelled
query through the real search path in ``app.services.memory_service``, and
reports top-1 / top-k accuracy, MRR, NDCG@k, and search latency percentiles.

A query counts as correct at rank *k* if **any** of its gold memory ids appears
in the top *k* results — several questions have more than one defensible answer
(e.g. "any food allergies?" matches both the peanut and lactose memories).

Usage::

    export DATABASE_URL=postgresql+psycopg://mnemo:mnemo@localhost:5432/mnemo
    PYTHONPATH=. python benchmark/run.py [--decay/--no-decay] [--json]

``--no-decay`` re-ranks by raw cosine similarity only, so the contribution of
the decay/importance scoring can be measured rather than asserted.
``--json`` prints the score dict (consumed by ``benchmark/gate.py``).
"""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import delete, text

from app.core.embedding import embed
from app.db.session import SessionLocal
from app.models.models import Contradiction, Memory
from app.services import memory_service
from benchmark.metrics import mrr, ndcg_at_k, percentile, top1_accuracy, topk_accuracy

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


def all_gold_ranks(hits, gold_uuids: set[str], k: int) -> list[int]:
    """Ranks (1-indexed) of every gold hit inside the top ``k`` window."""
    return [
        i
        for i, (memory, *_rest) in enumerate(hits, start=1)
        if i <= k and str(memory.id) in gold_uuids
    ]


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


def run_benchmark(db, data: dict, *, k: int = 3, no_decay: bool = False) -> dict:
    """Seed and evaluate. Returns the machine-readable score dict."""
    namespace = data["namespace"]
    id_map = seed(db, data)
    searcher = search_no_decay if no_decay else memory_service.search

    first_ranks: list[int | None] = []
    graded_ranks: list[list[int]] = []
    latencies_ms: list[float] = []
    misses: list[tuple[str, list[str]]] = []

    for q in data["queries"]:
        gold_uuids = {id_map[g] for g in q["gold"]}
        start = time.perf_counter()
        hits = searcher(db, query=q["query"], namespace=namespace, limit=10)
        latencies_ms.append((time.perf_counter() - start) * 1000)

        rank = rank_of_gold(hits, gold_uuids)
        first_ranks.append(rank)
        graded = all_gold_ranks(hits, gold_uuids, k)
        graded_ranks.append(graded)

        if rank is None or rank > k:
            misses.append((q["query"], [m.content for m, *_ in hits[:k]]))

    n = len(data["queries"])
    return {
        "queries": n,
        "memories": len(data["memories"]),
        "k": k,
        "top1_accuracy": top1_accuracy(first_ranks),
        "topk_accuracy": topk_accuracy(first_ranks, k),
        "mrr": mrr(first_ranks),
        "ndcg_at_k": ndcg_at_k(graded_ranks, k),
        "latency_p50_ms": percentile(latencies_ms, 0.50),
        "latency_p95_ms": percentile(latencies_ms, 0.95),
        "_latency_mean_ms": sum(latencies_ms) / len(latencies_ms) if latencies_ms else 0.0,
        "misses": misses,
    }


def format_report(scores: dict, *, no_decay: bool) -> str:
    """Human-readable benchmark report."""
    n = scores["queries"]
    mode = "raw cosine (no decay)" if no_decay else "similarity x decay x importance"
    k = scores["k"]
    lines = [
        "=" * 66,
        f"Mnemo retrieval benchmark — {n} queries, {scores['memories']} memories",
        f"Ranking: {mode}",
        "=" * 66,
        f"  Top-1 accuracy : {scores['top1_accuracy'] * 100:5.1f}%",
        f"  Top-{k} accuracy : {scores['topk_accuracy'] * 100:5.1f}%",
        f"  MRR            : {scores['mrr']:.3f}",
        f"  NDCG@{k}         : {scores['ndcg_at_k']:.3f}",
        f"  Search latency : p50 {scores['latency_p50_ms']:.1f} ms"
        f"  p95 {scores['latency_p95_ms']:.1f} ms"
        f"  mean {scores['_latency_mean_ms']:.1f} ms",
        "=" * 66,
    ]
    for query, tops in scores["misses"]:
        lines.append(f"\n  ? {query}")
        for t in tops:
            lines.append(f"      -> {t}")
    return "\n".join(lines)


def public_scores(scores: dict) -> dict:
    """Strip the report-only keys (misses, internals) for --json output."""
    return {key: value for key, value in scores.items() if not key.startswith("_") and key != "misses"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--no-decay",
        action="store_true",
        help="Rank by raw cosine similarity only (baseline comparison).",
    )
    parser.add_argument("--k", type=int, default=3, help="Top-k cutoff (default 3).")
    parser.add_argument(
        "--json", action="store_true", help="Print machine-readable scores only."
    )
    args = parser.parse_args()

    data = json.loads(DATASET.read_text())

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        print(f"Seeding {len(data['memories'])} memories into namespace "
              f"'{data['namespace']}' (embedding model load may take a moment)...")
        scores = run_benchmark(db, data, k=args.k, no_decay=args.no_decay)
    finally:
        db.close()

    if args.json:
        print(json.dumps(public_scores(scores), indent=2))
    else:
        print()
        print(format_report(scores, no_decay=args.no_decay))


if __name__ == "__main__":
    main()
