# Contributing

Mnemo contains a Next.js frontend, a FastAPI service and a Python SDK. Keep
changes focused on the relevant area; the frontend works without the API.

## Frontend

Use Node.js 20+ and pnpm 9 (the CI toolchain). From the repository root:

```bash
cd frontend
pnpm install
pnpm dev
pnpm typecheck
pnpm test:e2e
pnpm build
```

The frontend uses port 3005. Stop that process before switching between dev and
production. Test meaningful user behavior, keyboard access and narrow layouts.
Preserve the existing Outfit/Redaction typography and landing hero unless a
change explicitly calls for a new visual direction.

## Backend and SDK

Use Python 3.12+ and a virtual environment. From `backend/`:

```bash
pip install -r requirements-api.txt
python -m pytest tests/test_core.py tests/test_frontend_parity.py -q
python -m pytest tests/test_context_packing.py tests/test_access_policy.py tests/test_context_evaluation.py -q
python ../scripts/check-doc-examples.py
```

Integration tests need PostgreSQL with pgvector and an explicitly disposable
database named `mnemo_test_*`. They create and drop test tables. Configure
`MNEMO_TEST_DATABASE_URL` as described in [deployment](docs/deployment.md#integration-test-isolation);
ordinary application databases are not integration-test targets.

From `sdk/`, install the development dependencies and run the client tests:

```bash
pip install -e '.[dev]'
python -m pytest tests/ -q
```

## Documentation and contracts

After changing API contracts, run from `backend/`:

```bash
python ../scripts/export-api-schema.py
python ../scripts/check-doc-examples.py
```

Update behavior notes and SDK examples alongside contract changes. Label browser
simulations and illustrative responses clearly. Performance or quality claims
need reproducible evidence, recorded settings and limitations.

Keep screenshots in `docs/assets/`, third-party notices in `docs/licenses/`, and
user instructions in the product guides. Keep temporary plans outside the repository. The [frontend guide](docs/frontend.md)
describes the component boundaries.

To preview the language bar before a push, run `python scripts/language-report.py
--verify-origin --output /tmp/mnemo-languages.json` from the repository root. This
reports code bytes and per-file counts, verifies the committed baseline against
GitHub, and leaves the repository unchanged. It is a projection; GitHub Linguist
publishes the final language bar after a push to the default branch. Do not pad
source files or hide frontend languages to influence the chart.
