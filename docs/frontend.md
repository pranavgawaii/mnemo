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

## Structure

- `app/`: route composition, metadata and the shared docs layout.
- `components/layout/`: navigation, footer, logo and site utilities.
- `components/landing/`: the five landing sections and protected hero artwork.
- `components/docs/`: shared headings, contents and documentation explorers.
- `components/playground/`: a small workbench composition, query and composer,
  context results, optional advanced controls, calculators and memory field.
- `components/ui/`: reusable animation, copyable code and footer primitives.
- `hooks/`: memory-store mutations, section tracking and keyboard tabs.
- `lib/memory/`: base scoring mirror and browser store simulation.
- `lib/api/`: OpenAPI-derived field catalog, cURL/Python requests and complete
  illustrative response fixtures.
- `lib/docs.ts`, `lib/site.ts`: route/navigation metadata and shared destinations.
- `public/`: fonts, OpenAPI snapshot and saved benchmark results.
- `tests/e2e/`: browser, keyboard, mobile, bookmark and memory-flow regressions.

Obsolete landing sections and duplicate docs simulations were removed from the
runtime tree. The original design kit remains in `docs/design-reference/`.

## Accuracy and maintenance

Demos make no backend or model requests and persist only for the current page
session. Similarity is a lexical/topic approximation; the API uses MiniLM
embeddings. The browser workbench isolates the base score, excluding keyword
blending and MMR. Conflict checks mirror the default English heuristic, not an
optional model verdict. No Claude integration or endorsement is implied.

API request/response fields come from `public/openapi.json`; curated notes cover
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

## Run and verify

```bash
pnpm install
pnpm dev          # frontend only, http://localhost:3005
pnpm typecheck
pnpm test:e2e     # Chromium regressions; uses an existing frontend if available
pnpm build
pnpm start        # production frontend on port 3005
```

Stop the process using port 3005 before switching between dev and production.
Development output uses `.next-3005`; production output uses `.next`.
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
