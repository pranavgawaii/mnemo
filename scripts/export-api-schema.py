"""Refresh the frontend contract snapshot without running an API server.

From backend: .venv/bin/python ../scripts/export-api-schema.py
"""

import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "backend"))

from app.main import app

destination = root / "public" / "openapi.json"
destination.write_text(json.dumps(app.openapi(), indent=2) + "\n")
print(f"Updated {destination}")
