# Release commit sequence

Prepared 9 November 2026. Six project-focused commits on `main`, covering SDK,
API reliability, evaluation, frontend, repository documentation and CI.

## Commit order

Create **six commits directly on `main`**, in the order below. The checkout is
already on `main`. Keep all existing unrelated work intact. Keep release notes
under Unreleased; this plan does not create a version bump, release tag or
deployment. No additional branch or pull request is part of the workflow.

The reviewed tree contained 124 changed tracked entries and 114 untracked files
before these planning notes were updated. Many entries are component and design
reference moves. The assignment below covers those paths; this is a plan for the
whole working tree, including earlier backend and SDK repairs.

| Order | Exact subject | Purpose |
| --- | --- | --- |
| 1 | `fix(sdk): align parsing, expiry updates and conflict handling` | Repair client behavior before backend-to-SDK regression tests land. |
| 2 | `fix(api): harden memory writes, permissions and job recovery` | Land API repairs, recoverable job leases and migration 0013 together. |
| 3 | `fix(benchmark): correct metrics and publish policy comparisons` | Repair evaluation and check in the reproducible comparison. |
| 4 | `feat(web): rebuild the docs and interactive memory playground` | Land the frontend domain migration and its dependent routes, state and tests atomically. |
| 5 | `docs(repo): refresh product guides and repository navigation` | Make repository-facing guides and planning history match the product. |
| 6 | `ci: validate docs contracts and retrieval regressions` | Enable the remaining cross-project validation in CI. |

Conventional subjects are lowercase, imperative and scoped where helpful.
Descriptions should explain the final behavior and validation, with no chat
history or unsupported readiness claims. Use the existing Git author configuration.
Commit subjects and bodies describe the project only: no tool attribution,
generated-by text or added co-author trailers.

## 1. Python SDK contract repairs

**Subject:** `fix(sdk): align parsing, expiry updates and conflict handling`

Files: the changes under `sdk/`, including its README, sync/async clients,
`_parsing.py`, `helpers.py`, `test_helpers.py` and new `test_wire_contract.py`.

Suggested body:

```text
Parse nested contradiction responses and preserve conflict review by default.
Honor Retry-After and distinguish clearing expiry from leaving it unchanged
in both clients.

Cover response parsing, expiry payloads, retry delays and helper behavior.
```

Validation: run the SDK suite with its documented development dependencies.
This commit comes first because the backend regression suite now exercises
`MnemoClient` against real API conflict responses.

## 2. API and worker reliability

**Subject:** `fix(api): harden memory writes, permissions and job recovery`

Include:

- Changed backend application code under `backend/app/`.
- `backend/alembic/versions/0013_job_leases.py` together with the Job model,
  lease configuration and worker/service changes.
- `backend/.env.example`, `backend/pyproject.toml` and
  `backend/requirements-api.txt`.
- Backend test changes: `conftest.py`, `test_jobs.py`, `test_middleware.py`
  and new `test_regressions.py`.
- `scripts/export-api-schema.py` and `public/openapi.json`.
- **Only the disposable-database configuration hunks** from
  `.github/workflows/ci.yml`: job environment, database name, health check
  and the full-suite DATABASE_URL. Leave the new validation steps for commit 6.

Suggested body:

```text
Enforce read/admin scopes, cap streamed request bodies and validate request IDs.
Preserve bulk expiry, recover failed bulk transactions and exclude expired
facts from duplicate and conflict checks.

Serialize conflict resolution and keep webhook enqueueing transactional.
Recover expired job leases and fence stale workers with migration 0013.
Export the API schema and require explicitly disposable integration databases.
```

Keep migration, runtime behavior and their regression coverage in this commit.
`backend/tests/test_frontend_parity.py` belongs to commit 4 because its new
source path is created there. Benchmark tests belong to commit 3.

Validation: Ruff, mypy, backend pure tests and full pgvector integration tests;
exercise migration 0013 on a disposable database. Run these checks in an isolated
checkout/database during execution; do not start services as part of this plan.

## 3. Retrieval evidence

**Subject:** `fix(benchmark): correct metrics and publish policy comparisons`

Include:

