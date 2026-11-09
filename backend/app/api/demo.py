"""Read-only availability probe for the public website's private demo key."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import authenticate, require_scope
from app.core.embedding import is_model_loaded
from app.db.session import get_db
from app.models.models import Memory
from app.models.schemas import DemoAvailability

router = APIRouter(prefix="/v1/demo", tags=["demo"], dependencies=[Depends(authenticate)])


@router.get("/availability", dependencies=[Depends(require_scope("read")), Depends(require_scope("write"))])
def availability(db: Session = Depends(get_db)) -> DemoAvailability:
    """Check key scopes and the memory table without writing or loading a model.

    A cold encoder is reported explicitly; this probe does not promise that an
    embedding operation will succeed or measure its latency.
    """
    try:
        db.execute(select(Memory.id).limit(0))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Demo storage unavailable.") from exc
    return DemoAvailability(status="available", embedding="warm" if is_model_loaded() else "cold")
