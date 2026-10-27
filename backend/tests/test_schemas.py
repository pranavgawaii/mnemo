"""Schema conversion tests that need no database.

Especially the ORM attribute ``Memory.meta`` -> JSON field ``metadata`` alias
mapping, since SQLAlchemy reserves the ``metadata`` attribute name.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.models.models import Memory
from app.models.schemas import MemoryCreate, MemoryExportItem, MemoryOut


def _memory(**overrides: object) -> Memory:
    defaults: dict[str, object] = {
        "id": uuid.uuid4(),
        "namespace": "default",
        "content": "Pranav lives in Bengaluru",
        "importance": 3,
        "embedding": [0.0] * 384,
        "is_active": True,
        "tags": ["people", "places"],
        "meta": {"source": "chat"},
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    defaults.update(overrides)
    return Memory(**defaults)


def test_memory_out_maps_meta_to_metadata_alias():
    out = MemoryOut.model_validate(_memory())
    assert out.meta == {"source": "chat"}
    assert out.tags == ["people", "places"]
    dumped = out.model_dump(by_alias=True)
    assert dumped["metadata"] == {"source": "chat"}
    assert dumped["tags"] == ["people", "places"]


def test_memory_create_accepts_metadata_alias_and_field_name():
    by_alias = MemoryCreate.model_validate(
        {"content": "hello", "metadata": {"a": 1}, "tags": ["t1", "t1", " t2 "]}
    )
    assert by_alias.meta == {"a": 1}
    # Tags are stripped and de-duplicated? No: kept as-is minus whitespace.
    assert by_alias.tags == ["t1", "t1", "t2"]

    by_name = MemoryCreate.model_validate({"content": "hello", "meta": {"a": 1}})
    assert by_name.meta == {"a": 1}


def test_export_item_defaults_keep_old_snapshots_loadable():
    # A v1 export snapshot has no tags/metadata keys; defaults keep it valid.
    item = MemoryExportItem.model_validate(
        {
            "id": str(uuid.uuid4()),
            "content": "old snapshot row",
            "importance": 2,
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        }
    )
    assert item.tags == []
    assert item.meta == {}
