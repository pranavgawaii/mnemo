# 06 · Components

This is the section-by-section anatomy of the landing page. Each entry gives the
job, the structure, the exact classes, and the source file in Mnemo.

The components are deliberately plain. There is no design-system library, no
variant matrix, no `cva`. A handful of class strings and a consistent frame are
enough.

---

## 1. Navigation bar

**Source:** `components/site-nav.tsx`

**Job:** hold the brand, four links and one CTA without ever changing on scroll.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Mnemo        How it works  Features  ◉  Playground  GitHub  [Read docs] │
└──────────────────────────────────────────────────────────────────────┘
   wordmark            nav links        mark      nav links       CTA
```

### Anatomy

| Part | Class |
|---|---|
| Shell | `fixed inset-x-0 top-0 z-50 border-b border-black/[0.07] bg-background` |
| Inner | `mx-auto h-16 max-w-frame px-6` |
| Desktop grid | `hidden h-full lg:grid lg:grid-cols-[1fr_auto_1fr] items-center` |
| Wordmark | `text-[19px] font-semibold tracking-tight text-ink hover:text-accent transition-colors` |
| Nav link | `link-underline w-fit text-[13.5px] font-medium text-muted hover:text-accent` |
| Centre run | `flex items-center gap-8` |
| CTA | dark gradient pill, `h-9`, `rounded-full`, `text-[13.5px]` |
| Mobile | brand + CTA + 36px menu button; panel below the bar |

### The link underline

```css
.link-underline {
  background-image: linear-gradient(currentColor, currentColor);
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 0% 1px;
  transition: color 0.2s ease, background-size 0.35s cubic-bezier(0.2, 0.7, 0.1, 1);
}

.link-underline:hover,
.link-underline:focus-visible {
  background-size: 100% 1px;
}
```

The rule grows from the left in the link's own colour. It is the same sweep used
by the footer's "Back to top", which ties the two ends of the page together.

### The CTA pill

The one boxed element in the bar. It is a dark ink base with a top-lit gradient,
a 1px inset white hairline, a lit top edge and a two-layer shadow:

```html
<a class="group relative inline-flex h-9 shrink-0 items-center overflow-hidden rounded-full bg-[linear-gradient(180deg,#232331_0%,#0F0F18_55%,#0A0A0F_100%)] pl-3 pr-3.5 text-[13.5px] font-medium leading-none tracking-[-0.01em] text-[#FAFAFA] ring-1 ring-inset ring-white/15 shadow-[0_1px_2px_rgba(10,10,15,0.20),0_10px_24px_-12px_rgba(10,10,15,0.80),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-px active:translate-y-0 active:scale-[0.985]">
  <span class="relative inline-flex items-center gap-[7px]">
    Docs
    <svg class="h-[11px] w-[11px]" ...>→</svg>
  </span>
</a>
```

Hover lifts it `1px` and deepens the shadow. It does **not** change colour. A
white sheen fades in via a `::before` layer (a gradient cannot be transitioned
directly).

### Rules

- The bar is solid, not translucent. No backdrop blur.
- It has no scroll listener. Nothing about it changes while the page scrolls.
- Desktop switches at `lg`; below that, the mobile menu takes over.
- Keep the CTA visible on mobile; only the links collapse.
- `aria-label="Primary"` on the `<nav>`, `aria-expanded` on the menu button.

---

## 2. Hero

**Source:** `components/hero.mdx`

**Job:** state the promise in one large sentence, support it with one short
paragraph, offer two actions, then show the product.

```
┌───────────────────────────────────────────────────────┐
│  Give your AI agents a                                │
│  memory that lasts.          [support copy]           │
│                              [secondary] [primary]    │
│                                                       │
│  ┌───────────────────────────────────────────────┐    │
│  │            product window                      │    │
│  └───────────────────────────────────────────────┘    │
│  [chip] [chip] [chip] [chip]                           │
└───────────────────────────────────────────────────────┘
```

### Structure

1. `<section id="top" class="relative w-full pt-28 pb-14 sm:pt-32 lg:pt-36">`
2. Optional orbit backdrop (`<HeroOrbit />`), `absolute`, behind the content.
3. Frame + split row: headline left, copy + CTAs right.
4. Product window, scaled from the top-left so it bleeds right.
5. Stack strip: chips + a mono caption.

### Headline

```tsx
<h1 className="text-[40px] font-medium leading-[1.05] tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[60px] xl:text-[66px]">
  Give your AI agents a
  <br className="hidden sm:block" />{" "}
  <span
    className="italic font-normal tracking-normal text-[112%]"
    style={{ fontFamily: "var(--font-redaction), serif" }}
  >
    memory
  </span>{" "}
  that lasts.
