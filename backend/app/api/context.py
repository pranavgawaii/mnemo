"""Read-only context route, separate from memory mutations and administration."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.access import authorize_namespace
from app.api.deps import authenticate, require_scope
from app.db.session import get_db
from app.models.context import ContextRequest, ContextResponse
from app.services.context_service import build_context

router = APIRouter(prefix="/v1", tags=["context"], dependencies=[Depends(authenticate)])


@router.post("/context", response_model=ContextResponse, dependencies=[Depends(require_scope("read"))])
def agent_context(
    payload: ContextRequest, request: Request, db: Session = Depends(get_db),
) -> ContextResponse:
    """Retrieve bounded context with citations and per-candidate decisions.

    Does not resolve conflicts, mutate memories or call a generation model.
    The character budget applies to ``context``, not the complete JSON response.
    """
    authorize_namespace(request, payload.namespace)
    return build_context(db, payload)
