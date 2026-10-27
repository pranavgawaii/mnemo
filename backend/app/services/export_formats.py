"""Export format helpers: JSON, JSONL, CSV.

The JSON ``MemoryExport`` document stays the canonical backup format (it
round-trips through ``import``). JSONL is a line-oriented variant that
round-trips too and is friendlier for streaming and ``jq``. CSV is one-way —
for spreadsheets and quick greps — and carries no embeddings or metadata
beyond what fits a cell.
"""

from __future__ import annotations

import csv
import io
import json
from typing import Any

from app.models.schemas import ContradictionExportItem, MemoryExportItem

_MEMORY_COLUMNS = (
    "id",
    "content",
    "importance",
    "is_active",
    "tags",
    "metadata",
    "expires_at",
    "created_at",
    "updated_at",
)
_CONTRADICTION_COLUMNS = (
    "id",
    "new_memory_id",
    "existing_memory_id",
    "similarity",
    "reason",
    "status",
    "resolved_winner_id",
    "created_at",
    "resolved_at",
)


def _memory_row(item: MemoryExportItem) -> dict[str, str]:
    return {
        "id": str(item.id),
        "content": item.content,
        "importance": str(item.importance),
        "is_active": str(item.is_active),
        "tags": "|".join(item.tags),
        "metadata": json.dumps(item.meta, sort_keys=True) if item.meta else "",
        "expires_at": item.expires_at.isoformat() if item.expires_at else "",
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def _contradiction_row(item: ContradictionExportItem) -> dict[str, str]:
    return {
        "id": str(item.id),
        "new_memory_id": str(item.new_memory_id),
        "existing_memory_id": str(item.existing_memory_id),
        "similarity": f"{item.similarity:.6f}",
        "reason": item.reason,
        "status": item.status,
        "resolved_winner_id": str(item.resolved_winner_id) if item.resolved_winner_id else "",
        "created_at": item.created_at.isoformat(),
        "resolved_at": item.resolved_at.isoformat() if item.resolved_at else "",
    }


def _csv_text(columns: tuple[str, ...], rows: list[dict[str, str]]) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(columns))
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def memories_csv_text(items: list[MemoryExportItem]) -> str:
    """Memory rows as CSV text (tags joined with '|', metadata JSON-encoded)."""
    return _csv_text(_MEMORY_COLUMNS, [_memory_row(item) for item in items])


def contradictions_csv_text(items: list[ContradictionExportItem]) -> str:
    """Contradiction rows as CSV text."""
    return _csv_text(_CONTRADICTION_COLUMNS, [_contradiction_row(item) for item in items])


def to_jsonl(
    memories: list[MemoryExportItem], contradictions: list[ContradictionExportItem]
) -> str:
    """One JSON object per line, tagged with its entity type.

    Lines are ``{"type": "memory", ...}`` and ``{"type": "contradiction", ...}``
    so a reader can branch per line without knowing order.
    """
    lines: list[str] = []
    for mem_item in memories:
        row: dict[str, Any] = {"type": "memory"}
        row.update(mem_item.model_dump(mode="json", by_alias=True))
        lines.append(json.dumps(row, separators=(",", ":")))
    for con_item in contradictions:
        row = {"type": "contradiction"}
        row.update(con_item.model_dump(mode="json", by_alias=True))
        lines.append(json.dumps(row, separators=(",", ":")))
    return "\n".join(lines) + ("\n" if lines else "")


def from_jsonl(text: str) -> tuple[list[MemoryExportItem], list[ContradictionExportItem]]:
    """Inverse of :func:`to_jsonl`. Raises ValueError on an unknown type."""
    memories: list[MemoryExportItem] = []
    contradictions: list[ContradictionExportItem] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        record = json.loads(line)
        kind = record.pop("type", None)
        if kind == "memory":
            memories.append(MemoryExportItem.model_validate(record))
        elif kind == "contradiction":
            contradictions.append(ContradictionExportItem.model_validate(record))
        else:
            raise ValueError(f"line {line_number}: unknown export type {kind!r}")
    return memories, contradictions
