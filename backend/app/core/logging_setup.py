"""Logging configuration.

One job: make every request traceable without adding a dependency. Structured
(JSON lines) by default so log aggregators can group by ``request_id``; a plain
human-readable mode for local development.

Usage from the app entrypoint::

    configure_logging()  # once, at import/startup
    logger.info("request", extra={"request_id": ..., "status": 200})
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone

from app.core.config import settings

# Standard LogRecord attributes that are already covered by the base payload
# (or are internals); anything else in ``record.__dict__`` came from ``extra=``.
_RESERVED_ATTRS = frozenset(
    {
        "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
        "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
        "created", "msecs", "relativeCreated", "thread", "threadName",
        "processName", "process", "taskName", "message", "asctime",
    }
)


class JsonFormatter(logging.Formatter):
    """Format a LogRecord as one JSON object per line.

    Base payload: ``ts``, ``level``, ``logger``, ``message``. Everything passed
    through ``extra=`` lands at the top level so a request log reads::

        {"ts": "...", "level": "INFO", "message": "request",
         "request_id": "...", "method": "POST", "status": 201}
    """

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in _RESERVED_ATTRS and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    """Install the root-logger handler matching the configured mode.

    Safe to call more than once: existing handlers are replaced, not stacked.
    """
    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    handler = logging.StreamHandler(sys.stdout)
    if settings.log_json:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )
    root.handlers[:] = [handler]
