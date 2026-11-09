# Mnemo frontend

Next.js 15 App Router, React 19, TypeScript and Tailwind CSS. The visual system
uses the existing Outfit and Redaction fonts, pale canvas, indigo accents and
hairline borders. The hero layout is preserved. Navigation uses a lightly
transparent backdrop with a solid fallback; the mobile menu stays opaque. The navbar places the logo before the wordmark, then Playground, an icon-only
GitHub link with a subtle indigo colour change and a compact GitHub tooltip, and Read docs.
The tooltip opens on hover/focus and dismisses with Escape. Read docs is the docs entry;
there is no duplicate Docs link. Narrow screens use a labelled mobile menu.

## Routes and content

The landing has exactly five body sections:

1. Existing hero and illustrative product window. Try the playground is the
   primary action; View on GitHub is secondary. Both buttons use text-only labels.
2. Agent memory example: recall a fact, introduce a change, explicitly keep it.
3. Store / retrieve / review: a compact explanation of the service boundary.
4. Evidence: the saved 60-memory, 50-query comparison, including the cosine win.
5. Quickstart: real store/search commands and a link to setup.

Documentation has four pages, each with its own metadata, canonical and contents:

| Route | Purpose |
| --- | --- |
| `/docs` | Run the service, store a fact, recall it, connect an agent, troubleshoot |
| `/docs/concepts` | System diagram, optional retrieval explorer, ranking, conflict lifecycle, limitations |
| `/docs/api` | Schema-backed operations, permissions, eight-table data model |
| `/docs/evaluation` | Saved results, methodology, reproduction, future experiments |

Old `/docs#…` bookmarks redirect to the corresponding page or playground tool.
The sitemap includes all six page routes. Docs navigation wraps to a two-column
grid on narrow screens; Evaluation uses result cards on mobile and a full-width
table on larger screens, with no horizontal scrolling. Each page includes
previous/next navigation. The quickstart shares a cURL/Python language choice
across both requests; mobile API navigation uses an operation selector.
SDK installation is a separate optional setup disclosure. Store/search code
frames reserve the larger cURL/Python variant using non-interactive, aria-hidden
text in a shared grid; copy controls always use the selected example. Syntax
highlighting uses highlight.js core with only Bash, Python and JSON grammars, in
a light theme. Raw source is preserved for copying. API operations offer an
expanded reading view. Architecture previews have no inner scrolling; Expand
opens the full map or flow, with Fit diagram and Read larger options on desktop.
Concepts separates a deployment map from a Remember / Recall / Review user
flow. The map uses a real process boundary, distinct component icons, a database
cylinder, and solid request paths versus dashed polling/delivery paths. A
readable component layout replaces the vector map when its container is narrow.
The agent guide includes a model-independent Python adapter. It retrieves real
SDK results, skips generation on empty results or pending review, and delegates
generation to the application's callback. The validator checks all three paths
with a mocked HTTP transport and model callback; it does not measure a live model.

The playground starts with recall, store and review. Search commits on submit,
including Enter. Conflicts preserve both facts until an explicit choice; the
losing row moves to inactive history. Reset restores the six sample memories.
Location, Learning, Routine and Preferences scenario buttons fill a question and suggested
change without replacing the user's store. After resolution, a before/after
summary shows both previously active facts, the kept fact and the archived fact.
Focus moves to that summary; reset or a new store/scenario clears it.
The main workspace exposes time and ranking controls. Results and review use
stable, scroll-free previews. Selecting a result opens a full-fact inspector
with readable score signals and an importance control. Long conflicts and all
inactive history remain accessible through Open review & history. The preview
shows the first pending conflict; the expanded review contains the whole queue.
Rank feedback compares the next setting against the previous setting, showing
actual promotions/demotions and explaining whether time, policy or importance
changed. Slider drags retain their starting comparison until the gesture ends.
The Preferences scenario supplies several relevant facts for comparing policies.
The retrieval trace starts as a compact four-stage summary. Its expanded view
contains keyboard-accessible Query / Candidates / Rank / Handoff tabs. Replay is
explicit, finite, interruptible and respects reduced motion. The candidate view
sorts locally scored active facts by illustrative similarity; ranking shows
similarity and base-score bars. Handoff explains the returned context without
repeating the facts; Copy context uses the same match selection as the primary
result list. The list returns up to three matches at demo similarity 0.25 or
higher, separate from the backend search policy. Weaker matches are inspectable
through the trace or advanced memory map.
Expanded views share a native modal with focus containment, Escape/backdrop
closing and focus restoration. Only its body scrolls; tab changes preserve the
window size and reset reading position. The main page stays fixed behind it.
The memory map, pairwise calculator, conflict checker and local activity remain
optional. Tool deep links open the relevant disclosures automatically. The
landing example also reserves one frame for all four stages.

