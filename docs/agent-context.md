# Agent context and evaluation

Mnemo stores facts and retrieves evidence; your application decides when to call
a model and what an answer should contain. `POST /v1/context` adds a Python-owned
selection layer over the existing search path. It does not generate an answer,
resolve a conflict or verify that a stored statement is true.

## Give each application an appropriate key

An operator can issue a key limited to exact namespaces:

```bash
curl -sS http://localhost:8000/v1/keys \
  -H "X-API-Key: $MNEMO_API_KEY" -H 'Content-Type: application/json' \
  -d '{"label":"assistant","scopes":["read","write"],"namespaces":["assistant:riya"]}'
```

Use the returned secret in the application, not the bootstrap key. The secret
is returned once. Add a future ISO 8601 `expires_at` with a timezone if access
should expire. Rotation changes the secret and retains the grant and expiry.

Namespace grants are case-sensitive exact names, including names containing
punctuation. They are not glob patterns or prefixes. A restricted key cannot
access global admin routes. A mixed bulk request is rejected before any writes
when one of its items is outside the grant. ID reads, updates and deletes return
404 for foreign IDs whether or not the caller supplies `namespace`.

An omitted/null grant retains unrestricted access for backward compatibility;
the bootstrap key remains unrestricted. This is API access control, without
database row-level security or a tenant account management system. The operator
must provision grants correctly and keep global keys out of client applications.

The operator-local CLI supports the same grant:

```bash
cd backend
python -m app.cli keys create --label assistant --scopes read,write \
  --namespace assistant:riya
```

CLI database commands run with database privileges and bypass HTTP key checks.
They are operator tools, not a client-facing access boundary.

## Retrieve bounded context

Install the SDK from the repository with `pip install -e ./sdk` and use Python 3.12+:

```python
import os
from mnemo import MnemoClient

with MnemoClient(
    base_url="http://localhost:8000",
    api_key=os.environ["MNEMO_APP_KEY"],
    default_namespace="assistant:riya",
) as client:
    result = client.context(
        "Where does Riya live?",
        max_chars=2000,
        min_similarity=0.35,
    )
    if result.status == "ready":
        print(result.context)
        for citation in result.citations:
            print(citation.citation, citation.memory_id, citation.source_content)
    elif result.status == "needs_review":
        print("Review the conflicting facts before answering.")
```

`AsyncMnemoClient.context` accepts the same options and returns the same models.
The SDK requires a server with this endpoint; it does not fall back to unsafe or
unbounded search when an older server returns 404.

The corresponding request is:

```bash
curl -sS http://localhost:8000/v1/context \
  -H "X-API-Key: $MNEMO_APP_KEY" -H 'Content-Type: application/json' \
  -d '{"namespace":"assistant:riya","query":"Where does Riya live?","max_chars":2000}'
```

The read-scoped response contains:

| Field | Meaning |
| --- | --- |
| `context` | Header plus JSONL records containing citation labels, memory IDs and selected text |
| `citations` | Selected text, original source, projection flag, similarity, relevance and review flag |
| `decisions` | One ranked decision per retrieved candidate, with an inclusion or exclusion reason |
| `used_chars` / `max_chars` | Exact Unicode character usage and configured limit for `context` |
| `candidate_count` | Number of candidates returned by retrieval, at most `candidate_limit` |
| `has_pending_review` | Whether a retrieved candidate belongs to an open conflict |

The default limit is 4,000 characters; accepted budgets range from 128 to 32,000.
The budget includes JSON escaping, citation IDs, the header and separators. It
does not bound the full response body, including source strings in `citations`,
and it is not a token budget. Use your model's tokenizer when reserving tokens.

Packing follows retrieval order. It skips inactive, expired, weak, disputed,
empty and duplicate facts. It never truncates a statement to fit, because that
could remove a negation or change its meaning. A large hit can be skipped while
a smaller later hit still fits. Duplicate text is compared after whitespace
normalization and casefolding; this is not semantic deduplication.

