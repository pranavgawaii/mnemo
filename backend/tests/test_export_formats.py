"""JSONL and CSV export format helpers - pure, no database needed."""

from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import UTC, datetime, timezone

from app.models.schemas import ContradictionExportItem, MemoryExportItem
from app.services.export_formats import (
    contradictions_csv_text,
    from_jsonl,
    memories_csv_text,
    to_jsonl,
)

_NOW = datetime(2026, 1, 15, 12, 0, 0, tzinfo=timezone.utc)


def _memory(**overrides: object) -> MemoryExportItem:
    defaults: dict = {
        "id": uuid.uuid4(),
        "content": "Riya lives in Pune",
        "importance": 3,
        "is_active": True,
        "tags": ["people", "pune"],
        "meta": {"source": "chat"},
        "expires_at": None,
        "created_at": _NOW,
        "updated_at": _NOW,
    }
    defaults.update(overrides)
    return MemoryExportItem.model_validate(defaults)


def _contradiction(**overrides: object) -> ContradictionExportItem:
    defaults: dict = {
        "id": uuid.uuid4(),
        "new_memory_id": uuid.uuid4(),
        "existing_memory_id": uuid.uuid4(),
        "similarity": 0.93,
        "reason": "negation marker",
        "status": "open",
        "resolved_winner_id": None,
        "created_at": _NOW,
        "resolved_at": None,
    }
    defaults.update(overrides)
    return ContradictionExportItem.model_validate(defaults)


def _rows(text: str) -> list[dict[str, str]]:
    return list(csv.DictReader(io.StringIO(text)))


def test_memories_csv_columns_and_values():
    text = memories_csv_text([_memory()])
    rows = _rows(text)
    assert len(rows) == 1
    row = rows[0]
    assert row["content"] == "Riya lives in Pune"
    assert row["tags"] == "people|pune"
    assert json.loads(row["metadata"]) == {"source": "chat"}
    assert row["is_active"] == "True"


def test_memories_csv_escapes_commas_and_newlines():
    tricky = _memory(content="line1\nline2, with comma")
    row = _rows(memories_csv_text([tricky]))[0]
    assert row["content"] == "line1\nline2, with comma"


def test_contradictions_csv_null_cells_are_empty():
    resolved = _contradiction(resolved_winner_id=uuid.uuid4(), resolved_at=_NOW)
    open_row = _rows(contradictions_csv_text([_contradiction()]))[0]
    assert open_row["resolved_winner_id"] == ""
    assert open_row["resolved_at"] == ""
    done_row = _rows(contradictions_csv_text([resolved]))[0]
    assert done_row["resolved_winner_id"] == str(resolved.resolved_winner_id)


def test_jsonl_round_trips():
    memories = [_memory(), _memory(content="Second fact", tags=[], meta={})]
    contradictions = [_contradiction()]
    text = to_jsonl(memories, contradictions)

    lines = [line for line in text.splitlines() if line]
    assert len(lines) == 3
    assert json.loads(lines[0])["type"] == "memory"
    assert json.loads(lines[2])["type"] == "contradiction"

    back_memories, back_contradictions = from_jsonl(text)
    assert [m.id for m in back_memories] == [m.id for m in memories]
    assert back_memories[0].meta == {"source": "chat"}
    assert back_memories[0].tags == ["people", "pune"]
    assert [c.id for c in back_contradictions] == [c.id for c in contradictions]


def test_jsonl_empty_export_is_empty_string():
    assert to_jsonl([], []) == ""


def test_jsonl_unknown_type_rejected():
    import pytest

    line = json.dumps({"type": "alien", "id": "x"})
    with pytest.raises(ValueError, match="unknown export type"):
        from_jsonl(line)


def test_jsonl_skips_blank_lines():
    memories, _ = from_jsonl('\n\n{"type": "memory", ' + json.dumps(_memory().model_dump(mode="json", by_alias=True))[1:] + "\n")
    assert len(memories) == 1
    assert UTC is not None  # keep the import used
