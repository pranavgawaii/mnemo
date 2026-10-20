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
import sys
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
    return MemoryExport.model_validate_json(Path(path).read_text(encoding="utf-8"))


def _write_export(path: str, payload: MemoryExport) -> None:
    Path(path).write_text(
        payload.model_dump_json(indent=2) + "\n", encoding="utf-8"
    )


def _export(args: argparse.Namespace) -> int:
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
        _write_export(args.file, payload)
    finally:
        db.close()

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
        payload = NamespaceStats(
            namespace=args.namespace,
            **memory_service.namespace_stats(db, namespace=args.namespace),
        )
    finally:
        db.close()

    print(payload.model_dump_json(indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mnemo",
        description="Export, import and inspect Mnemo namespaces.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    export_parser = subparsers.add_parser(
        "export", help="Write a namespace snapshot as JSON."
    )
    export_parser.add_argument("--namespace", default="default")
    export_parser.add_argument("--file", required=True, help="Destination JSON file.")
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
