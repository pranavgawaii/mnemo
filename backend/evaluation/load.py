"""Bounded local API load sample with real context validation and isolated data.

Creates expiring synthetic memories in one UUID namespace, warms retrieval, then
measures concurrent SDK requests. It archives only its own created records.
Latencies include HTTP and SDK handling; this is a local smoke sample, not a
production capacity claim. API failures and wrong-context responses count as
failures, not fast successful requests. Use a disposable development database.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import time
import uuid
from collections import Counter
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import httpx
from mnemo import MnemoClient, MnemoError

from benchmark.metrics import percentile


def run_load(
    factory: Callable[[], Any], *, requests: int = 120, concurrency: int = 4, corpus_size: int = 200
) -> dict[str, Any]:
    if type(requests) is not int or not 1 <= requests <= 2000:
        raise ValueError("requests must be an integer between 1 and 2000.")
    if type(concurrency) is not int or not 1 <= concurrency <= min(16, requests):
        raise ValueError("concurrency must be between 1 and 16, and no larger than requests.")
    if type(corpus_size) is not int or not 1 <= corpus_size <= 500:
        raise ValueError("corpus_size must be between 1 and 500.")
    namespace = "eval-load-" + uuid.uuid4().hex
    expiry = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    created = []
    cleanup_errors = 0
    outcomes = []
    elapsed = 0.0
    setup_error = None
    query = "Where does Nora live?"
    with factory() as setup:
        try:
            for index in range(corpus_size):
                content = (
                    "Nora lives in Lisbon"
                    if index == 0
                    else f"Project note {index} concerns unrelated build task {index}."
                )
                # SDK writes return a memory plus conflict flags.
                memory, flags = setup.add_memory(content, namespace=namespace, expires_at=expiry)
                created.append(memory.id)
                if flags:
                    raise ValueError("Unexpected synthetic setup conflict.")
            gold = created[0]

            def request(client):
                response = client.context(query, namespace=namespace, max_chars=2000)
                if (
                    response.status != "ready"
                    or response.has_pending_review
                    or not any(
                        item.memory_id == gold and not item.pending_review
                        for item in response.citations
                    )
                ):
                    raise ValueError("Known fact missing or unsafe context returned.")

            for _ in range(3):
                request(setup)

            def worker(index):
                measured = []
                with factory() as api:
                    for _ in range(index, requests, concurrency):
                        started = time.perf_counter()
                        error = None
                        try:
                            request(api)
                        except (MnemoError, httpx.HTTPError, ValueError) as exc:
                            error = type(exc).__name__
                        measured.append(
                            {"latency_ms": (time.perf_counter() - started) * 1000, "error": error}
                        )
                return measured

            started = time.perf_counter()
            with ThreadPoolExecutor(max_workers=concurrency) as pool:
                for batch in pool.map(worker, range(concurrency)):
                    outcomes.extend(batch)
            elapsed = time.perf_counter() - started
        except (MnemoError, httpx.HTTPError, ValueError) as exc:
            setup_error = type(exc).__name__
        finally:
            for memory_id in created:
                try:
                    setup.delete_memory(memory_id, namespace=namespace)
                except (MnemoError, httpx.HTTPError):
                    cleanup_errors += 1
    errors = Counter(item["error"] for item in outcomes if item["error"])
    latencies = [item["latency_ms"] for item in outcomes]
    successes = sum(item["error"] is None for item in outcomes)
    return {
        "format_version": 1,
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "scope": "Warm local SDK/HTTP context sample with synthetic data; not production capacity, cold-start latency or broad answer quality.",
        "python": platform.python_version(),
        "platform": platform.platform(),
        "corpus_size": len(created),
        "concurrency": concurrency,
        "warmup_requests": 3,
        "requests": requests,
        "completed": len(outcomes),
        "successful_context_checks": successes,
        "errors": dict(errors),
        "setup_error": setup_error,
        "cleanup_errors": cleanup_errors,
        "elapsed_seconds": elapsed,
        "successful_requests_per_second": successes / elapsed if elapsed else None,
        "latency_including_failures_ms": {
            "p50": percentile(latencies, 0.5) if latencies else None,
            "p95": percentile(latencies, 0.95) if latencies else None,
            "max": max(latencies) if latencies else None,
        },
        "passed": len(outcomes) == requests
        and not errors
        and setup_error is None
        and cleanup_errors == 0,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--requests", type=int, default=120)
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--corpus-size", type=int, default=200)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    url = urlsplit(args.base_url)
    if (
        url.scheme not in {"http", "https"}
        or url.hostname not in {"localhost", "127.0.0.1", "::1"}
        or url.username
        or url.password
        or url.query
        or url.fragment
        or url.path not in {"", "/"}
    ):
        parser.error("Use a local HTTP(S) API origin without credentials or query parameters.")
    key = os.environ.get("MNEMO_API_KEY")
    if not key:
        parser.error("Set MNEMO_API_KEY to a disposable API read/write key.")
    try:
        report = run_load(
            lambda: MnemoClient(base_url=args.base_url, api_key=key, timeout=60),
            requests=args.requests,
            concurrency=args.concurrency,
            corpus_size=args.corpus_size,
        )
        args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    except (ValueError, OSError, MnemoError, httpx.HTTPError):
        print("Load sample failed before completion. Check local setup and input limits.")
        return 1
    print(
        f"{report['successful_context_checks']}/{report['requests']} context checks passed; cleanup errors: {report['cleanup_errors']}."
    )
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
