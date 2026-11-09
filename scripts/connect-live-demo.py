"""Provision a dedicated read/write demo key and configure the local Next.js app.

    MNEMO_API_KEY=... python scripts/connect-live-demo.py --api-url http://127.0.0.1:8000

The key is written only to the ignored frontend/.env.local, with mode 0600.
Existing variables are preserved. A public walkthrough should use a dedicated
demo API/database: sessions create random namespaces, so this key deliberately
has no exact namespace grant and must never be used against private app data.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


def write_environment(path: Path, values: dict[str, str]) -> None:
    """Replace only named variables, without printing or truncating other secrets."""
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    updated = []
    written: set[str] = set()
    for line in lines:
        name = line.split("=", 1)[0].strip()
        if name in values:
            if name not in written:
                updated.append(f"{name}={values[name]}")
                written.add(name)
        else:
            updated.append(line)
    updated.extend(f"{name}={value}" for name, value in values.items() if name not in written)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary: str | None = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False, encoding="utf-8") as output:
            temporary = output.name
            output.write("\n".join(updated) + "\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def api_json(base: str, path: str, key: str, payload: dict | None = None) -> dict:
    request = Request(base + path, headers={"X-API-Key": key, "Content-Type": "application/json"},
                      data=json.dumps(payload).encode() if payload is not None else None)
    with urlopen(request, timeout=30) as response:
        value = json.load(response)
    if not isinstance(value, dict):
        raise TypeError("Unexpected API response.")
    return value


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", required=True, help="API origin reachable from the Next.js server.")
    parser.add_argument("--env-file", type=Path, default=ROOT / "frontend/.env.local")
    parser.add_argument("--expires-days", type=int, default=30, choices=range(1, 91), metavar="1..90")
    args = parser.parse_args(argv)
    parsed = urlsplit(args.api_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or (
        parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {"", "/"}
    ):
        parser.error("--api-url must be an HTTP(S) origin without credentials.")
    # Custom paths must still be a private environment file, never source or docs.
    if not args.env_file.name.startswith(".env") or args.env_file.name == ".env.example":
        parser.error("--env-file must be a private .env file, not a template or source file.")
    key = os.environ.get("MNEMO_API_KEY")
    if not key:
        parser.error("Set MNEMO_API_KEY to an operator key; it will not be written to the frontend.")
    base = args.api_url.rstrip("/")
    created = None
    try:
        ready = api_json(base, "/v1/demo/availability", key)
        if ready.get("status") != "available":
            raise ValueError("Demo API is not ready.")
        created = api_json(base, "/v1/keys", key, {
            "label": "website-demo", "scopes": ["read", "write"],
            "rate_limit_per_minute": 120,
            "expires_at": (datetime.now(UTC) + timedelta(days=args.expires_days)).isoformat(),
        })
        demo_key = created["key"]
        if not isinstance(demo_key, str) or not re.fullmatch(r"mnemo_[A-Za-z0-9_-]{24,128}", demo_key):
            raise ValueError("API did not return an issued demo key.")
        if api_json(base, "/v1/demo/availability", demo_key).get("status") != "available":
            raise ValueError("The issued key cannot access the demo API.")
        write_environment(args.env_file, {"MNEMO_DEMO_API_URL": base, "MNEMO_DEMO_API_KEY": demo_key})
    except (HTTPError, URLError, OSError, KeyError, TypeError, ValueError):
        if created and created.get("id"):
            try:
                request = Request(base + "/v1/keys/" + str(created["id"]), method="DELETE", headers={"X-API-Key": key})
                with urlopen(request, timeout=10):
                    pass
            except (HTTPError, URLError, OSError):
                print("Setup failed; revoke the last website-demo key through the operator API.")
        print("Demo setup failed. Check the API URL, operator scope and database migrations.")
        return 1
    print(f"Dedicated demo key configured in {args.env_file}; expires in {args.expires_days} days.")
    print("Restart the frontend, then run python scripts/check-live-demo.py.")
    print("This configures local development. Hosted Vercel needs a public API URL and its own server-only variables.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