</h1>
```

### Support copy

```tsx
<p className="mx-auto max-w-[400px] text-center text-[15px] leading-[1.65] text-muted sm:text-[16px] lg:mx-0 lg:text-right">
  Mnemo stores what an agent learns and hands back the context that still
  matters. Fresh facts rise, stale ones fade, and conflicts are flagged instead
  of silently overwritten.
</p>
```

### Actions

Secondary (white, bordered) first, primary (dark) second. On desktop the pair is
right-aligned; on mobile it centres.

```tsx
<a className="inline-flex items-center gap-2 rounded-[8px] border border-line bg-white px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md">
  Explore the docs
</a>
<a className="inline-flex items-center gap-2 rounded-[8px] bg-[#18181B] px-5 py-2.5 text-[14px] font-medium text-[#FAFAFA] shadow-[0_4px_14px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-white/10 transition-all hover:-translate-y-[1px] hover:bg-[#27272A] hover:shadow-md">
  View on GitHub
</a>
```

### Stack strip

```tsx
<ul className="flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
  {["Postgres + pgvector", "384-d local embeddings"].map((item) => (
    <li
      key={item}
      className="rounded-[6px] border border-line bg-white px-2.5 py-[5px] text-[12px] font-medium leading-none tracking-[-0.005em] text-ink/75 shadow-[0_1px_1.5px_rgba(10,10,15,0.04)]"
    >
      {item}
    </li>
  ))}
</ul>
<span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
  Illustrative product view
</span>
```

### Product window

The window is a miniature app, not a screenshot:

- `rounded-[24px]` glass shell, `border-white/60`, `backdrop-blur-[40px]`;
- inner white panel, `rounded-[16px]`, `border-white/50`;
- left icon rail, a meta panel, and a timeline on `#FAFAFA`;
- tiny type (`10–11px`) and real content, not lorem ipsum;
- optional ambient washes behind it (see [colours](./03-colors.md));
- desktop-only bleed: `md:scale-[1.15] md:origin-top-left`.

If your product has no UI yet, replace the window with a typographic diagram or
a code-adjacent mock. Do not use a fake dashboard with meaningless numbers.

### Rules

- One headline, one paragraph, two actions. No third CTA.
- The serif word is the last word of the first line or the first word of the
  second. Do not put it in the middle of a clause.
- The support paragraph is right-aligned on desktop; this counterweights the
  left-aligned headline.
- The hero is not 100vh. Let the product window pull the next section into view.

---

## 3. Marquee band

**Source:** `components/pipeline-marquee.mdx`

**Job:** show the product's process in one horizontal line, and give the page a
full-bleed moment between two framed sections.

```
─────────────── hairline ───────────────
 [THE RECALL PATH]  Store  Embed  Scan  Re-rank  Recall  Flag  →
                    (duplicated, drifting left)
 Every write and every search moves through the same six steps.
```

### Structure

```tsx
<section
  aria-label="The recall path"
  className="mt-14 border-t border-line bg-hairline pb-6 md:mt-20"
>
  <div className="py-8">
    <div className="mx-auto flex w-full max-w-frame flex-col items-center gap-8 overflow-hidden px-6 md:flex-row">
      <div className="relative z-10 shrink-0 rounded-[6px] border border-line bg-white/50 px-3 py-1.5 text-[12px] font-medium uppercase tracking-widest text-muted">
        The recall path
      </div>

      <div className="relative min-w-0 w-full flex-1 overflow-hidden [mask-image:...]">
        <div className="flex w-max animate-marquee">
          <StageSet />
          <StageSet />
        </div>
      </div>
    </div>
  </div>

  <p className="mt-6 px-6 text-center text-[13.5px] leading-relaxed text-muted text-balance">
    Every write and every search moves through the same six steps.
  </p>
</section>
```

