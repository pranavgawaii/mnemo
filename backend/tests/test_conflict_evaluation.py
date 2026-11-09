"""Challenge labels, metrics and failure accounting are separate from accuracy claims."""

from __future__ import annotations

import json
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest

from evaluation.conflicts import DATASET, confusion, load_challenges, main, run_challenges


def test_authored_challenges_include_positive_negative_and_unsupported_cases():
    data = load_challenges()
    assert len(data["cases"]) == 24
    assert sum(case["conflict"] for case in data["cases"]) == 12
    assert any(case["category"] == "unsupported-change" and case["conflict"] for case in data["cases"])
    assert "Not independently" in data["scope"]


@pytest.mark.parametrize("change", ["duplicate", "bad-label", "missing-text", "extra-field"])
def test_invalid_labels_fail_before_requests(tmp_path, change):
    data = json.loads(DATASET.read_text())
    if change == "duplicate":
        data["cases"][1] = data["cases"][0]
    elif change == "bad-label":
        data["cases"][0]["conflict"] = 1
    elif change == "missing-text":
        data["cases"][0]["incoming"] = " "
    else:
        data["cases"][0]["extra"] = True
    path = tmp_path / "cases.json"
    path.write_text(json.dumps(data))
    with pytest.raises(ValueError):
        load_challenges(path)


def test_confusion_keeps_misses_and_excludes_request_errors():
    results = [{"expected": expected, "flagged": flagged} for expected, flagged in
               [(True, True), (False, True), (True, False), (False, False), (True, None)]]
    metrics = confusion(results)
    assert metrics == {"completed": 4, "true_positive": 1, "false_positive": 1,
                       "false_negative": 1, "true_negative": 1, "precision": 0.5, "recall": 0.5}
    assert confusion([])["precision"] is confusion([])["recall"] is None


def test_request_errors_do_not_become_negative_predictions_and_created_facts_are_cleaned():
    class BrokenAPI:
        def __init__(self):
            self.created = []
            self.deleted = []

        def add_memory(self, content, **kwargs):
            if len(self.created) > len(self.deleted):
                raise httpx.ConnectError("private connection details")
            memory = SimpleNamespace(id=uuid4())
            self.created.append((memory.id, kwargs["namespace"]))
            return memory, []

        def delete_memory(self, memory_id, *, namespace):
            self.deleted.append((memory_id, namespace))

    api = BrokenAPI()
    report = run_challenges(api)
    assert report["completed"] == 0 and report["request_errors"] == 24
    assert not report["complete"] and report["cleanup_errors"] == 0
    assert report["false_negative"] == report["true_negative"] == 0
    assert api.created == api.deleted and len(set(namespace for _, namespace in api.created)) == 24
    encoded = json.dumps(report)
    assert "private connection" not in encoded and "Rohan lives" not in encoded


def test_cli_cannot_overwrite_labels(monkeypatch):
    monkeypatch.setenv("MNEMO_API_KEY", "test-only")
    original = DATASET.read_bytes()
    with pytest.raises(SystemExit) as failure:
        main(["--output", str(DATASET)])
    assert failure.value.code == 2 and DATASET.read_bytes() == original
