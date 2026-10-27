"""Metrics registry tests: pure logic plus the /metrics endpoint over HTTP."""

from __future__ import annotations

import pytest

from app.core.metrics import Histogram, MetricsRegistry


def test_counter_increments_per_label_set():
    reg = MetricsRegistry()
    counter = reg.counter("c_total", "help")
    counter.inc({"method": "GET", "status": "200"})
    counter.inc({"method": "GET", "status": "200"}, 2)
    counter.inc({"method": "POST", "status": "500"})
    assert counter.value({"method": "GET", "status": "200"}) == 3
    assert counter.value({"method": "POST", "status": "500"}) == 1
    assert counter.value({"method": "PUT", "status": "200"}) == 0


def test_counter_rejects_negative_amount():
    counter = MetricsRegistry().counter("c_total", "help")
    with pytest.raises(ValueError):
        counter.inc({}, -1)


def test_histogram_buckets_are_cumulative():
    hist = Histogram("h_seconds", "help", buckets=(0.1, 1.0))
    hist.observe({}, 0.05)
    hist.observe({}, 0.5)
    hist.observe({}, 5.0)
    # 0.05 and 0.5 fall into le=1.0; all three fall into +Inf.
    rendered = "\n".join(hist.render())
    assert 'h_seconds_bucket{le="1.0"} 2' in rendered
    assert 'h_seconds_bucket{le="+Inf"} 3' in rendered
    assert "h_seconds_count 3" in rendered
    assert "h_seconds_sum 5.55" in rendered


def test_render_includes_help_type_and_series():
    reg = MetricsRegistry()
    reg.counter("c_total", "Total.").inc({"path": "/health", "status": "200"})
    text = reg.render()
    assert "# HELP c_total Total." in text
    assert "# TYPE c_total counter" in text
    assert 'c_total{path="/health",status="200"} 1' in text
    assert text.endswith("\n")


def test_metrics_endpoint_reports_requests():
    from fastapi.testclient import TestClient

    from app.core.config import settings
    from app.main import app

    with TestClient(app) as client:
        client.headers.update({"X-API-Key": settings.mnemo_api_key})
        health = client.get("/health")
        assert health.status_code == 200
        body = client.get("/metrics").text
        assert 'http_requests_total{method="GET",path="/health",status="200"}' in body
