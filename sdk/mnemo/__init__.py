"""Mnemo Python SDK.

A typed client for the Mnemo semantic-memory API: add, search, list and resolve
memories with decay-aware ranking and contradiction detection.

    from mnemo import MnemoClient

    with MnemoClient(base_url="https://mnemo.internal", api_key="mnemo_...") as client:
        client.add_memory("Prefers dark mode", importance=2)
        for hit in client.search("theme preference").hits:
            print(hit.memory.content, hit.relevance_score)
"""

from .client import MnemoClient
from .errors import (
    AuthenticationError,
    ConflictError,
    ForbiddenError,
    MnemoError,
    NotFoundError,
    RateLimitError,
    ServerError,
    ValidationError,
)
from .models import (
    Contradiction,
    ContradictionList,
    Memory,
    MemoryList,
    SearchHit,
    SearchResponse,
)

__version__ = "0.1.0"

__all__ = [
    "AuthenticationError",
    "ConflictError",
    "Contradiction",
    "ContradictionList",
    "ForbiddenError",
    "Memory",
    "MemoryList",
    "MnemoClient",
    "MnemoError",
    "NotFoundError",
    "RateLimitError",
    "SearchHit",
    "SearchResponse",
    "ServerError",
    "ValidationError",
    "__version__",
]