## Guided playground flow

The workbench guides recall → store → review → recall again while keeping custom
inputs available. Ranking and time controls remain visible below the main
results, before the retrieval trace. A non-conflicting write skips the decision
step and returns to recall.

Resolving a conflict captures the displayed context immediately before and
after that decision, using the same submitted query, ranking mode, time offset
and display cutoff. Recall again reveals that labelled snapshot; Current context
returns to the live results. Snapshots retain their original settings when later
experiments change ranking. Choosing another scenario, submitting a different
question or storing another fact clears the previous comparison. Input, result and guidance frames reserve their
space across these state changes.

The README diagram in `docs/assets/architecture.svg` is a static export of
`frontend/src/components/docs/system-map.tsx`. Keep the asset synchronized with
the interactive architecture when process boundaries or data paths change.

## Structure

All paths below are relative to `frontend/`.

- `src/app/`: route composition, metadata and the shared docs layout.
- `src/components/layout/`: navigation, footer, logo and site utilities.
- `src/components/landing/`: the five landing sections and protected hero artwork.
- `src/components/docs/`: shared headings, contents and documentation explorers.
- `src/components/playground/`: a small workbench composition, query and composer,
  context results, optional advanced controls, calculators and memory field.
- `src/components/ui/`: reusable animation, copyable code and footer primitives.
- `src/hooks/`: memory-store mutations, section tracking and keyboard tabs.
- `src/lib/memory/`: base scoring mirror and browser store simulation.
- `src/lib/api/`: OpenAPI-derived field catalog, cURL/Python requests and complete
  illustrative response fixtures.
- `src/lib/docs.ts`, `src/lib/site.ts`: route/navigation metadata and shared destinations.
- `public/`: fonts, OpenAPI snapshot and saved benchmark results.
- `tests/e2e/`: browser, keyboard, mobile, bookmark and memory-flow regressions.

Obsolete landing sections and duplicate docs simulations were removed from the
runtime tree. Historical planning notes and the archived design kit have been
removed; runtime font notices remain in `public/fonts/LICENSE-OFL-1.1.txt`.

## Accuracy and maintenance

The Browser demo makes no backend or model requests and persists only for the
current page session. Its similarity is a lexical/topic approximation; the API
uses backend embeddings (MiniLM by default). The optional Live API walkthrough
uses the separate Next.js server proxy described below. The browser workbench isolates the base score, excluding keyword
blending and MMR. Conflict checks mirror the default English heuristic, not an
optional model verdict. No Claude integration or endorsement is implied.

API request/response fields come from `frontend/public/openapi.json`; curated notes cover
behavior that a schema cannot express. Regenerate after backend contract changes:

```bash
cd backend
.venv/bin/python ../scripts/export-api-schema.py
```

This imports the application to export its schema; it does not start the API or
connect to a database. Run `.venv/bin/python ../scripts/check-doc-examples.py`
from `backend/` to validate documented response fixtures and Python SDK examples
without a running service. The live backend also exposes its own `/docs` and
`/openapi.json` on port 8000. Benchmark figures come from the checked-in snapshot;
they are a small in-sample retrieval comparison, not agent-quality measurements.

## Live API demo

The Live API tab offers four fixed examples: a city move, a cuisine preference,
a learning goal and a running routine. Each runs save/search/change/review
operations against a real API. It returns upstream facts, scores, status codes and request timings; it does
not generate answers or fall back to simulated results on failure.

Source-matched rules also recognize a second change from the current value
(e.g. Bengaluru → Pune → Delhi). Archived facts are not candidates. Plans and
compatible additions remain separate active notes; the demo does not infer
that a possible future event has occurred.

Start the backend using the repository quickstart. Set these **server-only**
variables in `frontend/.env.local`, then restart the frontend:

```dotenv
MNEMO_DEMO_API_URL=http://127.0.0.1:8000
MNEMO_DEMO_API_KEY=your-api-key
```