### The ticker

- Duplicate the stage set **twice** and translate the track by `-50%`; this is
  what makes the loop seamless.
- `w-max` keeps the track at its natural width.
- Each stage is `text-[28px] tracking-tight`; colour only two of them (accent
  for the key step, green for the outcome).
- The band background is `bg-hairline` (`#EFEFEC`), one shade off the canvas.
- Edge mask fades the first and last 60–104px so labels dissolve instead of
  being cut off.
- `animation: marquee 32s linear infinite`; pause on hover.
- Stop the animation under `prefers-reduced-motion`; the static list remains
  readable.

### Mask

```css
mask-image: linear-gradient(
  to right,
  transparent,
  transparent 10px,
  black 60px,
  black calc(100% - 60px),
  transparent calc(100% - 10px),
  transparent
);
```

On `md+`, widen the fade to `28px / 104px` to clear the inline pill.

---

## 4. Product explainer (three numbered columns)

**Source:** `components/product-explainer.mdx`

**Job:** answer "what is it, why does it matter, how do I explore it" in three
editorial columns.

This is the template for any three-part explanation.

### Structure

```tsx
<section className="w-full border-y border-line bg-white">
  <div className="mx-auto max-w-frame px-6 pt-12 pb-16 md:pt-16 md:pb-20">
    <div className="max-w-[640px]">
      <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent-ink">
        Overview
      </span>
      <h2 className="mt-5 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-ink text-balance md:text-[34px]">
        A small, self-contained memory service: not another vector database to assemble.
      </h2>
    </div>

    <div className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-3">
      {cards.map((card, i) => (
        <div key={card.kicker} className="flex flex-col border-t border-line pt-6">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] tabular-nums text-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-ink">
              {card.kicker}
            </span>
          </div>
          <h3 className="mt-4 text-[19px] font-medium leading-snug tracking-[-0.01em] text-ink">
            {card.title}
          </h3>
          <p className="mt-3 text-[13.5px] leading-[1.7] text-muted">{card.body}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

### Content rules

- Kicker: 1–3 words, part of speech that names the question ("What it is",
  "Why it matters", "How to explore").
- Title: a complete, specific claim — not "Overview".
- Body: 2–4 sentences, one idea, no bullet list.
- The three columns should be **parallel in length**; the row looks wrong if one
  is twice as long as the others.
- The number is 11px mono `faint`; the kicker is 10.5px mono **bold**
  `accent-ink`. The size difference is deliberate: the label outranks the
  number.
- The only chrome is the top border. No card background, no radius, no shadow.

---

## 5. How it works (alternating rows)

**Source:** `components/how-it-works.mdx`

**Job:** walk through the product's process, one step per row, with a visual
that carries the concept.

```
┌──────────────────────────┬──────────────────────────┐
│ STORE                    │                          │
│ Store what the agent...  │      [visual]            │
│ body copy...             │                          │
│ ─────────────────────    │                          │
│ a sentence in → ... out  │                          │
└──────────────────────────┴──────────────────────────┘
┌──────────────────────────┬──────────────────────────┐
│        [visual]          │ SEARCH                   │
│                          │ Recall by meaning...     │
└──────────────────────────┴──────────────────────────┘
```

### Structure

```tsx
<section id="how-it-works" className="relative w-full scroll-mt-16 pt-12 pb-16 md:pt-16 md:pb-20">
  <div className="mx-auto max-w-frame px-6">
    <div className="mb-14 text-center">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
        How it works
      </span>
      <h2 className="mt-6 text-[32px] font-medium leading-[1.2] text-ink text-balance md:text-[40px]">
        From a fact to a recall.
        <br />
        Nothing gets lost, nothing goes stale.
      </h2>
    </div>

    <div className="flex flex-col gap-16 md:gap-20">
      {steps.map((step) => (
        <div
          key={step.title}
          className={`flex flex-col items-center gap-12 md:flex-row lg:gap-20 ${
            step.reverse ? "md:flex-row-reverse" : ""
          }`}
        >
          <div className="flex-1 md:px-10">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent-ink">
              {step.label}
            </span>
            <h3 className="mt-3 text-[26px] font-medium leading-[1.2] tracking-[-0.02em] text-ink text-balance md:text-[30px]">
              {step.title}
            </h3>
            <p className="mt-4 text-[14.5px] leading-[1.75] text-muted">{step.body}</p>
            <p className="mt-5 border-t border-hairline pt-4 font-mono text-[11px] text-faint">
              {step.inOut}
            </p>
          </div>
          <div className="w-full max-w-[500px] flex-1">{step.visual}</div>
        </div>
      ))}
    </div>
  </div>
