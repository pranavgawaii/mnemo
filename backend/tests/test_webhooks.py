"""Webhook subscriptions and delivery (CI tier, needs Postgres)."""

from __future__ import annotations

import hashlib
import hmac
import json

import httpx

from app.models.models import Webhook
from app.services import webhook_service
from tests.conftest import requires_db


@requires_db
def test_create_webhook_returns_secret_once(client, namespace):
    created = client.post(
        "/v1/webhooks",
        json={"namespace": namespace, "url": "https://hooks.example/mnemo"},
    )
    assert created.status_code == 201
    body = created.json()
    assert len(body["secret"]) == 64  # 32 bytes hex
    assert body["url"] == "https://hooks.example/mnemo"

    # Listing never leaks the secret.
    listed = client.get(f"/v1/webhooks?namespace={namespace}").json()
    assert listed["total"] == 1
    assert "secret" not in listed["items"][0]


@requires_db
def test_invalid_url_rejected(client, namespace):
    response = client.post(
        "/v1/webhooks",
        json={"namespace": namespace, "url": "ftp://not-http.example/x"},
    )
    assert response.status_code == 422


@requires_db
def test_flagging_enqueues_delivery_jobs(client, namespace):
    client.post(
        "/v1/webhooks",
        json={"namespace": namespace, "url": "https://hooks.example/mnemo"},
    )
    client.post("/v1/memories", json={"content": "Riya lives in Pune", "namespace": namespace})
    client.post(
        "/v1/memories",
        json={"content": "Riya no longer lives in Pune", "namespace": namespace},
    )

    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models.models import Job

    with SessionLocal() as db:
        jobs = list(
            db.execute(select(Job).where(Job.kind == "webhook.deliver")).scalars().all()
        )
    assert len(jobs) == 1
    payload = jobs[0].payload
    assert payload["body"]["event"] == "contradiction.flagged"
    assert payload["body"]["namespace"] == namespace
    assert payload["body"]["contradiction"]["new_content"].startswith("Riya")


@requires_db
def test_delivery_posts_signed_body(client, monkeypatch):

    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models.models import Job

    client.post(
        "/v1/webhooks",
        json={"namespace": "wh-test-ns", "url": "https://hooks.example/mnemo"},
    )
    with SessionLocal() as db:
        webhook = db.execute(select(Webhook)).scalars().one()
        secret, url = webhook.secret, webhook.url

    sent: dict = {}

    def fake_post(url_: str, *, content: bytes, headers: dict, timeout: float) -> object:
        sent["url"] = url_
        sent["body"] = content
        sent["headers"] = headers
        sent["timeout"] = timeout

        class _Resp:
            status_code = 200

            def raise_for_status(self) -> None:
                pass

        return _Resp()

    monkeypatch.setattr(httpx, "post", fake_post)

    with SessionLocal() as db:
        job = db.execute(select(Job).where(Job.kind == "webhook.deliver")).scalars().one()
        webhook_service.deliver_job(job.payload)

    assert sent["url"] == url
    expected = hmac.new(secret.encode(), sent["body"], hashlib.sha256).hexdigest()
    assert sent["headers"]["X-Mnemo-Signature"] == expected
    assert json.loads(sent["body"])["event"] == "contradiction.flagged"
    assert sent["timeout"] == 5.0


@requires_db
def test_delivery_failure_raises_for_retry(client, monkeypatch):
    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models.models import Job

    client.post(
        "/v1/webhooks",
        json={"namespace": "wh-fail-ns", "url": "https://hooks.example/mnemo"},
    )

    def fake_post(url_: str, **kwargs: object) -> object:
        class _Resp:
            status_code = 500

            def raise_for_status(self) -> None:
                raise AssertionError("raise_for_status reached")  # pragma: no cover

        return _Resp()

    monkeypatch.setattr(httpx, "post", fake_post)

    with SessionLocal() as db:
        job = db.execute(select(Job).where(Job.kind == "webhook.deliver")).scalars().one()
        try:
            webhook_service.deliver_job(job.payload)
            raised = False
        except RuntimeError:
            raised = True
    assert raised, "non-2xx must raise so the outbox retries"


@requires_db
def test_deactivate_stops_notifications(client, namespace):
    created = client.post(
        "/v1/webhooks",
        json={"namespace": namespace, "url": "https://hooks.example/mnemo"},
    ).json()
    client.delete(f"/v1/webhooks/{created['id']}")

    client.post("/v1/memories", json={"content": "Riya lives in Pune", "namespace": namespace})
    client.post(
        "/v1/memories",
        json={"content": "Riya no longer lives in Pune", "namespace": namespace},
    )

    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models.models import Job

    with SessionLocal() as db:
        jobs = db.execute(select(Job).where(Job.kind == "webhook.deliver")).scalars().all()
    assert list(jobs) == [], "inactive webhooks must not receive deliveries"
