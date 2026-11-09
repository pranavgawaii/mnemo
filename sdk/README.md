# Mnemo Python SDK

Typed client for the [Mnemo](https://github.com/pranavgawaii/mnemo) semantic
memory API: store facts about people, projects and preferences, search them by
meaning, and resolve contradictions when facts change.

```bash
pip install mnemo-sdk
```

## Quickstart (sync)

```python
from mnemo import MnemoClient

with MnemoClient(base_url="https://mnemo.internal", api_key="mnemo_...") as client:
    client.add_memory("Riya lives in Bengaluru", importance=3, tags=["people"])
    for hit in client.search("where does Riya live").hits:
        print(hit.memory.content, round(hit.relevance_score, 3))
```

## Quickstart (async)

```python
from mnemo import AsyncMnemoClient

async with AsyncMnemoClient(base_url="https://mnemo.internal", api_key="mnemo_...") as client:
    await client.add_memory("Shipped mnemo v1")
    hits = (await client.search("recent launches")).hits
```

## Agent-memory patterns

```python
from mnemo.helpers import remember, recall, forget, context_block

# Conflicts stay open for review by default. Pass auto_resolve=True to opt into last-write-wins.
memory, conflicts = remember(client, "Riya moved to Pune", tags=["people"])

memories = recall(client, "where does Riya live", limit=5)
context = context_block(client, "Riya's city")   # "" when nothing matches
forget(client, memory.id)
```

## Errors

Every failure raises a typed exception from `mnemo.errors`:

| Exception | Status | Meaning |
|---|---|---|
| `AuthenticationError` | 401 | missing/invalid API key |
| `ForbiddenError` | 403 | key lacks the required scope |
| `NotFoundError` | 404 | resource does not exist |
| `ConflictError` | 409 | write rejected (near-duplicate in reject mode) |
| `ValidationError` | 422 | payload failed validation |
| `RateLimitError` | 429 | key hit its rate limit (`exc.retry_after`) |
| `ServerError` | 5xx | transient - safe to retry GETs |

GET requests retry automatically on 429/5xx/network errors with backoff;
writes never retry (they are not idempotent).

### Current values and source records

The Python API derives `memory.current_statement` for supported explicit
transitions. `memory.content` always retains the complete source text. Older
servers and unsupported text leave `current_statement` as `None`. To prefer
current values when formatting agent context:

```python
context = context_block(client, "Riya's city", current_values=True)
```

This is a display projection, not a truth check or conflict resolution. Review
open contradictions before handing conflicting facts to an agent. The default
context formatter continues to use source content.

## Cited context and agent tools

`client.context(query, max_chars=2000)` and `await async_client.context(query)`
use `POST /v1/context`. They return selected citations, original source text,
current-statement flags, exact character usage and a per-candidate decision trace.
Open conflicts are excluded by default; facts are never truncated to fit.
The limit applies to the context string, not the full response or model tokens.

`mnemo.agent.AgentMemory` exposes provider-neutral JSON Schema tools with a fixed
namespace and budget. Writes are opt-in and never resolve conflicts automatically.
Use a namespace-restricted key as the actual server-side access boundary.
See the [complete guide](../docs/agent-context.md) for examples and labelled evaluation.
