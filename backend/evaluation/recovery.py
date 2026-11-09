"""Local PostgreSQL dump/restore drill in two newly created disposable databases.

Requires pg_dump/pg_restore matching the server major, CREATEDB permission,
pgvector and API dependencies. DATABASE_URL selects a local server, never a
source application database. Only fresh mnemo_test_recovery_* databases are
seeded, dumped, restored and dropped. Private dump files are removed afterwards.
This is a synthetic recovery drill, not a backup of a user's production data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

TABLES = (
    "memories",
    "contradictions",
    "audit_log",
    "jobs",
    "api_keys",
    "namespaces",
    "webhooks",
    "rate_limit_counters",
)
BACKEND = Path(__file__).parents[1]


def local_url(value: str) -> URL:
    url = make_url(value)
    if url.drivername not in {"postgresql", "postgresql+psycopg"}:
        raise ValueError("A PostgreSQL URL is required.")
    if set(url.query) - {"host", "port"}:
        raise ValueError("Only local host and port query parameters are accepted.")
    host = url.query.get("host", url.host or "localhost")
    if not isinstance(host, str) or not (
        host in {"localhost", "127.0.0.1", "::1"} or host.startswith("/")
    ):
        raise ValueError("Recovery drills are limited to a local PostgreSQL server.")
    return url.set(drivername="postgresql+psycopg")


def pg_environment(url: URL) -> dict[str, str]:
    # Do not put connection strings or passwords in command arguments or reports.
    env = {key: value for key, value in os.environ.items() if not key.startswith("PG")}
    env.update(
        {
            "PGDATABASE": url.database or "",
            "PGHOST": str(url.query.get("host", url.host or "localhost")),
            "PGPORT": str(url.port or url.query.get("port", 5432)),
            "PGUSER": url.username or "",
            "PGPASSWORD": url.password or "",
            "PGCONNECT_TIMEOUT": "5",
        }
    )
    return env


def table_fingerprints(engine) -> dict[str, Any]:
    result = {}
    with engine.connect() as db:
        for table in TABLES:  # Static allowlist, never SQL supplied by callers.
            rows = list(
                db.scalars(text(f"SELECT to_jsonb(t) FROM {table} t ORDER BY to_jsonb(t)::text"))
            )
            payload = json.dumps(rows, sort_keys=True, default=str).encode()
            result[table] = {"rows": len(rows), "sha256": hashlib.sha256(payload).hexdigest()}
    return result


def run_drill(base: URL) -> dict[str, Any]:
    from app.core.embedding import embed
    from app.models.models import Job
    from app.services import job_service, memory_service

    dump = shutil.which("pg_dump")
    restore = shutil.which("pg_restore")
    if not dump or not restore:
        raise ValueError("Install matching PostgreSQL client tools first.")
    suffix = uuid.uuid4().hex[:12]
    names = [f"mnemo_test_recovery_{suffix}_{kind}" for kind in ("source", "restored")]
    admin = create_engine(base.set(database="postgres"), isolation_level="AUTOCOMMIT")
    databases = []
    engines = []
    try:
        for name in names:
            with admin.connect() as db:
                db.execute(text(f"CREATE DATABASE {name}"))
            databases.append(name)
        source_url, target_url = [base.set(database=name) for name in names]
        migration = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "0014_key_namespace_grants"],
            cwd=BACKEND,
            env={**os.environ, "DATABASE_URL": source_url.render_as_string(hide_password=False)},
            capture_output=True,
            timeout=120,
        )
        if migration.returncode:
            raise RuntimeError("Migration failed in the fresh recovery database.")
        source, target = [create_engine(url) for url in (source_url, target_url)]
        engines.extend((source, target))
        legacy_id = uuid.uuid4()
        with source.begin() as db:
            db.execute(
                text(
                    "INSERT INTO memories (id, namespace, content, importance, embedding, is_active) "
                    "VALUES (:id, 'legacy', 'Legacy lives in Valencia', 3, CAST(:vector AS vector), true)"
                ),
                {"id": legacy_id, "vector": str(embed("Legacy lives in Valencia"))},
            )
        upgraded = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=BACKEND,
            env={**os.environ, "DATABASE_URL": source_url.render_as_string(hide_password=False)},
            capture_output=True,
            timeout=120,
        )
        if upgraded.returncode:
            raise RuntimeError("Assertion-index migration failed.")
        with source.connect() as db:
            backfilled = db.execute(
                text("SELECT fact_subject, fact_attribute, fact_value FROM memories WHERE id=:id"),
                {"id": legacy_id},
            ).one()
            if tuple(backfilled) != ("legacy", "residence", "valencia"):
                raise ValueError("Legacy assertion backfill did not preserve the expected lookup.")
        with Session(source) as db:
            original, _, _ = memory_service.add_memory(
                db, content="Nora lives in Lisbon", namespace="recovery", importance=3
            )
            changed, flags, _ = memory_service.add_memory(
                db, content="Nora lives in Porto now", namespace="recovery", importance=3
            )
            if len(flags) != 1:
                raise ValueError("Synthetic recovery conflict was not flagged.")
            resolved, error = memory_service.resolve_contradiction(
                db, contradiction_id=flags[0].id, winner_memory_id=changed.id
            )
            if error or resolved is None:
                raise ValueError("Synthetic recovery conflict was not resolved.")
            original_id, changed_id = original.id, changed.id
            job = job_service.enqueue(db, kind="recovery.probe", payload={"synthetic": True})
            db.commit()
            claimed = job_service.claim_next(db)
            if claimed is None or claimed.id != job.id:
                raise ValueError("Synthetic job was not claimed.")
            claimed.lease_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            old_lease = claimed.lease_token
            db.commit()
        before = table_fingerprints(source)
        with tempfile.TemporaryDirectory(prefix="mnemo-private-recovery-") as directory:
            path = Path(directory) / "snapshot.dump"
            with path.open("wb"):
                pass
            path.chmod(0o600)
            for command, url in [
                ([dump, "--format=custom", "--file", str(path)], source_url),
                (
                    [
                        restore,
                        "--no-owner",
                        "--no-acl",
                        "--exit-on-error",
                        "--dbname",
                        names[1],
                        str(path),
                    ],
                    target_url,
                ),
            ]:
                outcome = subprocess.run(
                    command, env=pg_environment(url), capture_output=True, timeout=120
                )
                if outcome.returncode:
                    raise RuntimeError("PostgreSQL backup or restore command failed.")
        after = table_fingerprints(target)
        if before != after:
            raise ValueError("Restored rows differ from the source database.")
        with Session(target) as db:
            active, _ = memory_service.list_memories(db, namespace="recovery", limit=10, offset=0)
            if [memory.id for memory in active] != [changed_id]:
                raise ValueError("Restored active memory differs from the reviewed winner.")
            archived = memory_service.get_memory(db, memory_id=original_id)
            if archived is None or archived.is_active:
                raise ValueError("Restored inactive history is missing.")
            recovered = job_service.claim_next(db)
            if recovered is None or recovered.lease_token == old_lease or recovered.attempts != 2:
                raise ValueError("Expired job lease was not recovered after restore.")
            db.commit()
            if db.get(Job, recovered.id).status != "running":
                raise ValueError("Recovered job was not persisted.")
        return {
            "format_version": 1,
            "measured_at": datetime.now(timezone.utc).isoformat(),
            "scope": "Local synthetic full-database pg_dump/pg_restore drill; not a production backup or RPO/RTO guarantee.",
            "migration_backfill_verified": True,
            "rows_match": True,
            "reviewed_state_preserved": True,
            "expired_job_lease_recovered": True,
            "tables": before,
            "cleanup": "Temporary dump and both generated databases removed on successful return.",
        }
    finally:
        for engine in engines:
            engine.dispose()
        try:
            for name in reversed(databases):
                with admin.connect() as db:
                    db.execute(text(f"DROP DATABASE {name}"))
        finally:
            admin.dispose()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        base = local_url(os.environ.get("DATABASE_URL", ""))
        report = run_drill(base)
        args.output.write_text(json.dumps(report, indent=2) + "\n")
    except (ValueError, RuntimeError, OSError, subprocess.SubprocessError, SQLAlchemyError):
        print(
            "Recovery drill failed. Check local PostgreSQL tools, permissions and migrations; no successful report was written.",
            file=sys.stderr,
        )
        return 1
    print("Recovery drill passed: matching database rows, reviewed state and reclaimed job lease.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
