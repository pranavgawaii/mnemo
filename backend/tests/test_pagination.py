"""Cursor pagination round trip (CI tier, needs Postgres)."""

from __future__ import annotations

import uuid

from app.api.pagination import decode_cursor, encode_cursor
from tests.conftest import requires_db


def test_cursor_round_trip_hermetic():
    from datetime import UTC, datetime

    raw = encode_cursor(datetime(2026, 1, 2, 3, 4, 5, tzinfo=UTC), uuid.uuid4())
    ts, row_id = decode_cursor(raw)
    assert ts.year == 2026 and ts.hour == 3
    assert isinstance(row_id, uuid.UUID)


def test_decode_cursor_rejects_garbage():
    import pytest

    with pytest.raises(ValueError):
        decode_cursor("not-a-cursor")


@requires_db
def test_cursor_walks_all_pages(client, namespace):
    for i in range(5):
        client.post(
            "/v1/memories",
            json={"content": f"fact number {i}", "namespace": namespace, "importance": 5 - i},
        )
        if i > 0:
            from sqlalchemy import text

            from app.db.session import SessionLocal

            with SessionLocal() as db:
                # Stagger created_at so the (created_at, id) ordering is total.
                db.execute(
                    text(
                        "UPDATE memories SET created_at = now() - (:seconds * interval '1 second') "
                        "WHERE content = :c"
                    ),
                    {"seconds": float(i * 10), "c": f"fact number {i}"},
                )
                db.commit()

    first = client.get(f"/v1/memories?namespace={namespace}&limit=2").json()
    assert first["next_cursor"] is not None

    seen: list[str] = [m["content"] for m in first["items"]]
    cursor = first["next_cursor"]
    while cursor is not None:
        page = client.get(
            f"/v1/memories?namespace={namespace}&limit=2&cursor={cursor}"
        ).json()
        seen.extend(m["content"] for m in page["items"])
        cursor = page["next_cursor"]

    assert len(seen) == 5
    assert len(set(seen)) == 5, "cursor pages must not repeat rows"


@requires_db
def test_invalid_cursor_is_400(client, namespace):
    response = client.get(f"/v1/memories?namespace={namespace}&cursor=garbage")
    assert response.status_code == 400
    assert "cursor" in response.json()["detail"].lower()
