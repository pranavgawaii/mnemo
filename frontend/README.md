# Mnemo — marketing site + documentation

Two pages for the Mnemo memory service, built with Next.js 15 (App Router) +
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

Both pages are **static at runtime** — nothing calls the API from the browser
(see "Interactive demos"). All technical claims use the real behaviour and
parameters from `app/` (`app/core/config.py`, `app/core/decay.py`,
`app/core/contradiction.py`, `app/models/schemas.py`).

## Landing page (`/`)

| Section | Component | Anchor |
|---|---|---|
| Minimal full-width nav | `components/site-nav.tsx` | — |
| Hero + scaled product window | `components/hero.tsx`, `memory-window.tsx` | `/#top` |
| Recall-path marquee | `components/pipeline-marquee.tsx` | — |
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
| Chapter headers (heavy rule + label + note) | `app/docs/page.tsx`, `app/globals.css` | — |
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
continuous run of sections.

The docs page carries **no code blocks**. The REST API is documented by an
interactive explorer — pick a route and read its request/response **field
lists** — and configuration values are shown as plain-language rows and cells
rather than shell snippets or formulas rendered as code.

The desktop sidebar is the `hook-sidebar` component from the
[`swamimalode07/rare-ui`](https://github.com/swamimalode07/rare-ui) shadcn
registry, vendored verbatim into `components/ui/hook-sidebar.tsx` (it needs
`motion` and the `cn` helper in `lib/utils.ts`). `components/docs-toc.tsx` renders
**one** `HookSidebar` for the whole page — a single continuous rail, flattened
from `DOC_NAV`, so the marker never resets between groups — and drives it with an
`IntersectionObserver` scroll-spy. The aside is `sticky` with its own scroll area;
this only works because `html, body` use `overflow-x: clip` (never `hidden`, which
would create a scroll container and break stickiness). The
shared section shell is `components/docs-section.tsx`; static product mocks
(write, cosine match, decay curve, flagged contradiction) live in
`components/visuals.tsx`. Cross-page anchors are centralised in `lib/site.ts`
(`ANCHORS`, `DOC_NAV`, `NAV_LINKS`).

## Interactive demos

Four docs sections are interactive and are **explicitly labelled simulations**:

- **Pipeline walkthrough** (`#pipeline`) — step through Store → Search → Rank →
  Review.
- **Playground** (`#playground`) — add a memory, search, see the ranking
  breakdown, then introduce a contradictory fact and resolve it.
- **Ranking calculator** (`#ranking-calculator`) — a calculator over the real
  scoring formula in `app/core/decay.py`.
- **Contradiction checker** (`#contradiction-checker`) — runs the ported
  two-stage heuristic from `app/core/contradiction.py`.

The real API authenticates every request with a private `X-API-Key`, which a
public page must not embed, so the demos do not call the backend. They reuse the
exact ranking formula and contradiction logic (`lib/mnemo.ts`, a deliberate port
of `app/core/`) over an in-browser store (`lib/playground.ts`). The one thing
that is *not* faithful is similarity: the live service embeds text with
`all-MiniLM-L6-v2`, while `lib/playground.ts` approximates relatedness with a
lexical + topic score. That approximation is always labelled "illustrative" in
the UI. Request and response shapes are documented as field tables in the REST
API section, so the docs page contains no runnable code snippets.

## Run

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:3005  (docs at /docs)
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
| `NEXT_PUBLIC_GITHUB_URL` | Turns the primary nav / hero / footer CTA into "View on GitHub". When unset, the primary CTA falls back to the docs page — no placeholder URL is invented. |

## Content accuracy

Every technical claim on either page is taken from the source:

- Ranking is `similarity × decay × importance` (`app/core/decay.py`).
- Decay: 180-day half-life, floor 0.7; importance band 0.9–1.1 (`app/core/config.py`).
- Contradictions: 0.82 similarity gate, then a negation-marker heuristic
  (`app/core/contradiction.py`); resolution soft-deletes the loser
  (`app/services/memory_service.py`).
- Endpoints, request/response shapes and constraints match `app/api/routes.py`
  and `app/models/schemas.py`; the data model matches
  `alembic/versions/0001_initial_schema.py`.
- Benchmark figures (60 memories, 50 queries, top-1/top-3/MRR and the raw-cosine
  baseline) come from `benchmark/` and the root `README.md`.

Deliberately **not** claimed: rate limiting, per-tenant keys, row-level security,
LLM verdicts, or any benchmark other than the repository's own. The docs state
these as limitations instead.