The API must be reachable by the Next.js server, including from a hosted web
server when deployed. The proxy accepts only three named actions. A signed,
15-minute session binds the selected example, random `web-demo-*` namespace and record IDs; callers
cannot supply their own upstream, namespace, fact or record ID. Keys never enter
the browser bundle or API responses. Each synthetic fact has a 15-minute expiry;
expired/inactive rows can remain in history. For public use, enable backend rate
limiting and use a dedicated read/write key. This remains a single-tenant API.
The factory in `src/lib/server/demo-api.ts` is exercised separately from browser
presentation tests. Integration verification should also run against the real
API and pgvector, as mocked UI tests do not establish embedding behavior.

With both services running, verify the complete configured walkthrough from the
repository root:

```bash
python scripts/check-live-demo.py
```

This checks all six upstream calls, the explicit move, the returned context and
the old row's inactive state. It uses a fresh demo namespace and never needs the
API key on the client.

## Run and verify

```bash
cd frontend
pnpm install
pnpm dev          # frontend only, http://localhost:3005
pnpm typecheck
pnpm test:e2e     # Chromium regressions; uses an existing frontend if available
pnpm build
pnpm start        # production frontend on port 3005
```

Stop the process using port 3005 before switching between dev and production.
Development output uses `frontend/.next-3005`; production output uses
`frontend/.next`. The Vercel project root must be `frontend` (see
[deployment](deployment.md#vercel--monorepo-notes)).
No backend service is required for the frontend.

## Scrolling and the footer

[Lenis](https://github.com/darkroomengineering/lenis) 1.3.27 is loaded only for
fine-pointer devices without reduced motion. Wheel easing is deliberately light
(`lerp: 0.14`, `wheelMultiplier: 0.95`); touch stays native. Nested scroll areas
keep their native behavior. Anchor offsets and Back to top use the same scroll
driver, and a live preference change tears the driver down.

Every route shares the footer arrival: a 24–40px transition band and a 30px
scroll-linked settle create a visual pause before the halftone footer.
No timer freezes scrolling, keyboard input or access to links. Reduced motion
uses a static footer with a smaller gap. The footer canvas retains its existing
visibility and reduced-motion handling.
On narrow screens, two flexible link columns and a 500px minimum footer height
keep the credits clear of the decorative wordmark, including at 320px.

Optional public configuration: `NEXT_PUBLIC_GITHUB_URL` changes the repository
links; `NEXT_PUBLIC_SITE_URL` sets the deployed canonical origin. Neither is a
backend credential. Never expose a real API key through public environment vars.

## Mobile and browser verification

The composer reserves space for multiline facts; text fields use 16px type on
small screens to avoid iOS focus zoom. Phones use a compact native scenario selector; wider screens retain the scenario
buttons.
Live API context stacks vertically on phones so facts and scores remain readable.
Result frames stay reserved through loading, review and error states.

`pnpm test:e2e` runs the full Chromium suite and focused mobile checks in Firefox
and WebKit. These engines are useful compatibility evidence, not a substitute
for testing physical iOS and Android devices. Install them with
`pnpm exec playwright install chromium firefox webkit`.

On macOS, the Firefox test project isolates its application-data root in a
temporary directory. This avoids the bundled Firefox 157 reading a protected
real-user Firefox directory; it does not change OS permissions. See
[the upstream Playwright issue](https://github.com/microsoft/playwright/issues/42768).

## Python ownership and generated browser data

`backend/app/core/changes.py` owns the explicit update rules and current-value
projection. The website interprets generated rule data for its offline demo;
edit the Python source, then run:

```bash
python scripts/export-memory-rules.py
python scripts/export-memory-rules.py --check
```

CI checks the generated snapshot and shared Python/browser fixtures. Live API
results receive `current_statement` directly from the Python API. Source records
remain available in the inspector and live request details. The browser copies the displayed current values; source records remain in
inspection. The Python SDK context formatter uses original text by default and
supports explicit opt-in current values. No projection independently verifies a claim.

On phones and tablets below 1024px, Context and Review share a fixed result
panel with keyboard-accessible tabs. Storing a conflict opens Review; verifying
recall opens Context. Both remain side by side on desktop.

The availability badge probes `/v1/demo/availability` on opening the live tab,
on window focus, and on Check availability. It shows database/key readiness,
a check time and cold/warm encoder state. Failed writes mark it unavailable;
results are retained for inspection and retry. `/health` alone is not used to
claim that the demo is available.
