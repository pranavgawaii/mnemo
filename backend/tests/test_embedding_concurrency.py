"""Encoder initialization must be single-flight and invalid vectors rejected."""

import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

import numpy as np
import pytest

from app.core import embedding
from app.core.config import settings


def test_concurrent_cold_calls_only_construct_one_model(monkeypatch):
    count = 0
    barrier = threading.Barrier(8)
    constructed = threading.Event()
    release = threading.Event()

    def model(name):
        nonlocal count
        count += 1
        constructed.set()
        assert release.wait(timeout=5)
        return object()

    monkeypatch.setitem(
        sys.modules, "sentence_transformers", SimpleNamespace(SentenceTransformer=model)
    )
    embedding._cached_model.cache_clear()

    def load():
        barrier.wait(timeout=5)
        return embedding._load_model()

    try:
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(load) for _ in range(8)]
            assert constructed.wait(timeout=5)
            release.set()
            models = [future.result(timeout=5) for future in futures]
        assert count == 1 and all(model is models[0] for model in models)
        assert embedding.is_model_loaded()
    finally:
        release.set()
        embedding._cached_model.cache_clear()


@pytest.mark.parametrize("bad", ["nan", "inf", "zero", "matrix", "dimension"])
def test_invalid_encoder_outputs_cannot_reach_pgvector(monkeypatch, bad):
    vector = np.ones(settings.embedding_dim, dtype=np.float32)
    if bad == "nan":
        vector[0] = np.nan
    elif bad == "inf":
        vector[0] = np.inf
    elif bad == "zero":
        vector[:] = 0
    elif bad == "matrix":
        vector = vector.reshape(1, -1)
    else:
        vector = vector[:-1]
    monkeypatch.setattr(
        embedding, "_load_model", lambda: SimpleNamespace(encode=lambda *args, **kwargs: vector)
    )
    with pytest.raises(ValueError, match="Embedding"):
        embedding.embed("test")
