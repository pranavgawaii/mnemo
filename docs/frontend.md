# Mnemo — marketing site + documentation

Three pages for the Mnemo memory service, built with Next.js 15 (App Router) +
Tailwind CSS and matched to the Specboard editorial developer-tool aesthetic
(same `#F7F7F5` canvas, 1200px frame, `#E5E5E5` hairlines, Outfit + Redaction
type, and scroll-reveal behaviour).

- **`/`** — the marketing landing page. Hero, recall-path marquee, product
  explainer, a static "How it works" walkthrough, the differentiator, the design
  principle and the final CTA. No interactive tools, no code dumps.
- **`/docs`** — the technical documentation and interactive tools, organised with
  the Diátaxis model: **Getting started** (a tutorial), **Concepts**
  (explanation), **Reference** (information) and **Guides**, plus an
  **Interactive** group. Three of its sections are live diagrams — the
  architecture flow, the memory lifecycle and the REST explorer. The desktop
  rail stays pinned in one place; only the active section highlight moves as you
  scroll.
- **`/playground`** — a standalone playground on the same shell as the rest of the
  site: an opening **recall orbit** that ranks memories around a query you pick,
  then the in-browser sandbox — add & search, the ranking calculator and the
  contradiction checker.

All three pages are **static at runtime** — nothing calls the API from the browser
(see "Interactive demos"). All technical claims use the real behaviour and
parameters from `backend/app/` (`backend/app/core/config.py`,
`backend/app/core/decay.py`, `backend/app/core/contradiction.py`,
`backend/app/models/schemas.py`).

## Landing page (`/`)

| Section | Component | Anchor |
|---|---|---|
| Centred-logo nav (wordmark · links · logo · links · Read docs) | `components/site-nav.tsx` | — |
| Hero + scaled product window | `components/hero.tsx`, `memory-window.tsx` | `/#top` |
| Recall-path marquee (full-bleed rules + caption) | `components/pipeline-marquee.tsx` | — |
| Product explainer (what / why / how to explore) | `components/product-explainer.tsx` | — |
| How it works — Store → Search → Rank → Review | `components/how-it-works.tsx` | `/#how-it-works` |
| Mnemo vs other memory layers | `components/differentiator.tsx` | `/#features` |
| Design-principle quote | `components/principle-quote.tsx` | `/#principle` |
| Final CTA | `components/final-cta.tsx` | — |
| Watermark + footer | `app/page.tsx`, `site-footer.tsx` | — |

The landing stays a **single light theme**. Sections read as separate chapters
by alternating between the page background and a white full-bleed band, and by
varying layout: numbered editorial columns (the explainer), a white comparison
band (the difference), alternating walkthrough rows (How it works), then a
pull-quote and the closing CTA back on the background.

## Docs page (`/docs`)

| Section | Component | Anchor |
|---|---|---|
| Page title | `app/docs/page.tsx` | `#overview` |
| Chapter headers (heavy rule + label + note) | `app/docs/page.tsx` | — |
| Sticky contents (`hook-sidebar`, one continuous rail) | `components/docs-toc.tsx`, `components/ui/hook-sidebar.tsx` | — |
| **Getting started** · Local setup | `components/documentation.tsx` | `#quickstart` |
| **Concepts** · How it's built (interactive diagram) | `components/architecture-explorer.tsx` | `#architecture` |
| **Concepts** · Retrieval & ranking | `components/documentation.tsx` | `#retrieval` |
| **Concepts** · Contradictions (interactive lifecycle) | `components/lifecycle-explorer.tsx` | `#contradictions` |
| **Reference** · Data model | `components/documentation.tsx` | `#data-model` |
| **Reference** · REST API (interactive explorer) | `components/api-explorer.tsx` | `#api` |
| **Reference** · Auth & namespaces | `components/documentation.tsx` | `#auth` |
| **Guides** · Evaluation / benchmark | `components/evaluation.tsx` | `#evaluation` |
| **Guides** · Limitations / troubleshooting | `components/documentation.tsx` | `#limitations`, `#troubleshooting` |
| **Interactive** · Playground / calculators / checker | `components/memory-playground.tsx`, `ranking-explorer.tsx`, `contradiction-explainer.tsx` | `#playground` … |

The sections are grouped into five chapters — **Getting started**, **Concepts**,
**Reference**, **Guides** and **Interactive** — each opened by a heavy rule, a
label and a one-line note, so the page reads as chapters rather than one
continuous run of sections. Every section then carries its own `1px` hairline
(`components/docs-section.tsx`), including the first one under a chapter header,
with even space either side of it — so a boundary is visible wherever you land,
and the rule never sits against the previous section's last block.

Sections set `scroll-margin-top` to clear exactly the chrome covering the top of
the viewport (120px on narrow screens, where the pinned chip row sits under the
bar; 66px on desktop, where only the progress bar does), so a contents jump
lands with the section's rule and heading showing and nothing sliced in half
above them.

The docs page carries **no code blocks**. The REST API is documented by an
interactive explorer — pick a route and read its request/response **field
lists** — and configuration values are shown as plain-language rows and cells
rather than shell snippets or formulas rendered as code.

