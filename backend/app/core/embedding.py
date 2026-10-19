"""Local sentence-transformers embedding.

Uses ``all-MiniLM-L6-v2`` (384-dim) by default — runs locally, no API key. The
model is loaded lazily and cached so importing this module (e.g. from unit tests
that only touch decay/contradiction) does not pay the model-load cost.
"""

from __future__ import annotations

import threading
from functools import lru_cache
from typing import TYPE_CHECKING

import numpy as np

from app.core.config import settings

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

_lock = threading.Lock()


@lru_cache(maxsize=1)
def _load_model() -> "SentenceTransformer":
    """Load and cache the embedding model (thread-safe, one-time)."""
    # Imported here so the heavy dependency is only pulled in when embedding is
    # actually needed.
    from sentence_transformers import SentenceTransformer

    with _lock:
        return SentenceTransformer(settings.embedding_model)


def embed(text: str) -> list[float]:
    """Embed a single string into a normalised 384-dim vector.

    Vectors are L2-normalised so a dot product equals cosine similarity, which
    matches pgvector's ``vector_cosine_ops`` index and lets us treat the raw
    inner product as similarity when we need it in Python.
    """
    model = _load_model()
    vec = model.encode(text, normalize_embeddings=True)
    arr = np.asarray(vec, dtype=np.float32)
    if arr.shape[0] != settings.embedding_dim:
        raise ValueError(
            f"Embedding dim {arr.shape[0]} != configured EMBEDDING_DIM "
            f"{settings.embedding_dim}. Model/config are out of sync."
        )
    return arr.tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two vectors.

    Works whether or not the inputs are pre-normalised.
    """
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    denom = float(np.linalg.norm(va) * np.linalg.norm(vb))
    if denom == 0.0:
        return 0.0
    return float(np.dot(va, vb) / denom)
