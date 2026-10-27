"""Structured logging tests. Pure stdlib - no database, no HTTP stack."""

from __future__ import annotations

import json
import logging

from app.core.logging_setup import JsonFormatter, configure_logging


def _record(**extra: object) -> logging.LogRecord:
    record = logging.LogRecord(
        name="mnemo.test",
        level=logging.INFO,
        pathname="app/main.py",
        lineno=1,
        msg="request",
        args=(),
        exc_info=None,
    )
    for key, value in extra.items():
        setattr(record, key, value)
    return record


def test_json_formatter_base_payload():
    formatted = json.loads(JsonFormatter().format(_record()))
    assert formatted["level"] == "INFO"
    assert formatted["logger"] == "mnemo.test"
    assert formatted["message"] == "request"
    assert "ts" in formatted


def test_json_formatter_includes_extra_fields():
    formatted = json.loads(
        JsonFormatter().format(_record(request_id="abc", status=201, duration_ms=1.5))
    )
    assert formatted["request_id"] == "abc"
    assert formatted["status"] == 201
    assert formatted["duration_ms"] == 1.5


def test_configure_logging_is_idempotent():
    try:
        configure_logging()
        configure_logging()
        root = logging.getLogger()
        assert len(root.handlers) == 1
        assert isinstance(root.handlers[0].formatter, JsonFormatter)
    finally:
        # Do not leak a stdout handler into other test modules.
        logging.getLogger().handlers[:] = []
