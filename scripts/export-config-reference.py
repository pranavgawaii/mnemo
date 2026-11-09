"""Generate deployment defaults from Settings.model_fields, not environment values.

    python scripts/export-config-reference.py
    python scripts/export-config-reference.py --check
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import Settings  # noqa: E402

START = "<!-- configuration-reference:start -->"
END = "<!-- configuration-reference:end -->"
NOTES = {
    "database_url": "PostgreSQL with pgvector; provider postgres:// and postgresql:// URLs use psycopg 3 automatically.",
    "mnemo_api_key": "Bootstrap operator key. Replace this development default before exposing the API.",
    "embedding_model": "Local sentence-transformers encoder; must match the configured dimension.",
    "embedding_dim": "Vector dimension; changing it also needs a database migration.",
    "embedding_warmup": "Load/validate the encoder during startup. The Docker image sets this to true.",
    "decay_half_life_days": "Age-weight half-life used by relevance ranking.",
    "decay_floor": "Minimum age multiplier.",
    "contradiction_sim_threshold": "Similarity gate for heuristic/optional model conflict checks.",
    "keyword_weight": "Default keyword boost; queries may override it.",
    "ann_ef_search": "HNSW query breadth, 1–1000; increasing it trades speed for recall.",
    "dedup_mode": "flag, reject or off; flag accepts a write and reports a near duplicate.",
    "dedup_threshold": "Near-duplicate similarity threshold.",
    "contradiction_llm_provider": "Empty keeps the local detector; openai enables a compatible verdict API.",
    "contradiction_llm_api_key": "Optional verdict-provider secret; never expose it through the frontend.",
    "contradiction_llm_base_url": "Optional compatible chat-completions server.",
    "contradiction_llm_model": "Optional verdict model, not an answer-generation model.",
    "contradiction_llm_timeout_seconds": "Verdict request timeout; failures fall back to the heuristic.",
    "job_worker_enabled": "Enable the in-process outbox worker; external scheduling is required when disabled.",
    "job_worker_interval_seconds": "Polling interval for the in-process worker.",
    "job_lease_seconds": "Claim lease; must exceed the longest expected handler duration.",
    "webhook_timeout_seconds": "Webhook delivery timeout.",
    "log_json": "Structured JSON request logging.",
    "log_level": "Application logging level.",
    "cors_allow_origins": "JSON array of explicitly allowed browser origins; empty adds no CORS middleware.",
    "max_body_bytes": "Hard HTTP request-body limit.",
    "rate_limit_enabled": "Enable per-key fixed-minute counters; turn on for a public demo.",
    "rate_limit_per_minute": "Default request budget; an issued key may set its own limit.",
}


def render() -> str:
    if set(NOTES) != set(Settings.model_fields):
        raise ValueError("Add a documentation note for every setting, and remove stale notes.")
    rows = [START, "| Variable | Code default | Meaning |", "| --- | --- | --- |"]
    for name, field in Settings.model_fields.items():
        default = json.dumps(field.default, ensure_ascii=False)
        rows.append(f"| `{name.upper()}` | `{default}` | {NOTES[name]} |")
    return "\n".join([*rows, END])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    destination = ROOT / "docs/deployment.md"
    text = destination.read_text(encoding="utf-8")
    before, remainder = text.split(START, 1)
    _, after = remainder.split(END, 1)
    updated = before + render() + after
    if args.check:
        if updated != text:
            print("Deployment defaults are stale. Run python scripts/export-config-reference.py.")
            return 1
        print("Deployment defaults agree with Settings.")
        return 0
    destination.write_text(updated, encoding="utf-8")
    print("Updated deployment configuration reference.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