The defaults use a current-statement projection when supported, but preserve the
full source in each citation. Set `current_values=false` to use source text.
`exclude_conflicts=false` explicitly includes disputed facts with review flags;
ordinary agent tools keep this option enabled.

| Status | Application action |
| --- | --- |
| `ready` | Use the selected evidence; inspect `has_pending_review` for omitted disputed candidates |
| `empty` | Ask for a fact or answer without claiming memory evidence |
| `needs_review` | No safe selected facts remain and a qualifying candidate needs review |
| `budget_exhausted` | No whole eligible fact fits; increase the budget or refine the query |

Context retrieval and conflict reads share a namespace lock while the request
runs; concurrent memory mutations take the exclusive counterpart. Multiple
context readers can proceed together. The returned response is not an immutable
snapshot after the request completes, and TTL eligibility is time dependent.
`has_pending_review` covers the retrieved candidates, not every fact in the namespace.

## Use provider-neutral tools

```python
from mnemo.agent import AgentMemory

tools = AgentMemory(client, namespace="assistant:riya", max_chars=2000)
definitions = tools.definitions()  # Wrap these JSON Schemas for your model provider.
result = tools.call("mnemo_recall", {"query": "Where does Riya live?"})
```

The snippet uses the open client from the previous example. Your application
owns the model loop and tool-call routing. Namespace, evidence threshold and
budget are fixed by application configuration, not model-supplied arguments.
Unknown tools and extra arguments are rejected before HTTP requests are sent.

Writes are disabled by default. `allow_writes=True` adds `mnemo_remember` for
facts your application has approved for storage. That tool returns conflict IDs
for explicit review; it never chooses a winner or exposes key administration.
API failures propagate as typed SDK exceptions rather than being hidden as
empty evidence. Treat all stored content as untrusted input even inside JSON:
serialization separates data but does not solve prompt injection.

## Evaluate selection on your own labels

Prepare namespaces and record real memory IDs first. Each JSONL case names an
existing namespace and at least one expected result, forbidden ID or status:

```json
{"id":"review-pending","namespace":"assistant:riya","query":"Where does Riya live?","expected_status":"needs_review","expected_memory_ids":[]}
```

For a resolved change, label the winning UUID under `expected_memory_ids` and the
archived UUID under `forbidden_memory_ids`. These labels must be real UUIDs from
your prepared data. The runner never seeds, clears, resolves or deletes memories.

```bash
cd backend
python -m evaluation.run --cases labelled.jsonl \
  --base-url http://localhost:8000 --output context-report.json
```

The runner reads `MNEMO_API_KEY` from the environment. Prefer a read-only key
whose namespace grants cover the cases. Reports contain case IDs, selected IDs,
metrics and error codes, without stored text or query content. A failed case
returns exit code 1; an input/transport/authentication error returns 2.

Expected IDs are an exhaustive annotated relevance set when present. Unlabelled
cases contribute no precision/recall score. An explicit empty expected list
asserts that no fact should be selected. Precision is undefined for no selections;
recall is undefined for no relevant IDs. Aggregates show labelled case counts.
The default runner requires full recall and precision on labelled cases, no
forbidden hits, matching labelled statuses and a consistent wire contract.
`--min-recall` and `--min-precision` adjust their respective thresholds. Reports
include the case-file hash and measurement time. A result with every gold fact
plus many irrelevant facts no longer passes a strict precision gate.

These checks measure context selection and reviewed-state behaviour. They do not
measure generated-answer correctness, factual truth or production throughput.

The [complete assistant](../sdk/examples/README.md) demonstrates persistent
before/review/after behaviour and optional local answer generation. The
[query-only holdout and lifecycle runners](../backend/benchmark/README.md#query-only-holdout)
provide separate retrieval and state-transition evidence. Keep those scopes
separate when explaining results.