- Changes under `backend/benchmark/`, including new `report.py` and README.
- `backend/tests/test_benchmark_metrics.py` and `backend/tests/test_gate.py`.
- `public/benchmark-results.json`.

Suggested body:

```text
Correct NDCG normalization and benchmark gate handling.
Compare raw cosine, base relevance and keyword-weighted retrieval using the
same corpus and real search path.

Publish the saved results with model, dataset hash, settings and environment.
Record that raw cosine wins this small in-sample comparison.
```

Validation: benchmark metric/gate tests, then the regression gate against a
throwaway benchmark namespace. Reproducing the public snapshot is a separate
explicit step: its report command resets the dataset's benchmark namespace and
changes measurement timestamps. Do not regenerate it incidentally while staging.

## 4. Frontend migration and experience

**Subject:** `feat(web): rebuild the docs and interactive memory playground`

Include:

- All changed `app/` routes, page metadata and shared stylesheet.
- New domain folders under `components/`, plus removals of the old component
  paths and obsolete components.
- `hooks/`, all changed/new `lib/` files and removals of the old library paths.
- `package.json` and `pnpm-lock.yaml` together; `tsconfig.json` and `.vercelignore`.
- `tests/e2e/site.spec.ts` and `backend/tests/test_frontend_parity.py`.
- `scripts/check-doc-examples.py` and `docs/frontend.md`.
- The `landing-kit/` removal and `docs/design-reference/` archive together,
  including bundled font licenses. The runtime exclusion belongs here too.
- `docs/licenses/primer-octicons.txt`, accompanying the navbar asset.

Suggested body:

```text
Organize the site by layout, landing, docs, playground and shared UI domains.
Present five landing sections and four documentation pages while retaining
the established hero and typography.

Keep time/ranking controls visible and explain actual rank movements.
Use one returned-context list, expanded fact/review/trace views and a handoff
summary. Preserve stable previews without inner playground scrolling.

Highlight Bash, Python and JSON examples and expand architecture/API views.
Cover mobile layouts, keyboard access, copying, review and retrieval flows.
```

This is intentionally one atomic frontend migration. Its imports, deleted paths,
new routes, shared state, archived design kit and source-parity test depend on
one another. Splitting it into independently buildable frontend commits would
require preparing and testing intermediate implementations, which have not been
created. Do not make a folder-move-only commit from the present diff.

Validation: frozen dependency install using CI's Node/pnpm toolchain, typecheck,
production build, all browser regressions, source parity and mocked docs examples.
Review moves with Git rename detection. Keep hero/font changes limited to those
already present before the latest visual pass; do not introduce new edits while
staging. The latest pass verified the hero and font files remained unchanged.

## 5. Repository-facing documentation

**Subject:** `docs(repo): refresh product guides and repository navigation`

Include:

- Root `README.md`, `CONTRIBUTING.md` and `CHANGELOG.md`.
- `docs/README.md`, API/architecture/deployment guides and the three existing
  staged uppercase-to-lowercase guide renames.
- `docs/assets/overview.jpg` and planning/history documents in `docs/internal/`.
- Removal of the former top-level `docs/commit-plan.md`; retain its old design
  plan in `docs/internal/implementation-history.md`.

`docs/frontend.md`, design references and license attribution already land in
commit 4. `sdk/README.md` lands with the SDK in commit 1. The benchmark README
lands in commit 3.

Suggested body:

```text
Lead with what Mnemo does, a usable quickstart and honest prototype boundaries.
Document the final folder layout, API access model and measured retrieval limits.
Separate maintainer plans and design history from product instructions.
```

Before committing: refresh current Unreleased frontend notes for modal
inspection, rank feedback, handoff, syntax highlighting and architecture expansion.
Check relative links, screenshot paths and case-sensitive guide names in a clean
checkout. Preserve historical release entries.

## 6. CI validation

**Subject:** `ci: validate docs contracts and retrieval regressions`

Include the remaining `.github/workflows/ci.yml` changes:

- Documentation example validation.
- Retrieval benchmark regression gate.

The test-database configuration must already be present from commit 2. All
scripts, fixtures and benchmark repairs must exist before enabling these steps.

Suggested body:

```text
Validate tutorial requests and SDK examples before integration tests.
Run the retrieval gate alongside migrated pgvector integration checks.
```