The desktop sidebar is the `hook-sidebar` component from the
[`swamimalode07/rare-ui`](https://github.com/swamimalode07/rare-ui) registry,
vendored verbatim into `components/ui/hook-sidebar.tsx` (it needs `motion` and
the `cn` helper in `lib/utils.ts`). `components/docs-toc.tsx` renders **one**
`HookSidebar` for the whole page — a single continuous dashed indigo rail,
flattened from `DOC_NAV` so the marker never resets between chapters — and drives
it with an `IntersectionObserver` scroll-spy. The aside is `sticky` with its own
scroll area; this only works because `html, body` use `overflow-x: clip` (never
`hidden`, which would create a scroll container and break stickiness).
The shared section shell is `components/docs-section.tsx`; static product mocks
(write, cosine match, decay curve, flagged contradiction) live in
`components/visuals.tsx`. Cross-page anchors are centralised in `lib/site.ts`
(`ANCHORS`, `DOC_NAV`, `NAV_LEFT`, `NAV_RIGHT`, `NAV_LINKS`, `NAV_CTA`,
`PLAYGROUND_URL`).

## Playground page (`/playground`)

| Section | Component | Anchor |
|---|---|---|
| Recall orbit — interactive ranking visual | `components/memory-orbit.tsx` | `#recall` |
| Sandbox — add & search | `components/memory-playground.tsx` | `#sandbox`, `#playground` |
| Sandbox — ranking calculator | `components/ranking-explorer.tsx` | `#ranking-calculator` |
| Sandbox — contradiction checker | `components/contradiction-explainer.tsx` | `#contradiction-checker` |

The playground is built on the same shell as the rest of the site — `SiteNav`,
the light `bg-background` canvas, `SiteFooter` — so it reads as part of the
product rather than a separate app. `MemoryOrbit`
places the query at the centre and the six best matches on three counter-rotating
rings (nearest ring, most relevant); hover or tap a node and the readout
underneath shows how the match was scored — `similarity × decay × importance`, the
same formula the service runs. The rings freeze on hover so a node is easy to
hit, and all motion is off under `prefers-reduced-motion`. The three sandbox
sections are the same components the docs embed, re-numbered `01`–`03` via an
optional `index` prop.

## Interactive demos

Three docs sections are interactive and are **explicitly labelled simulations**:

- **Playground** (`#playground`) — add a memory, search, see the ranking
  breakdown, then introduce a contradictory fact and resolve it.
- **Ranking calculator** (`#ranking-calculator`) — a calculator over the real
  scoring formula in `backend/app/core/decay.py`.
- **Contradiction checker** (`#contradiction-checker`) — runs the ported
  two-stage heuristic from `backend/app/core/contradiction.py`.

The same three tools also stand alone on `/playground`, alongside the recall
orbit. They are one set of components, used in both places.

The real API authenticates every request with a private `X-API-Key`, which a
public page must not embed, so the demos do not call the backend. They reuse the
exact ranking formula and contradiction logic (`lib/mnemo.ts`, a deliberate port
of `backend/app/core/`) over an in-browser store (`lib/playground.ts`). The one thing
that is *not* faithful is similarity: the live service embeds text with
`all-MiniLM-L6-v2`, while `lib/playground.ts` approximates relatedness with a
lexical + topic score. That approximation is always labelled "illustrative" in
the UI. Request and response shapes are documented as field tables in the REST
API section, so the docs page contains no runnable code snippets.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3005  (docs at /docs, playground at /playground)
```

Production build:

```bash
pnpm build
pnpm start        # http://localhost:3005
pnpm typecheck    # tsc --noEmit
```

Port `3005` is used so an existing dev server on `3000` is not disturbed.

> Never run `pnpm build` while `pnpm dev` is running against the same directory —
> both write `.next`, and racing them corrupts the webpack/HMR runtime
> (`__webpack_modules__[moduleId] is not a function`). If that happens:
> `rm -rf .next && pnpm dev`.

## Configuration (optional)

Copy `.env.example` to `.env.local`:

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_GITHUB_URL` | Adds a "GitHub" link to the navbar and the footer, and turns the hero / final CTA into "View on GitHub". When unset, those links are hidden and the primary CTA falls back to the docs page — no placeholder URL is invented. The navbar's own corner button always reads "Read docs". |

## Content accuracy

Every technical claim on either page is taken from the source:

- Ranking is `similarity × decay × importance` (`backend/app/core/decay.py`).
- Decay: 180-day half-life, floor 0.7; importance band 0.9–1.1 (`backend/app/core/config.py`).
- Contradictions: 0.82 similarity gate, then a negation-marker heuristic
  (`backend/app/core/contradiction.py`); resolution soft-deletes the loser
  (`backend/app/services/memory_service.py`).
- Endpoints, request/response shapes and constraints match `backend/app/api/routes.py`
  and `backend/app/models/schemas.py`; the data model matches
  `backend/alembic/versions/0001_initial_schema.py`.
- Benchmark figures (60 memories, 50 queries, top-1/top-3/MRR and the raw-cosine
  baseline) come from `backend/benchmark/` and the root `README.md`.

Deliberately **not** claimed: rate limiting, per-tenant keys, row-level security,
LLM verdicts, or any benchmark other than the repository's own. The docs state
these as limitations instead.
