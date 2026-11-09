# Persistent Python assistant

This example connects the real Mnemo API to a terminal assistant. It stores
application-approved facts, retrieves bounded context, pauses for explicit
conflict review, and preserves original source records. Reopening the same
namespace retrieves persisted facts from PostgreSQL.

## Run with the real backend

Start the API and pgvector database using the repository quickstart. Install the
SDK into a Python 3.12+ environment from the repository root:

```bash
pip install -e ./sdk
```

Issue a key restricted to your assistant namespace using an operator terminal:

```bash
cd backend
python -m app.cli keys create --label assistant --scopes read,write \
  --namespace assistant:pranav
```

Set its returned secret as `MNEMO_APP_KEY` in the application terminal. Keep the
operator key out of the application. Run from the repository root:

```bash
python sdk/examples/assistant.py --namespace assistant:pranav
```

Try this sequence:

```text
/remember Pranav lives in Bengaluru
Where does Pranav live?
/remember Pranav moved from Bengaluru to Pune
Where does Pranav live?
/review
/keep CONFLICT_UUID PUNE_MEMORY_UUID
Where does Pranav live?
/quit
```

Use the actual UUIDs printed by `/review`. The application does not automatically
keep the newest fact. Reopen the same command after quitting and ask the question
again to demonstrate persistence across client sessions.

The default **evidence mode** prints complete retrieved statements with citation
labels. It does not call a generation model. A fixed walkthrough is available
with `--demo` in a fresh, empty namespace covered by the application key:

```bash
python sdk/examples/assistant.py --namespace assistant:pranav --demo
```

This scripted demonstration explicitly keeps the Pune statement after showing
the pending-review state. It refuses a namespace with existing active memories
and never resets or deletes someone else's data. Use a separate empty namespace
and corresponding grant if you have already run the interactive sequence.

## Add an actual local generation model

With Ollama running and a model already installed, use its exact model name:

```bash
python sdk/examples/assistant.py --namespace assistant:pranav \
  --mode ollama --model YOUR_INSTALLED_MODEL
```

The adapter uses Ollama's native `/api/chat`, bounded output and JSON Schema.
Question and memory evidence are sent as user data, separate from system
instructions. An answer must reference retrieved citation labels. Missing or
invented references, malformed JSON and model-server failures are rejected.
There is no silent fallback to evidence mode or a fake generated answer.
See the [Ollama chat contract](https://docs.ollama.com/api/chat).

The example's conservative policy pauses generation when any retrieved candidate
has pending review. Empty results and budget exhaustion also skip model calls.
Citation checks establish that references exist, not that generated prose is
true or entailed. Prompt injection and answer correctness still require separate
evaluation. Writes are explicit `/remember` actions; conversation text is not
automatically extracted into memories.

## Verification scope

SDK tests validate model requests, abstention, error paths and citation contracts
with a fake transport. Backend integration tests run the complete city-change
sequence through the real encoder and pgvector and reopen a client to verify
persistence. A successful evidence-mode run does not establish live LLM quality.
