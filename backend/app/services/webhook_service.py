"""Webhook subscriptions and delivery.

Subscribers register a URL per namespace; when a contradiction is flagged in
that namespace, one ``webhook.deliver`` outbox job is enqueued in the *same
transaction as the flag* (outbox pattern — delivery can never be lost after a
commit), and the background worker POSTs the event with an HMAC signature:

    X-Mnemo-Signature: hex(hmac_sha256(webhook.secret, body))

Delivery failures raise so the job runner retries with backoff.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
import uuid
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.models import Contradiction, Memory, Webhook
from app.services import job_service

logger = logging.getLogger("mnemo.webhooks")

DELIVER_KIND = "webhook.deliver"


def create_webhook(db: Session, *, namespace: str, url: str) -> Webhook:
    """Register a subscriber. The signing secret is generated server-side."""
    row = Webhook(
        namespace=namespace,
        url=str(url),
        secret=secrets.token_hex(32),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_webhooks(db: Session, *, namespace: str | None = None) -> list[Webhook]:
    stmt = select(Webhook).order_by(Webhook.created_at)
    if namespace is not None:
        stmt = stmt.where(Webhook.namespace == namespace)
    return list(db.execute(stmt).scalars().all())


def get_webhook(db: Session, *, webhook_id: uuid.UUID) -> Webhook | None:
    return db.get(Webhook, webhook_id)


def deactivate_webhook(db: Session, *, webhook_id: uuid.UUID) -> Webhook | None:
    row = db.get(Webhook, webhook_id)
    if row is None:
        return None
    row.is_active = False
    db.commit()
    db.refresh(row)
    return row


def notify_contradiction_flagged(
    db: Session, *, namespace: str, contradiction: Contradiction
) -> int:
    """Enqueue one delivery job per active subscriber. Returns the job count.

    Called inside the flagging transaction; the jobs commit together with the
    contradiction (outbox).
    """
    subscribers = db.execute(
        select(Webhook).where(Webhook.namespace == namespace, Webhook.is_active.is_(True))
    ).scalars().all()
    if not subscribers:
        return 0

    new_memory = db.get(Memory, contradiction.new_memory_id)
    existing_memory = db.get(Memory, contradiction.existing_memory_id)
    body_payload = {
        "event": "contradiction.flagged",
        "namespace": namespace,
        "contradiction": {
            "id": str(contradiction.id),
            "similarity": contradiction.similarity,
            "reason": contradiction.reason,
            "new_memory_id": str(contradiction.new_memory_id),
            "existing_memory_id": str(contradiction.existing_memory_id),
            "new_content": new_memory.content if new_memory else None,
            "existing_content": existing_memory.content if existing_memory else None,
        },
    }
    for subscriber in subscribers:
        job_service.enqueue(
            db,
            kind=DELIVER_KIND,
            payload={"webhook_id": str(subscriber.id), "body": body_payload},
        )
    return len(subscribers)


def sign(secret: str, body: bytes) -> str:
    """HMAC-SHA256 of the exact bytes sent (hex digest)."""
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def build_request(webhook: Webhook, body_payload: dict[str, Any]) -> tuple[str, bytes, dict[str, str]]:
    """(url, body_bytes, headers) for one delivery — split out for tests."""
    body = json.dumps(body_payload, separators=(",", ":")).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-Mnemo-Event": "contradiction.flagged",
        "X-Mnemo-Signature": sign(webhook.secret, body),
    }
    return webhook.url, body, headers


def deliver_job(payload: dict[str, Any]) -> None:
    """Outbox handler: POST the event; raise to trigger outbox retries."""
    webhook_id = uuid.UUID(str(payload["webhook_id"]))
    body_payload = payload["body"]

    with SessionLocal() as db:
        webhook = db.get(Webhook, webhook_id)
        if webhook is None or not webhook.is_active:
            logger.info("webhook %s gone or inactive; dropping delivery", webhook_id)
            return
        url, body, headers = build_request(webhook, body_payload)

    response = httpx.post(
        url, content=body, headers=headers, timeout=settings.webhook_timeout_seconds
    )
    if response.status_code >= 300:
        raise RuntimeError(f"webhook endpoint returned {response.status_code}")


def register_handler() -> None:
    job_service.register(DELIVER_KIND, deliver_job)


# Import-time registration so the API process and the CLI both deliver.
register_handler()
