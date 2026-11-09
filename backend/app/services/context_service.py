"""Compose existing retrieval, conflict records and the pure context packer."""

from __future__ import annotations

import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.changes import current_statement
from app.core.context import ContextCandidate, ContextPolicy, pack_context
from app.models.context import (
    ContextCitationOut,
    ContextDecisionOut,
    ContextRequest,
    ContextResponse,
)
from app.models.models import Contradiction
from app.services import memory_service


def build_context(db: Session, payload: ContextRequest) -> ContextResponse:
    ranked = memory_service.search(
        db, query=payload.query, namespace=payload.namespace, limit=payload.candidate_limit,
        tags=payload.tags or None, keyword_weight=payload.keyword_weight, diversity=payload.diversity,
    )
    ids = [memory.id for memory, *_ in ranked]
    pending: set[uuid.UUID] = set()
    if ids:
        pairs = db.execute(select(
            Contradiction.new_memory_id, Contradiction.existing_memory_id,
        ).where(
            Contradiction.namespace == payload.namespace, Contradiction.status == "open",
            or_(Contradiction.new_memory_id.in_(ids), Contradiction.existing_memory_id.in_(ids)),
        )).all()
        pending = {memory_id for pair in pairs for memory_id in pair}
    candidates = [ContextCandidate(
        memory_id=memory.id, content=memory.content,
        current_statement=current_statement(memory.content),
        similarity=similarity, relevance_score=relevance, is_active=memory.is_active,
        expires_at=memory.expires_at, pending_review=memory.id in pending,
    ) for memory, similarity, relevance, _age in ranked]
    packed = pack_context(candidates, policy=ContextPolicy(
        max_chars=payload.max_chars, min_similarity=payload.min_similarity,
        current_values=payload.current_values, exclude_conflicts=payload.exclude_conflicts,
    ))
    return ContextResponse(
        query=payload.query, namespace=payload.namespace, status=packed.status,
        context=packed.context,
        citations=[ContextCitationOut.model_validate(item) for item in packed.citations],
        decisions=[ContextDecisionOut.model_validate(item) for item in packed.decisions],
        used_chars=packed.used_chars,
        max_chars=packed.max_chars, has_pending_review=packed.has_pending_review,
        candidate_count=len(candidates),
    )
