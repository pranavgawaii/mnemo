"""LLM-based contradiction verdict hook.

``app/core/contradiction.py`` defines an ``llm_check`` slot: a callable that,
given two memory contents and their similarity, returns ``(is_contradiction,
reason)`` — or ``None`` to defer to the negation-marker heuristic.

This module provides a provider for OpenAI-compatible chat-completions APIs
(self-hosted vLLM/Ollama included — point ``base_url`` at your own server). It
is OFF by default: ``MNEMO_CONTRADICTION_LLM_PROVIDER`` stays empty unless an
operator opts in, keeping the write path LLM-free for local development.

Failure semantics are deliberately boring: network errors, bad responses, or
timeouts all return ``None`` so the heuristic verdict stands. A slow or broken
LLM must never block or corrupt a memory write.
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING

from app.core.contradiction import LlmCheck

if TYPE_CHECKING:  # pragma: no cover
    from app.core.config import Settings

logger = logging.getLogger("mnemo.llm")

_PROMPT = (
    "Do these two statements contradict each other? Answer with JSON only: "
    '{{"contradiction": true|false, "reason": "..."}}.\n\nStatement A: {a}\n'
    "Statement B: {b}"
)


class OpenAiCompatibleProvider:
    """Classifies memory pairs via an OpenAI-compatible chat-completions API."""

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str = "https://api.openai.com/v1",
        timeout_seconds: float = 10.0,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def check(self, content_a: str, content_b: str, similarity: float) -> tuple[bool, str] | None:
        """Return (verdict, reason), or None when the API is unusable.

        The similarity argument is unused by the HTTP call but keeps the
        provider drop-in compatible with the ``LlmCheck`` slot.
        """
        del similarity
        try:
            import httpx

            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "user",
                            "content": _PROMPT.format(a=content_a, b=content_b),
                        }
                    ],
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                },
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return bool(parsed["contradiction"]), str(parsed.get("reason", "llm verdict"))
        except Exception as exc:  # noqa: BLE001 - any failure defers to the heuristic
            logger.warning("llm_check failed, deferring to heuristic: %s", exc)
            return None


def build_llm_check(settings: "Settings") -> LlmCheck | None:
    """Build the configured provider, or None when none is configured.

    Only the ``openai``-compatible provider exists today; the empty default
    means pure-heuristic contradiction detection.
    """
    provider_name = (settings.contradiction_llm_provider or "").strip().lower()
    if not provider_name:
        return None
    if provider_name != "openai":
        logger.warning("unknown contradiction_llm_provider '%s'; using heuristic", provider_name)
        return None
    if not settings.contradiction_llm_api_key:
        logger.warning("contradiction_llm_api_key is empty; using heuristic")
        return None

    provider = OpenAiCompatibleProvider(
        api_key=settings.contradiction_llm_api_key,
        model=settings.contradiction_llm_model,
        base_url=settings.contradiction_llm_base_url,
        timeout_seconds=settings.contradiction_llm_timeout_seconds,
    )
    return provider.check
