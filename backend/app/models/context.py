"""Public schemas for the optional agent-context read API."""

from __future__ import annotations

import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.context import ContextStatus, DecisionReason
from app.models.schemas import Tag


class ContextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=8000)]
    namespace: str = Field(default="default", min_length=1, max_length=128)
    candidate_limit: int = Field(default=30, ge=1, le=100)
    max_chars: int = Field(default=4000, ge=128, le=32000)
    min_similarity: float = Field(default=0.25, ge=-1, le=1, allow_inf_nan=False)
    current_values: bool = True
    exclude_conflicts: bool = True
    tags: list[Tag] = Field(default_factory=list, max_length=5)
    keyword_weight: float | None = Field(default=None, ge=0, le=1, allow_inf_nan=False)
    diversity: float = Field(default=0.0, ge=0, le=1, allow_inf_nan=False)


class ContextCitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    citation: str
    memory_id: uuid.UUID
    text: str
    source_content: str
    used_current_statement: bool
    similarity: float
    relevance_score: float
    pending_review: bool


class ContextDecisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    memory_id: uuid.UUID
    rank: int
    reason: DecisionReason
    citation: str | None = None


class ContextResponse(BaseModel):
    query: str
    namespace: str
    status: ContextStatus
    context: str
    citations: list[ContextCitationOut]
    decisions: list[ContextDecisionOut]
    used_chars: int
    max_chars: int
    has_pending_review: bool
    candidate_count: int
