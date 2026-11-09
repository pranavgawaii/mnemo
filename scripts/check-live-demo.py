"""Exercise the configured Next.js → FastAPI → pgvector walkthrough.

From the repository root, with the API and configured web app running:
    python scripts/check-live-demo.py

Creates synthetic, expiring facts in a new demo namespace; requires no client key.
"""

from __future__ import annotations

import argparse
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--web-url", default="http://127.0.0.1:3005")
    args = parser.parse_args()
    endpoint = args.web_url.rstrip("/") + "/api/demo"
    with urlopen(endpoint, timeout=10) as response:
        if json.load(response).get("status") != "available":
            raise SystemExit("Configure the server-only demo API variables and check backend availability.")
    examples = {
        "relocation": ("Demo user lives in Bengaluru", "Demo user moved from Bengaluru to Pune"),
        "preference": ("Demo user's favourite cuisine is Thai",
                       "Demo user's favourite cuisine changed from Thai to Japanese"),
        "learning": ("Demo user is learning Rust on weekends",
                     "Demo user switched from learning Rust on weekends to learning Go on weekends"),
        "routine": ("Demo user runs 5 kilometres three mornings a week",
                    "Demo user changed running routine from 5 kilometres three mornings a week "
                    "to 3 kilometres twice a week"),
    }
    views = {
        "relocation": "Demo user lives in Pune",
        "preference": "Demo user's favourite cuisine is Japanese",
        "learning": "Demo user is learning Go on weekends",
        "routine": "Demo user runs 3 kilometres twice a week",
    }
    for scenario, (previous, current) in examples.items():
        token = None
        outcomes = []
        for action in ["start", "move", "resolve"]:
            payload = {"action": action, **({"token": token} if token else {"scenario": scenario})}
            request = Request(
                endpoint, data=json.dumps(payload).encode(), method="POST",
                headers={"Content-Type": "application/json"},
            )
            try:
                with urlopen(request, timeout=60) as response:
                    result = json.load(response)
            except HTTPError as error:
                raise SystemExit(f"{scenario} walkthrough failed: HTTP {error.code}.") from error
            token = result["token"]
            outcomes.append(result)
        before, changed, after = outcomes
        assert [hit["content"] for hit in before["hits"]] == [previous]
        assert changed["phase"] == "flagged" and "Explicit" in changed["reason"]
        assert after["phase"] == "resolved" and after["previousActive"] is False
        assert [hit["content"] for hit in after["hits"]] == [current]
        assert after["hits"][0]["currentStatement"] == views[scenario]
        calls = [entry for outcome in outcomes for entry in outcome["requests"]]
        assert len(calls) == 6 and all(200 <= entry["status"] < 300 for entry in calls)
        print(f"{scenario}: six memory API calls passed; reviewed; inactive history verified.")
    print("All four live API scenarios passed.")


if __name__ == "__main__":
    main()