Validation: inspect the workflow and run its local equivalents. Remote CI results
cannot be known before a push to `main`. Confirm Node 20/pnpm 9 can install the
lockfile with --frozen-lockfile; the last local development install used pnpm 11.

## Final folder structure

```text
Mnemo/
├── app/                         # Next.js routes and metadata
│   ├── docs/                    # Get started, concepts, API, evaluation
│   └── playground/
├── components/
│   ├── layout/                  # Navbar, footer, logo, scrolling
│   ├── landing/                 # Five landing sections and hero
│   ├── docs/                    # Guides, diagrams, API explorer
│   ├── playground/              # Workbench, ranking, review, trace
│   └── ui/                      # Code blocks, expanded view, primitives
├── hooks/                       # Store, tabs, section tracking, scroll
├── lib/
│   ├── api/                     # Schema catalog and tutorial fixtures
│   ├── memory/                  # Simulation, scoring, scenarios
│   └── *.ts                     # Site/docs config and shared helpers
├── backend/
│   ├── app/{api,core,db,models,services}/
│   ├── alembic/versions/
│   ├── benchmark/
│   └── tests/
├── sdk/{mnemo,tests}/
├── public/                      # Fonts, schema, saved benchmark, metadata
├── scripts/                     # Contract export and docs validation
├── tests/e2e/
├── docs/
│   ├── api.md, architecture.md, deployment.md, frontend.md
│   ├── assets/
│   ├── internal/                # Current plan and historical notes
│   ├── design-reference/        # Archived kit, excluded from runtime
│   └── licenses/
└── .github/workflows/
```

Keep Next.js at the repository root: the current deployment configuration and
commands use that layout. The six-commit plan needs no further source-folder move.

## Staging and verification during execution

1. Confirm the checkout is on `main`, then fetch and compare `origin/main` when
   execution is requested. Preserve the existing working tree and staged changes.
   If upstream changes exist, reconcile them before final validation. Keep every
   planned commit on `main`; do not create another branch or rewrite remote history.
2. Account for the three guide renames already staged. Isolate those changes for
   commit 5 without changing their working-tree contents; do not include them
   accidentally in commit 1.
3. Stage by the scopes above, using patch staging for the shared CI file. Include
   both old-path removals and new-path additions for each move. Review each staged
   diff with rename detection; avoid a blanket stage-everything command.
4. Validate the staged commit's actual snapshot in a temporary directory without
   creating another branch. Running
   tests only on the final dirty working tree does not establish that earlier
   commits work independently. Resolve any newly discovered dependency before
   making that commit.
5. Review the final six commits on `main` against their base. Verify there are no missing
   new files, stale imports, broken guide links or accidental generated files.
6. When commit execution is requested, create and review the six local commits
   on `main`, then stop. Publishing remains a separate action: only after an
   explicit push request, push `main` to `origin/main`. Do not force-push.

## Local validation completed

Validated on 9 November 2026 against isolated staged snapshots:

- Node 20.20.2 / pnpm 9.15.9 frozen install, production build and TypeScript checks.
- 69 Chromium browser tests, including narrow and desktop layouts.
- 197 backend tests on Python 3.14 with a disposable PostgreSQL 16 + pgvector database.
- 22 SDK tests and 15 benchmark metric/gate tests.
- Migration upgrade to head, downgrade to 0012 and upgrade to head again.
- The real retrieval benchmark regression gate.
- Ruff, mypy, scoring parity and mocked documentation/SDK adapter checks.
- Regenerated OpenAPI matched the saved schema; relative Markdown links resolved.
- Protected hero/font hashes and staged diff whitespace checks.

The Python 3.12/3.13 matrix runs in remote CI after publication. Local results
are evidence for these snapshots, not a general production-readiness guarantee.

## Keep out of the commits

The existing ignore rules cover local `.env` files, Python environments,
`node_modules/`, Next.js output and Playwright results. Verify they stay excluded.
Keep example environment templates, both lockfile/dependency changes, API schema
and saved benchmark snapshot. No new untracked file exceeded 500 KB during this
review. Keep temporary browser screenshots and tool logs outside the repository;
only intentional repository documentation assets belong in `docs/assets/`.