</section>
```

### Rules

- Alternate image side on **every other row** (`reverse`).
- The mono kicker is the step name: one word, uppercase, accent-ink.
- The "in → out" line is the most distinctive detail: a hairline above, 11px
  mono, `faint`, no icon. It states the transformation in plain language.
- Visuals are simple, static diagrams: a card with three rows, a cosine match,
  a decay curve, a conflict flag. Avoid a different illustration style per row.
- On mobile, copy comes first and the visual follows. Keep the DOM in that order.
- Four steps is a comfortable maximum; beyond that, use a tabbed explainer.

---

## 6. Comparison (the differentiator)

**Source:** `components/differentiator.mdx`

**Job:** make the product's difference concrete without a pricing table.

```
        THE DIFFERENCE
  Other memory layers remember everything.
  Mnemo decides what still matters.
            [intro]

  ┌─────────────────────┐  ┌─────────────────────┐
  │ Other memory layers │  │ Mnemo      [badge]  │
  │ ✗ ...               │  │ ✓ ...               │
  │ ✗ ...               │  │ ✓ ...               │
  └─────────────────────┘  └─────────────────────┘
       warm card               white + accent border
```

### Structure

```tsx
<section id="features" className="w-full scroll-mt-16 border-y border-line bg-white">
  <div className="mx-auto max-w-frame px-6 pt-12 pb-16 md:pt-16 md:pb-20">
    <div className="mb-12 text-center">
      <div className="mb-6 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        The difference
      </div>
      <h2 className="mb-6 text-[34px] font-medium leading-[1.1] tracking-[-0.03em] text-ink text-balance md:text-[46px]">
        Other memory layers remember everything.
        <br />
        Mnemo decides what still matters.
      </h2>
      <p className="mx-auto max-w-[580px] text-[16px] leading-[1.7] text-muted">
        Dropping every conversation chunk into a vector store is easy. The hard
        part is ranking, decaying and refusing to silently overwrite.
      </p>
    </div>

    <div className="mx-auto flex max-w-[900px] flex-col gap-5 md:flex-row">
      <div className="flex-1 rounded-xl border border-line bg-[#FCFCFB] p-6 md:p-8">
        <h3 className="mb-8 text-[18px] font-medium text-ink/70">Other tools</h3>
        <ul className="flex flex-col gap-5">
          {other.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 font-bold text-[#EF4444]">✗</span>
              <span className="text-[15px] leading-[1.5] text-muted">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 rounded-xl border border-accent/50 bg-white p-6 shadow-soft md:p-8">
        <h3 className="mb-8 flex items-center gap-2 text-[18px] font-medium text-ink">
          Mnemo
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-ink">
            Open source
          </span>
        </h3>
        <ul className="flex flex-col gap-5">
          {ours.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 font-bold text-[#22C55E]">✓</span>
              <span className="text-[15px] leading-[1.5] text-ink">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
</section>
```

### Rules

- The two lists must be **parallel**: same number of rows, same grammatical
  shape, ideally the same length.
- The winner gets **one** visual advantage: the accent border + white surface.
  Not an accent fill, not a trophy icon, not a bigger card.
- Keep the cross/dot in semantic colours; keep the text itself neutral.
- The heading can be two sentences with a line break; the turn ("Mnemo decides")
  belongs on the second line.
- Do not invent competitor names. "Other memory layers" is honest and safe.

---

## 7. Pull quote / principle

**Source:** `components/principle-quote.mdx`

**Job:** slow the page down before the close and state the product's belief.

```
              DESIGN PRINCIPLE

  Memory that forgets is memory you can trust.
  Mnemo ranks by relevance, not recency, and when
  two memories disagree, it flags the conflict
  instead of quietly picking a winner.
```

### Structure

```tsx
<section id="principle" className="w-full scroll-mt-16">
  <div className="mx-auto flex max-w-[1000px] flex-col items-center px-6 pt-12 pb-16 text-center md:pt-16 md:pb-20">
    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
      Design principle
    </span>
    <p className="mt-6 max-w-[860px] text-[22px] font-medium leading-[1.45] tracking-[-0.01em] text-ink text-balance md:text-[30px]">
      Memory that forgets is memory you can trust. Mnemo ranks by relevance,
      not recency, and when two memories disagree, it flags the conflict
      instead of quietly picking a winner.
    </p>
  </div>
</section>
```

### Rules

- No quotation marks, no photo, no attribution. Those signal a customer quote;
  without one, the section would feel fake.
- The quote is sans, weight 500, `30px`, with `1.45` line-height. Serif here
  would overplay the editorial voice.
- Keep the measure at `860px`; the eye should travel, not scan.
- One paragraph, 2–3 sentences, one idea.
- If you do have a real customer quote, add the name and role, keep the same
  scale, and do not turn it into a carousel.

---

## 8. Final CTA

**Source:** `components/final-cta.mdx`

**Job:** close the page with one clear action and the simplest next step.

```
┌─────────────────────────────────────────────────────┐
│              Give your agents something             │
│                 to remember.                        │
│         [support paragraph]                         │
│                                                     │
│      [primary]  [secondary]  [secondary]            │
│  ─────────────────────────────────────────────      │
│           THE SIMPLEST NEXT STEP                    │
│    [1 Clone] → [2 docker compose up] → [3 curl]     │
└─────────────────────────────────────────────────────┘
```

### Structure

```tsx
<section className="relative w-full pt-12 pb-20 md:pt-16 md:pb-24">
  <div className="mx-auto max-w-frame px-6">
    <div className="flex flex-col items-center rounded-[24px] border border-line bg-white px-6 py-14 text-center sm:px-10 md:px-16 md:py-20">
      <h2 className="max-w-[720px] text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-ink text-balance md:text-[44px]">
        Give your agents something to{" "}
        <span className="italic font-normal tracking-normal" style={{ fontFamily: "var(--font-redaction), serif" }}>
          remember
        </span>
        .
      </h2>

      <p className="mt-5 max-w-[560px] text-[15px] leading-[1.7] text-muted md:text-[16px]">
        One self-contained service. No managed vector database. A ranking
        function you can read end to end.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <a className="rounded-lg bg-[#18181B] px-5 py-2.5 text-[14px] font-medium text-[#FAFAFA] ...">Primary</a>
        <a className="rounded-lg border border-line bg-white px-5 py-2.5 text-[14px] font-medium text-ink shadow-soft ...">Secondary</a>
        <a className="...">Tertiary</a>
      </div>

      <div className="mt-10 w-full max-w-[620px] border-t border-hairline pt-8 text-left">
        <p className="text-center font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-faint">
          The simplest next step
        </p>
        <ol className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {/* numbered cards with arrows between */}
        </ol>
      </div>
    </div>
  </div>
</section>
```

### Rules

- The panel is the only `rounded-[24px]` white box on the page; it closes the
  page like a title card.
- One primary action. A secondary and a tertiary are fine if they are genuinely
  different destinations, not three copies of "Get started".
- The "simplest next step" strip is optional but powerful: 3 numbered commands,
  each in a small rounded card, separated by `→`.
- Keep the support copy under 2 lines on desktop.
- The bottom padding (`pb-20 md:pb-24`) is larger than the top; it lets the
  footer start on a quiet note.

---

## 9. Footer

**Source:** `components/site-footer.tsx` + `components/ui/halftone-wordmark-footer.tsx`

**Job:** close the page, repeat the brand, and offer the link map.

The Mnemo footer uses a vendored **halftone wordmark** component: a very large
brand word rendered as a dot/halftone grid, with link columns above it. It is a
strong signature, but optional.

### What it includes

- a large brand word (`mnemo`) in Outfit 800;
- a small brand line with the logo mark;
- 3 link columns (Product, Developers, Contact);
- a back-to-top link;
- a copyright line with an external credit;
- a warm `#E8E8E2` background, darker than the page canvas.

### Simpler portable footer

If you do not want the halftone component, keep the same structure:

```tsx
<footer className="border-t border-line bg-[#E8E8E2]">
  <div className="mx-auto max-w-frame px-6 py-12">
    <div className="flex flex-col gap-10 md:flex-row md:justify-between">
      <div>
        <span className="text-[19px] font-semibold tracking-tight text-ink">YourProduct</span>
        <p className="mt-3 max-w-[280px] text-[13.5px] leading-[1.7] text-muted">
          One line that says what it is.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
        {/* link columns */}
      </div>
    </div>
    <div className="mt-10 flex flex-col gap-3 border-t border-black/10 pt-6 text-[12px] text-muted sm:flex-row sm:justify-between">
      <span>© {new Date().getFullYear()} YourProduct</span>
      <a className="link-underline" href="#top">Back to top</a>
    </div>
  </div>
</footer>
```

### Rules

- The footer can be the one place with a slightly darker surface (`#E8E8E2`).
  Do not introduce a new hue.
- Keep the small type at 12–13.5px; this is a colophon, not a second landing
  page.
- Link columns: 3 is the sweet spot; 4+ starts to look like a sitemap.
- The back-to-top link uses the same underline sweep as the nav.
- External credits get `target="_blank" rel="noopener noreferrer"`.

---

## 10. Buttons, chips, links

### Primary button

```html
<a class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#18181B] px-5 py-2.5 text-[14px] font-medium text-[#FAFAFA] ring-1 ring-inset ring-white/10 shadow-[0_4px_14px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:-translate-y-px hover:bg-[#27272A] hover:shadow-md">
  Primary action
</a>
```

- Height is set by `py-2.5` + 14px text (about 40px).
- Radius 8px, not a pill (the nav CTA is the only pill).
- Hover: lift 1px, darken one step, deepen the shadow.
- One per view. The nav CTA is separate because it is chrome, not content.

### Secondary button

```html
<a class="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-5 py-2.5 text-[14px] font-medium text-ink shadow-soft transition-all hover:-translate-y-px hover:bg-black/[0.03]">
  Secondary
</a>
```

### Text link

```html
<a class="text-accent-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-accent-ink">
  inline link
</a>
```

The underline is the hairline colour by default and darkens on hover. This is
quieter than a permanently indigo underline and keeps the accent share low.

### Arrow link

```html
<a class="group inline-flex items-center gap-2 font-mono text-[11.5px] text-muted transition-colors hover:text-ink">
  Follow one fact through the system
  <svg class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">→</svg>
</a>
```

### Chip

```html
<li class="rounded-[6px] border border-line bg-white px-2.5 py-[5px] text-[12px] font-medium leading-none tracking-[-0.005em] text-ink/75 shadow-[0_1px_1.5px_rgba(10,10,15,0.04)]">
  Postgres + pgvector
</li>
```

### Badge

```html
<span class="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-ink">
  Open source
</span>
```

### Rules

- One primary per view.
- The nav CTA is a pill; content buttons are 8px rectangles.
- Never put two dark buttons side by side.
- Icon + label gap is `8px` (`gap-2`); icon size is 14–16px, stroke 1.8–2.
- Hover movement is 1px, not 4px.

---

## 11. Put it together

The order that works, and why:

| # | Section | Question it answers |
|---|---|---|
| 1 | Nav | Where am I? |
| 2 | Hero | What is this? |
| 3 | Marquee | What does it do, at a glance? |
| 4 | Explainer | What is it, why does it matter, how do I explore? |
| 5 | How it works | How does it actually work? |
| 6 | Comparison | Why this instead of the obvious alternative? |
| 7 | Quote | What does the team believe? |
| 8 | Final CTA | What do I do next? |
| 9 | Footer | Where else can I go? |

For the full page skeleton, see [`09-page-recipe.md`](./09-page-recipe.md).

Next: [`07-motion.md`](./07-motion.md).
