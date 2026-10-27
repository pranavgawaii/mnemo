"""High-level helpers for common agent-memory patterns.

These wrap :class:`mnemo.MnemoClient` with the defaults agents usually want:

- :func:`remember` — add a fact and optionally auto-resolve contradictions by
  keeping the newest statement ("last write wins").
- :func:`recall` — search and return plain memories, dropping ranking details.
- :func:`forget` — soft-delete by id.
- :func:`context_block` — build a prompt-ready context string from search.

They are plain functions taking the client as the first argument, so they work
with both the sync and (via await-less signatures) only the sync client today;
async callers can call the client methods directly.
"""

from __future__ import annotations

import uuid
from typing import Any

from .client import MnemoClient
from .models import Contradiction, Memory


def remember(
    client: MnemoClient,
    content: str,
    *,
    namespace: str | None = None,
    importance: int = 3,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    auto_resolve: bool = True,
) -> tuple[Memory, list[Contradiction]]:
    """Add a fact; contradictions are auto-resolved with the new fact winning.

    ``auto_resolve`` implements the last-write-wins pattern: every freshly
    flagged contradiction is resolved naming the new memory as the winner,
    which soft-deletes the outdated statement it contradicts.
    """
    memory, contradictions = client.add_memory(
        content,
        namespace=namespace,
        importance=importance,
        tags=tags,
        metadata=metadata,
    )
    if auto_resolve:
        for contradiction in contradictions:
            client.resolve_contradiction(
                contradiction.id, winner_memory_id=memory.id
            )
    return memory, contradictions


def recall(
    client: MnemoClient,
    query: str,
    *,
    namespace: str | None = None,
    limit: int = 5,
    min_similarity: float = 0.0,
    tags: list[str] | None = None,
) -> list[Memory]:
    """Search and return just the memories, weakest-evidence filtered."""
    response = client.search(query, namespace=namespace, limit=limit, tags=tags)
    return [hit.memory for hit in response.hits if hit.similarity >= min_similarity]


def forget(client: MnemoClient, memory_id: uuid.UUID | str, *, namespace: str | None = None) -> Memory:
    """Soft-delete one memory; the audit trail keeps the tombstone."""
    return client.delete_memory(memory_id, namespace=namespace)


def context_block(
    client: MnemoClient,
    query: str,
    *,
    namespace: str | None = None,
    limit: int = 5,
    max_chars: int = 2000,
    header: str = "Relevant memories:",
) -> str:
    """Format search results as a bulleted block for a prompt.

    Empty search results yield an empty string, so callers can skip injecting
    the block at all.
    """
    memories = recall(client, query, namespace=namespace, limit=limit)
    if not memories:
        return ""
    lines = [header]
    used = len(header) + 1
    for memory in memories:
        line = f"- {memory.content}"
        if used + len(line) + 1 > max_chars:
            break
        lines.append(line)
        used += len(line) + 1
    return "\n".join(lines)
