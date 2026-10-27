"""Namespace administration CLI.

The REST API is the normal interface. This command is for operators who need a
portable snapshot, a restore into a fresh namespace, or a quick health summary
without going through HTTP.

Examples::

    PYTHONPATH=. python -m app.cli export --namespace default --file backup.json
    PYTHONPATH=. python -m app.cli import --file backup.json --namespace restored
    PYTHONPATH=. python -m app.cli stats --namespace default
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.db.session import SessionLocal
from app.models.schemas import (
    ContradictionExportItem,
    MemoryExport,
    MemoryExportItem,
    NamespaceStats,
)
from app.services import memory_service


def _read_export(path: str) -> MemoryExport:
    source = Path(path)
    if source.suffix.lower() in {".jsonl", ".ndjson"}:
        from app.services.export_formats import from_jsonl

        memories, contradictions = from_jsonl(source.read_text(encoding="utf-8"))
        return MemoryExport(
            namespace="",
            exported_at=datetime.now(timezone.utc),
            memories=memories,
            contradictions=contradictions,
        )
    if source.suffix.lower() == ".csv":
        raise ValueError("csv export is one-way; import needs a .json or .jsonl snapshot")
    return MemoryExport.model_validate_json(source.read_text(encoding="utf-8"))


def _write_export(path: str, payload: MemoryExport) -> None:
    Path(path).write_text(
        payload.model_dump_json(indent=2) + "\n", encoding="utf-8"
    )


def _export(args: argparse.Namespace) -> int:
    fmt = args.format
    db = SessionLocal()
    try:
        memories, contradictions = memory_service.export_namespace(
            db, namespace=args.namespace
        )
        payload = MemoryExport(
            namespace=args.namespace,
            exported_at=datetime.now(timezone.utc),
            memories=[MemoryExportItem.model_validate(memory) for memory in memories],
            contradictions=[
                ContradictionExportItem.model_validate(contradiction)
                for contradiction in contradictions
            ],
        )
    finally:
        db.close()

    if fmt == "jsonl":
        from app.services.export_formats import to_jsonl

        Path(args.file).write_text(
            to_jsonl(payload.memories, payload.contradictions), encoding="utf-8"
        )
    elif fmt == "csv":
        from app.services.export_formats import (
            contradictions_csv_text,
            memories_csv_text,
        )

        stem = Path(args.file).with_suffix("")
        memories_path = Path(f"{stem}.memories.csv")
        contradictions_path = Path(f"{stem}.contradictions.csv")
        memories_path.write_text(memories_csv_text(payload.memories), encoding="utf-8")
        contradictions_path.write_text(
            contradictions_csv_text(payload.contradictions), encoding="utf-8"
        )
        print(
            f"Exported {len(payload.memories)} memories to {memories_path} and "
            f"{len(payload.contradictions)} contradictions to {contradictions_path} "
            f"(csv is one-way)."
        )
        return 0
    else:
        _write_export(args.file, payload)

    print(
        f"Exported {len(payload.memories)} memories and "
        f"{len(payload.contradictions)} contradictions from '{args.namespace}' "
        f"to {args.file}."
    )
    return 0


def _import(args: argparse.Namespace) -> int:
    payload = _read_export(args.file)
    namespace = args.namespace or payload.namespace

    db = SessionLocal()
    try:
        memories, contradictions = memory_service.import_namespace(
            db,
            namespace=namespace,
            payload=payload,
            preserve_ids=args.preserve_ids,
        )
    finally:
        db.close()

    print(
        f"Imported {memories} memories and {contradictions} contradictions "
        f"into '{namespace}'."
    )
    return 0


def _stats(args: argparse.Namespace) -> int:
    db = SessionLocal()
    try:
        payload = NamespaceStats.model_validate(
            {"namespace": args.namespace, **memory_service.namespace_stats(db, namespace=args.namespace)}
        )
    finally:
        db.close()

    print(payload.model_dump_json(indent=2))
    return 0


def _sweep_expired(args: argparse.Namespace) -> int:
    db = SessionLocal()
    try:
        expired = memory_service.sweep_expired(db)
    finally:
        db.close()
    print(f"Soft-deleted {expired} expired memories.")
    return 0


def _jobs(args: argparse.Namespace) -> int:
    from app.services import job_service

    if args.jobs_command == "run":
        db = SessionLocal()
        try:
            outcome = job_service.process_next(db)
        finally:
            db.close()
        print(outcome or "nothing runnable")
        return 0

    db = SessionLocal()
    try:
        counts = job_service.stats(db)
    finally:
        db.close()
    print(json.dumps(counts, indent=2, sort_keys=True))
    return 0


# --------------------------------------------------------------------------- #
# keys
# --------------------------------------------------------------------------- #
def _keys(args: argparse.Namespace) -> int:
    from app.services import api_key_service

    db = SessionLocal()
    try:
        if args.keys_command == "create":
            row, plaintext = api_key_service.create_api_key(
                db,
                label=args.label,
                scopes=[scope for scope in args.scopes.split(",") if scope],
                rate_limit_per_minute=args.rate_limit_per_minute,
            )
            print(f"key:      {plaintext}")
            print("          (shown once - store it now)")
            print(f"id:       {row.id}")
            print(f"scopes:   {','.join(row.scopes)}")
            return 0

        if args.keys_command == "list":
            for row in api_key_service.list_api_keys(db):
                status = "active" if row.is_active else "revoked"
                scopes = ",".join(row.scopes)
                limit = row.rate_limit_per_minute or "-"
                print(f"{row.id}  {status:7}  [{scopes}]  rpm={limit}  {row.label}")
            return 0

        if args.keys_command == "rotate":
            outcome = api_key_service.rotate_api_key(db, key_id=uuid.UUID(args.id))
            if outcome is None:
                print(f"error: key {args.id} not found", file=sys.stderr)
                return 1
            row, plaintext = outcome
            print(f"key:      {plaintext}")
            print("          (shown once - store it now)")
            print(f"id:       {row.id}")
            return 0

        if args.keys_command == "revoke":
            revoked = api_key_service.deactivate_api_key(db, key_id=uuid.UUID(args.id))
            if revoked is None:
                print(f"error: key {args.id} not found", file=sys.stderr)
                return 1
            print(f"revoked {revoked.id}")
            return 0
    finally:
        db.close()

    print(f"error: unknown keys command {args.keys_command!r}", file=sys.stderr)
    return 1


# --------------------------------------------------------------------------- #
# bench
# --------------------------------------------------------------------------- #
def _bench(args: argparse.Namespace) -> int:
    """Quick latency probe: N writes then M searches, with percentiles."""
    import statistics
    import time


    db = SessionLocal()
    try:
        write_latencies: list[float] = []
        for index in range(args.writes):
            content = f"Bench fact {index}: the quick fox jumps over log {index}"
            start = time.perf_counter()
            memory_service.add_memory(
                db, content=content, namespace=args.namespace, importance=3
            )
            write_latencies.append((time.perf_counter() - start) * 1000)

        search_latencies: list[float] = []
        hits_seen = 0
        for index in range(args.searches):
            query = f"the quick fox log {index}"
            start = time.perf_counter()
            results = memory_service.search(
                db,
                query=query,
                namespace=args.namespace,
                limit=args.limit,
            )
            search_latencies.append((time.perf_counter() - start) * 1000)
            hits_seen += len(results)
    finally:
        db.close()

    def percentile(values: list[float], fraction: float) -> float:
        if not values:
            return 0.0
        ordered = sorted(values)
        rank = min(len(ordered) - 1, int(round(fraction * (len(ordered) - 1))))
        return ordered[rank]

    print(f"writes: {args.writes}  searches: {args.searches}  hits: {hits_seen}")
    print(f"write  p50 {percentile(write_latencies, 0.5):7.1f} ms  p95 {percentile(write_latencies, 0.95):7.1f} ms")
    print(f"search p50 {percentile(search_latencies, 0.5):7.1f} ms  p95 {percentile(search_latencies, 0.95):7.1f} ms")
    if write_latencies:
        print(f"write  mean {statistics.fmean(write_latencies):7.1f} ms")
    if search_latencies:
        print(f"search mean {statistics.fmean(search_latencies):7.1f} ms")
    return 0


# --------------------------------------------------------------------------- #
# doctor
# --------------------------------------------------------------------------- #
def _doctor(args: argparse.Namespace) -> int:  # noqa: C901
    """Health checks: database, schema, embeddings, jobs, settings."""
    from sqlalchemy import text as sql_text

    from app.core.config import settings

    failures: list[str] = []

    def report(name: str, ok: bool, detail: str = "") -> None:
        marker = "ok  " if ok else "FAIL"
        print(f"[{marker}] {name}" + (f" - {detail}" if detail else ""))
        if not ok:
            failures.append(name)

    # 1. Database connectivity.
    try:
        with SessionLocal() as db:
            db.execute(sql_text("SELECT 1"))
        report("database connection", True)
    except Exception as exc:
        report("database connection", False, str(exc)[:120])
        print("doctor: cannot continue without a database")
        return 1

    # 2. Schema + migration revision vs alembic head.
    try:
        from alembic.config import Config
        from alembic.runtime.migration import MigrationContext
        from alembic.script import ScriptDirectory

        from app.db.session import engine

        config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        head = ScriptDirectory.from_config(config).get_current_head()
        with engine.connect() as connection:
            current = MigrationContext.configure(connection).get_current_revision()
        report(
            "migrations at head",
            current == head,
            f"db={current or 'none'} head={head}",
        )
    except Exception as exc:
        report("migrations at head", False, str(exc)[:120])

    # 3. Embedding model loads and returns a sane vector.
    try:
        from app.core.embedding import embed

        vector = embed("doctor ping")
        report("embedding model", len(vector) > 0, f"dim={len(vector)}")
    except Exception as exc:
        report("embedding model", False, str(exc)[:120])

    # 4. Job outbox backlog.
    try:
        from app.services import job_service  # noqa: F401 - registers handlers

        with SessionLocal() as db:
            counts = job_service.stats(db)
        backlog = counts.get("pending", 0) + counts.get("running", 0)
        report("job outbox", True, f"pending={counts.get('pending', 0)} failed={counts.get('failed', 0)}")
        if backlog > 100:
            print("      (warn: large backlog - check the worker is running)")
    except Exception as exc:
        report("job outbox", False, str(exc)[:120])

    # 5. Settings sanity.
    report(
        "bootstrap api key set",
        bool(settings.mnemo_api_key),
        "MNEMO_API_KEY" if settings.mnemo_api_key else "MNEMO_API_KEY is empty - the API accepts no requests",
    )
    dedup_ok = settings.dedup_mode in {"flag", "reject", "off"}
    report("dedup mode valid", dedup_ok, settings.dedup_mode)
    report("job worker enabled", settings.job_worker_enabled, "set JOB_WORKER_ENABLED=true or cron 'mnemo jobs run'")

    if failures:
        print(f"doctor: {len(failures)} check(s) failed")
        return 1
    print("doctor: all checks passed")
    return 0


# --------------------------------------------------------------------------- #
# dump
# --------------------------------------------------------------------------- #
def _dump(args: argparse.Namespace) -> int:
    """Snapshot every namespace into one file (JSON, per-namespace sections)."""
    from sqlalchemy import select

    from app.models.models import Memory

    db = SessionLocal()
    try:
        namespaces = [
            row[0]
            for row in db.execute(select(Memory.namespace).distinct().order_by(Memory.namespace)).all()
        ]
        sections = []
        total_memories = 0
        total_contradictions = 0
        for namespace in namespaces:
            memories, contradictions = memory_service.export_namespace(db, namespace=namespace)
            total_memories += len(memories)
            total_contradictions += len(contradictions)
            sections.append(
                {
                    "namespace": namespace,
                    "memories": [MemoryExportItem.model_validate(m).model_dump(mode="json") for m in memories],
                    "contradictions": [
                        ContradictionExportItem.model_validate(c).model_dump(mode="json")
                        for c in contradictions
                    ],
                }
            )
    finally:
        db.close()

    payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "namespaces": sections,
    }
    Path(args.file).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"Dumped {total_memories} memories and {total_contradictions} contradictions "
        f"across {len(sections)} namespace(s) to {args.file}."
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mnemo",
        description="Export, import and inspect Mnemo namespaces.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    export_parser = subparsers.add_parser(
        "export", help="Write a namespace snapshot as JSON, JSONL or CSV."
    )
    export_parser.add_argument("--namespace", default="default")
    export_parser.add_argument("--file", required=True, help="Destination file.")
    export_parser.add_argument(
        "--format",
        choices=("json", "jsonl", "csv"),
        default="json",
        help="json round-trips via import; jsonl round-trips; csv is one-way.",
    )
    export_parser.set_defaults(handler=_export)

    import_parser = subparsers.add_parser(
        "import", help="Restore a snapshot into an empty namespace."
    )
    import_parser.add_argument("--file", required=True, help="Snapshot JSON file.")
    import_parser.add_argument(
        "--namespace",
        help="Restore into this namespace instead of the one recorded in the file.",
    )
    import_parser.add_argument(
        "--preserve-ids",
        action="store_true",
        help="Keep exported UUIDs. Use only when restoring into an empty database.",
    )
    import_parser.set_defaults(handler=_import)

    stats_parser = subparsers.add_parser(
        "stats", help="Print aggregate counts for a namespace."
    )
    stats_parser.add_argument("--namespace", default="default")
    stats_parser.set_defaults(handler=_stats)

    sweep_parser = subparsers.add_parser(
        "sweep-expired",
        help="Soft-delete every memory whose expires_at has passed. Cron this.",
    )
    sweep_parser.set_defaults(handler=_sweep_expired)

    jobs_parser = subparsers.add_parser(
        "jobs", help="Inspect or run the background job outbox."
    )
    jobs_sub = jobs_parser.add_subparsers(dest="jobs_command", required=True)
    jobs_sub.add_parser("run", help="Claim and process one runnable job.")
    jobs_sub.add_parser("stats", help="Print job counts by status.")
    jobs_parser.set_defaults(handler=_jobs, jobs_command="stats")

    keys_parser = subparsers.add_parser("keys", help="Manage API keys (admin).")
    keys_sub = keys_parser.add_subparsers(dest="keys_command", required=True)
    keys_create = keys_sub.add_parser("create", help="Create a key; the secret is shown once.")
    keys_create.add_argument("--label", default="unnamed")
    keys_create.add_argument("--scopes", default="read", help="Comma-separated: read,write,admin.")
    keys_create.add_argument("--rate-limit-per-minute", type=int, default=None)
    keys_sub.add_parser("list", help="List keys (prefixes only, never secrets).")
    keys_rotate = keys_sub.add_parser("rotate", help="Replace a key's secret.")
    keys_rotate.add_argument("--id", required=True)
    keys_revoke = keys_sub.add_parser("revoke", help="Deactivate a key immediately.")
    keys_revoke.add_argument("--id", required=True)
    keys_parser.set_defaults(handler=_keys, keys_command="list")

    bench_parser = subparsers.add_parser("bench", help="Quick write/search latency probe.")
    bench_parser.add_argument("--namespace", default="default")
    bench_parser.add_argument("--writes", type=int, default=10)
    bench_parser.add_argument("--searches", type=int, default=10)
    bench_parser.add_argument("--limit", type=int, default=5)
    bench_parser.set_defaults(handler=_bench)

    doctor_parser = subparsers.add_parser("doctor", help="Check database, migrations, embeddings, jobs.")
    doctor_parser.set_defaults(handler=_doctor)

    dump_parser = subparsers.add_parser(
        "dump", help="Snapshot every namespace into one JSON file."
    )
    dump_parser.add_argument("--file", required=True, help="Destination JSON file.")
    dump_parser.set_defaults(handler=_dump)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        return int(args.handler(args))
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
