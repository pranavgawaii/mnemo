"""Guards against drift between the backend and its browser-side mirror.

``frontend/lib/mnemo.ts`` deliberately re-declares Mnemo's scoring thresholds,
limits and contradiction marker list so the static docs page can run the *real*
logic in the browser without an API key. Nothing at runtime keeps the two in
sync, so this test does — by parsing the two source files, which needs neither
torch nor a database and therefore runs in plain CI.

If you change a value in ``app/core/config.py``, ``app/services/memory_service.py``
or the request schemas, change it in ``frontend/lib/mnemo.ts`` too (or update
this map if the constant itself was renamed).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PY = ROOT / "app" / "core" / "config.py"
SERVICE_PY = ROOT / "app" / "services" / "memory_service.py"
SCHEMAS_PY = ROOT / "app" / "models" / "schemas.py"
ROUTES_PY = ROOT / "app" / "api" / "routes.py"
CONTRADICTION_PY = ROOT / "app" / "core" / "contradiction.py"
MNEMO_TS = ROOT / "frontend" / "lib" / "mnemo.ts"


# --------------------------------------------------------------------------- #
# Parsing helpers
# --------------------------------------------------------------------------- #
def _ts_source() -> str:
    return MNEMO_TS.read_text(encoding="utf-8")


def _ts_const(name: str) -> str:
    """The literal on the right of `export const NAME = ...;` in lib/mnemo.ts."""
    match = re.search(
        rf"^export const {re.escape(name)}\s*=\s*(.+?);\s*$",
        _ts_source(),
        re.MULTILINE,
    )
    assert match, f"{name} not found in frontend/lib/mnemo.ts"
    return match.group(1).strip()


def _ts_number(name: str) -> float:
    return float(_ts_const(name))


def _ts_string(name: str) -> str:
    return _ts_const(name).strip().strip('"').strip("'")


def _py_setting(name: str) -> float:
    """Value of a `name: type = value` line in the Settings class."""
    source = CONFIG_PY.read_text(encoding="utf-8")
    match = re.search(
        rf"^\s*{re.escape(name)}\s*:\s*[\w\[\]|.]+?\s*=\s*(.+?)\s*$",
        source,
        re.MULTILINE,
    )
    assert match, f"{name} not found in app/core/config.py"
    return float(match.group(1))


def _py_setting_str(name: str) -> str:
    source = CONFIG_PY.read_text(encoding="utf-8")
    match = re.search(
        rf'^\s*{re.escape(name)}\s*:\s*[\w\[\]|.]+?\s*=\s*"([^"]*)"\s*$',
        source,
        re.MULTILINE,
    )
    assert match, f"{name} not found in app/core/config.py"
    return match.group(1)


def _py_module_const(name: str) -> float:
    source = SERVICE_PY.read_text(encoding="utf-8")
    match = re.search(
        rf"^{re.escape(name)}\s*=\s*(\d+)\s*$", source, re.MULTILINE
    )
    assert match, f"{name} not found in app/services/memory_service.py"
    return float(match.group(1))


# --------------------------------------------------------------------------- #
# Scoring configuration (app/core/config.py)
# --------------------------------------------------------------------------- #
def test_scoring_constants_match():
    assert _ts_number("DECAY_HALF_LIFE_DAYS") == _py_setting("decay_half_life_days")
    assert _ts_number("DECAY_FLOOR") == _py_setting("decay_floor")
    assert _ts_number("CONTRADICTION_SIM_THRESHOLD") == _py_setting(
        "contradiction_sim_threshold"
    )


def test_embedding_config_matches():
    assert _ts_string("EMBEDDING_MODEL") == _py_setting_str("embedding_model")
    assert _ts_number("EMBEDDING_DIM") == _py_setting("embedding_dim")


# --------------------------------------------------------------------------- #
# Search / contradiction fan-out (app/services/memory_service.py)
# --------------------------------------------------------------------------- #
def test_service_constants_match():
    assert _ts_number("CONTRADICTION_CANDIDATES") == _py_module_const(
        "_CONTRADICTION_CANDIDATES"
    )
    assert _ts_number("SEARCH_OVERFETCH") == _py_module_const("_SEARCH_OVERFETCH")


# --------------------------------------------------------------------------- #
# Pagination limits (request schemas + route defaults)
# --------------------------------------------------------------------------- #
def test_search_limit_constants_match():
    source = SCHEMAS_PY.read_text(encoding="utf-8")
    match = re.search(
        r"limit:\s*int\s*=\s*Field\(default=(\d+),\s*ge=\d+,\s*le=(\d+)\)", source
    )
    assert match, "SearchRequest.limit Field(...) not found"
    assert _ts_number("SEARCH_LIMIT_DEFAULT") == float(match.group(1))
    assert _ts_number("SEARCH_LIMIT_MAX") == float(match.group(2))


def test_list_limit_constants_match():
    source = ROUTES_PY.read_text(encoding="utf-8")
    match = re.search(
        r"limit:\s*int\s*=\s*Query\(default=(\d+),\s*ge=\d+,\s*le=(\d+)\)", source
    )
    assert match, "list_memories limit Query(...) not found"
    assert _ts_number("LIST_LIMIT_DEFAULT") == float(match.group(1))
    assert _ts_number("LIST_LIMIT_MAX") == float(match.group(2))


# --------------------------------------------------------------------------- #
# Negation-marker list (app/core/contradiction.py)
# --------------------------------------------------------------------------- #
def _py_negation_markers() -> list[str]:
    source = CONTRADICTION_PY.read_text(encoding="utf-8")
    block = re.search(r"_NEGATION_MARKERS[^=]*=\s*\((.*?)\)", source, re.DOTALL)
    assert block, "_NEGATION_MARKERS tuple not found"
    return re.findall(r'"([^"]+)"', block.group(1))


def _ts_negation_markers() -> list[str]:
    block = re.search(r"NEGATION_MARKERS\s*=\s*\[(.*?)\]", _ts_source(), re.DOTALL)
    assert block, "NEGATION_MARKERS array not found in lib/mnemo.ts"
    return re.findall(r'"([^"]+)"', block.group(1))


def test_negation_markers_match():
    py = _py_negation_markers()
    ts = _ts_negation_markers()
    assert py == ts, (
        "Negation markers drifted between app/core/contradiction.py and "
        "frontend/lib/mnemo.ts.\n"
        f"backend only: {sorted(set(py) - set(ts))}\n"
        f"frontend only: {sorted(set(ts) - set(py))}"
    )
