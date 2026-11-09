"""Generate the browser's change rules from Python; --check detects drift."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.changes import browser_rules


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    target = ROOT / "frontend/src/lib/memory/generated/change-rules.json"
    rendered = json.dumps(browser_rules(), indent=2) + "\n"
    if args.check:
        if not target.exists() or target.read_text() != rendered:
            raise SystemExit("Browser rules are stale. Run python scripts/export-memory-rules.py.")
        print("Generated browser change rules agree with Python.")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(rendered)
    print("Generated browser change rules from Python.")


if __name__ == "__main__":
    main()
