"""Minimal Prometheus-compatible metrics, dependency-free.

A tiny registry with counters and histograms that renders the Prometheus text
exposition format. Hand-rolled instead of pulling ``prometheus-client`` so the
service keeps one small dependency tree — and so the rendering/scoring rules
stay unit-testable without any infrastructure.

Usage::

    from app.core.metrics import registry

    registry.counter("http_requests_total", "Total HTTP requests.").inc(
        {"method": "POST", "path": "/v1/memories", "status": "201"}
    )
    text = registry.render()  # body for GET /metrics
"""

from __future__ import annotations

from collections.abc import Iterator

# Default buckets span HTTP request latencies; +Inf is implicit in rendering.
DEFAULT_BUCKETS: tuple[float, ...] = (
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
)

LabelKey = tuple[tuple[str, str], ...]


def _label_key(labels: dict[str, str] | None) -> LabelKey:
    return tuple(sorted((labels or {}).items()))


def _escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def _render_labels(labels: dict[str, str] | None, extra: dict[str, str] | None = None) -> str:
    merged: dict[str, str] = {**(labels or {}), **(extra or {})}
    if not merged:
        return ""
    inner = ",".join(f'{k}="{_escape(v)}"' for k, v in sorted(merged.items()))
    return "{" + inner + "}"


class Counter:
    """Monotonically increasing counter with optional labels."""

    def __init__(self, name: str, help_text: str) -> None:
        self.name = name
        self.help = help_text
        self._values: dict[LabelKey, float] = {}
        self._label_sets: dict[LabelKey, dict[str, str]] = {}

    def inc(self, labels: dict[str, str] | None = None, amount: float = 1.0) -> None:
        if amount < 0:
            raise ValueError("counters can only increase")
        key = _label_key(labels)
        self._label_sets[key] = dict(labels or {})
        self._values[key] = self._values.get(key, 0.0) + amount

    def value(self, labels: dict[str, str] | None = None) -> float:
        return self._values.get(_label_key(labels), 0.0)

    def render(self) -> Iterator[str]:
        yield f"# HELP {self.name} {self.help}"
        yield f"# TYPE {self.name} counter"
        for key, value in sorted(self._values.items()):
            labels = self._label_sets[key]
            yield f"{self.name}{_render_labels(labels)} {value}"


class Histogram:
    """Cumulative-bucket histogram with optional labels (+Inf bucket implicit)."""

    def __init__(self, name: str, help_text: str, buckets: tuple[float, ...] = DEFAULT_BUCKETS) -> None:
        self.name = name
        self.help = help_text
        self.buckets = buckets
        self._bucket_counts: dict[LabelKey, list[int]] = {}
        self._sums: dict[LabelKey, float] = {}
        self._counts: dict[LabelKey, int] = {}
        self._label_sets: dict[LabelKey, dict[str, str]] = {}

    def observe(self, labels: dict[str, str] | None, value: float) -> None:
        key = _label_key(labels)
        self._label_sets[key] = dict(labels or {})
        counts = self._bucket_counts.setdefault(key, [0] * len(self.buckets))
        for i, bound in enumerate(self.buckets):
            if value <= bound:
                counts[i] += 1
        self._sums[key] = self._sums.get(key, 0.0) + value
        self._counts[key] = self._counts.get(key, 0) + 1

    def render(self) -> Iterator[str]:
        yield f"# HELP {self.name} {self.help}"
        yield f"# TYPE {self.name} histogram"
        for key in sorted(self._label_sets):
            labels = self._label_sets[key]
            counts = self._bucket_counts[key]
            for bound, count in zip(self.buckets, counts, strict=True):
                bucket_labels = _render_labels(labels, {"le": repr(bound)})
                yield f"{self.name}_bucket{bucket_labels} {count}"
            inf_labels = _render_labels(labels, {"le": "+Inf"})
            yield f"{self.name}_bucket{inf_labels} {self._counts[key]}"
            yield f"{self.name}_sum{_render_labels(labels)} {self._sums[key]}"
            yield f"{self.name}_count{_render_labels(labels)} {self._counts[key]}"


class MetricsRegistry:
    """Holds every named counter/histogram; render() produces the /metrics body."""

    def __init__(self) -> None:
        self._counters: dict[str, Counter] = {}
        self._histograms: dict[str, Histogram] = {}

    def counter(self, name: str, help_text: str) -> Counter:
        if name not in self._counters:
            self._counters[name] = Counter(name, help_text)
        return self._counters[name]

    def histogram(self, name: str, help_text: str) -> Histogram:
        if name not in self._histograms:
            self._histograms[name] = Histogram(name, help_text)
        return self._histograms[name]

    def render(self) -> str:
        lines: list[str] = []
        for counter in self._counters.values():
            lines.extend(counter.render())
        for histogram in self._histograms.values():
            lines.extend(histogram.render())
        return "\n".join(lines) + "\n"


# Process-wide registry. The API middleware writes here; /metrics reads here.
registry = MetricsRegistry()
