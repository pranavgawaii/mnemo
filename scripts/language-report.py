"""Preview this repository's GitHub-style code-byte breakdown before pushing.

GitHub Linguist is the authority for the published bar. This script uses a
deliberately small classifier for the programming/markup languages already in
Mnemo, not a general reimplementation of Linguist's heuristics. --verify-origin
compares the committed baseline against GitHub's actual language-byte API; a
mismatch fails rather than claiming an exact projection. The working-tree
report includes nonignored new source files as well as tracked files.

No .gitattributes override is installed and no language is hidden or reclassified.
Documentation, JSON/YAML data, media, dependencies and build output do not become
Python merely because they support a Python service.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {
    ".py": "Python", ".ts": "TypeScript", ".tsx": "TypeScript", ".css": "CSS",
    ".mdx": "MDX", ".js": "JavaScript", ".mjs": "JavaScript", ".mako": "Mako",
}
FILENAMES = {"Dockerfile": "Dockerfile", "Makefile": "Makefile"}


def language_for(path: str) -> str | None:
    item = Path(path)
    return FILENAMES.get(item.name) or EXTENSIONS.get(item.suffix)


def git(*arguments: str) -> bytes:
    return subprocess.check_output(["git", *arguments], cwd=ROOT)


def committed_sizes() -> dict[str, int]:
    totals: Counter[str] = Counter()
    for record in git("ls-tree", "-rlz", "HEAD").split(b"\0"):
        if not record:
            continue
        metadata, raw_path = record.split(b"\t", 1)
        parts = metadata.split()
        if parts[1] != b"blob":
            continue
        language = language_for(raw_path.decode())
        if language:
            totals[language] += int(parts[3])
    return dict(totals)


def working_files() -> list[dict[str, Any]]:
    items = []
    paths = git("ls-files", "-co", "--exclude-standard", "-z").decode().split("\0")
    for name in sorted(set(paths)):
        language = language_for(name)
        path = ROOT / name
        if not name or not language or not path.is_file() or path.is_symlink():
            continue
        items.append({"path": name, "language": language, "bytes": path.stat().st_size})
    return items


def make_report(files: list[dict[str, Any]]) -> dict[str, Any]:
    totals: Counter[str] = Counter()
    counts: Counter[str] = Counter()
    for item in files:
        totals[item["language"]] += item["bytes"]
        counts[item["language"]] += 1
    total = sum(totals.values())
    return {
        "projected": True, "basis": "code bytes, not lines or number of files",
        "total_code_bytes": total,
        "languages": [{
            "language": language, "bytes": size, "files": counts[language],
            "percentage": 100 * size / total if total else 0,
        } for language, size in totals.most_common()],
        "files": [{**item, "percentage_of_code": 100 * item["bytes"] / total if total else 0} for item in files],
    }


def verify_origin() -> dict[str, int]:
    """Use authenticated gh without printing tokens or modifying git state."""
    repository = subprocess.check_output(
        ["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"], cwd=ROOT,
    ).decode().strip()
    remote_head = subprocess.check_output(
        ["gh", "api", f"repos/{repository}/commits/main", "--jq", ".sha"], cwd=ROOT,
    ).decode().strip()
    if remote_head != git("rev-parse", "HEAD").decode().strip():
        raise ValueError("Baseline verification requires local HEAD to match GitHub main.")
    published = json.loads(subprocess.check_output(
        ["gh", "api", f"repos/{repository}/languages"], cwd=ROOT,
    ))
    if committed_sizes() != published:
        raise ValueError("Local classifier differs from GitHub Linguist; do not treat its estimate as exact.")
    return published


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Optional JSON report with per-file byte counts.")
    parser.add_argument("--verify-origin", action="store_true", help="Verify the HEAD baseline against GitHub's API.")
    args = parser.parse_args(argv)
    report = make_report(working_files())
    report["baseline_verified"] = False
    if args.verify_origin:
        report["published_baseline"] = verify_origin()
        report["baseline_verified"] = True
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("Projected working-tree language breakdown (GitHub publishes after a push):")
    for item in report["languages"]:
        print(f"{item['language']:12} {item['percentage']:6.2f}%  {item['bytes']:>8,} bytes  {item['files']:>3} files")
    if report["baseline_verified"]:
        print("Committed baseline matches GitHub's language-byte API exactly.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
