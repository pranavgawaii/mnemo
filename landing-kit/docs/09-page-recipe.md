# 09 · Landing page recipe

This is the complete page order, with a working skeleton you can adapt. It
assumes the Next.js + Tailwind setup from [`10-porting-guide.md`](./10-porting-guide.md),
but the structure is framework-agnostic.

---

## 1. The order

```text
1. SiteNav                 fixed, 64px, solid paper
2. Hero                    split headline + support + 2 CTAs + product window
3. Marquee                 full-bleed hairline band with the process
4. Explainer               white band, 3 numbered columns
5. How it works            paper, alternating rows with visuals
6. Comparison              white band, 2 parallel cards
7. Principle / quote       paper, centred, one paragraph
8. Final CTA               paper, one white 24px panel
9. Footer                  darker paper, links + colophon
```

Why this order works:

- It moves from **promise → proof → mechanism → difference → belief → action**.
- Each section has a different shape, so the eye never predicts the next block.
- White bands land at the two places where the reader needs a reset: after the
  hero and after the mechanism.
- The quote is a deliberate pause before the close. Do not put it before the
  comparison.
- The final CTA is one panel, not a full-width colour band. It feels like a
  closing card, not an advertisement.

---

## 2. The page file

```tsx
// app/page.tsx
import { SiteNav } from "@/components/site-nav";
import { Hero } from "@/components/hero";
import { PipelineMarquee } from "@/components/pipeline-marquee";
import { ProductExplainer } from "@/components/product-explainer";
import { HowItWorks } from "@/components/how-it-works";
import { Differentiator } from "@/components/differentiator";
import { PrincipleQuote } from "@/components/principle-quote";
import { FinalCta } from "@/components/final-cta";
import { SiteFooter } from "@/components/site-footer";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-[13px] focus:text-white"
      >
        Skip to content
      </a>

      <SiteNav />

      <main id="main" className="relative z-10 w-full flex-1">
        <Hero />
        <PipelineMarquee />
        <ProductExplainer />
        <HowItWorks />
        <Differentiator />
        <PrincipleQuote />
        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}
```

Notes:

- The wrapper is `overflow-hidden` to contain the hero's scaled product window
  and ambient glow. If you use a sticky sidebar elsewhere, put `overflow-x: clip`
  on `html, body` instead (never `hidden`).
- `relative z-10` on `<main>` keeps content above the hero backdrop.
- The skip link is the first child, before the nav, so it is the first Tab stop.

---

## 3. Section-by-section skeleton

### 3.1 Nav

```tsx
// components/site-nav.tsx
"use client";

import { useState } from "react";

const links = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.07] bg-background">
      <nav aria-label="Primary" className="mx-auto h-16 max-w-frame px-6">
        <div className="hidden h-full items-center lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <a href="/" className="w-fit text-[19px] font-semibold tracking-tight text-ink transition-colors hover:text-accent">
            YourProduct
          </a>

          <div className="flex items-center gap-8">
            {links.slice(0, 2).map((link) => (
              <a key={link.href} href={link.href} className="link-underline w-fit text-[13.5px] font-medium text-muted hover:text-accent">
                {link.label}
              </a>
            ))}
            <a href="/" aria-label="YourProduct home" className="flex items-center text-ink transition-colors hover:text-accent">
              <span className="block h-6 w-6 rounded-md border border-ink/25" />
            </a>
            {links.slice(2).map((link) => (
              <a key={link.href} href={link.href} className="link-underline w-fit text-[13.5px] font-medium text-muted hover:text-accent">
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center justify-end">
            <a href="/docs" className="inline-flex h-9 items-center rounded-full bg-[#0A0A0F] px-4 text-[13.5px] font-medium text-[#FAFAFA] ring-1 ring-inset ring-white/15 transition-transform hover:-translate-y-px">
              Read docs
            </a>
          </div>
        </div>

        <div className="flex h-full items-center justify-between lg:hidden">
          <a href="/" className="flex items-center gap-2.5 text-ink">
            <span className="block h-6 w-6 rounded-md border border-ink/25" />
            <span className="text-[19px] font-semibold tracking-tight">YourProduct</span>
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="-mr-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-ink transition-colors hover:bg-black/[0.04]"
          >
            <span aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-black/[0.07] bg-background px-6 py-5 lg:hidden">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="link-underline w-fit text-[13.5px] font-medium text-muted">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
```

The real Mnemo component is in `components/site-nav.tsx`; it adds the gradient
pill, the docs glyph and the centre logo run.

### 3.2 Hero

```tsx
// components/hero.tsx
import { AnimatedSection } from "./animated-section";

export function Hero() {
  return (
    <section id="top" className="relative w-full pb-14 pt-28 sm:pt-32 lg:pt-36">
      <div className="relative z-10 mx-auto max-w-frame px-6">
        <div className="mb-12 flex flex-col items-center justify-between gap-10 lg:flex-row">
          <AnimatedSection delay={100} className="w-full flex-1 text-center lg:text-left">
            <h1 className="text-[40px] font-medium leading-[1.05] tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[60px] xl:text-[66px]">
              Give your team a
              <br className="hidden sm:block" />{" "}
              <span
                className="italic font-normal tracking-normal text-[112%]"
                style={{ fontFamily: "var(--font-redaction), Georgia, serif" }}
              >
                system
              </span>{" "}
              that lasts.
            </h1>
          </AnimatedSection>

          <div className="flex w-full shrink-0 flex-col items-center gap-7 lg:w-auto lg:items-end">
            <AnimatedSection delay={200}>
              <p className="mx-auto max-w-[400px] text-center text-[15px] leading-[1.65] text-muted sm:text-[16px] lg:mx-0 lg:text-right">
                One sentence on what this is, who it is for, and what changes for
                them. Keep it concrete.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={300} className="flex w-full flex-wrap items-center justify-center gap-3 lg:justify-end">
              <a href="/docs" className="inline-flex items-center gap-2 rounded-[8px] border border-line bg-white px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md">
                Explore the docs
              </a>
              <a href="/sign-up" className="inline-flex items-center gap-2 rounded-[8px] bg-[#18181B] px-5 py-2.5 text-[14px] font-medium text-[#FAFAFA] shadow-[0_4px_14px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-white/10 transition-all hover:-translate-y-px hover:bg-[#27272A]">
                Get started
              </a>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
```

Add the product window (or a simpler visual) after the split row. Keep the
`max-w-frame` and `px-6` wrapper.

### 3.3 Marquee

```tsx
// components/pipeline-marquee.tsx
const stages = ["Capture", "Parse", "Index", "Rank", "Deliver", "Review"];

function StageSet() {
  return (
    <div className="flex items-center gap-16 whitespace-nowrap px-8 md:gap-24 md:px-12">
      {stages.map((stage, i) => (
        <div key={stage} className={`shrink-0 text-[28px] tracking-tight ${i === 3 ? "font-medium text-accent" : i === 4 ? "font-medium text-[#16A34A]" : "text-ink"}`}>
          {stage}
        </div>
      ))}
    </div>
  );
}

export function PipelineMarquee() {
  return (
    <section aria-label="The pipeline" className="mt-14 border-t border-line bg-hairline pb-6 md:mt-20">
      <div className="py-8">
        <div className="mx-auto flex w-full max-w-frame flex-col items-center gap-8 overflow-hidden px-6 md:flex-row">
          <div className="relative z-10 shrink-0 rounded-[6px] border border-line bg-white/50 px-3 py-1.5 text-[12px] font-medium uppercase tracking-widest text-muted">
            The pipeline
          </div>
          <div className="relative min-w-0 w-full flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,transparent_10px,black_60px,black_calc(100%_-_60px),transparent_calc(100%_-_10px),transparent)] md:[mask-image:linear-gradient(to_right,transparent,transparent_28px,black_104px,black_calc(100%_-_104px),transparent_calc(100%_-_28px),transparent)]">
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
  );
}
```

### 3.4 Explainer

```tsx
const cards = [
  { kicker: "What it is", title: "A short, specific claim", body: "Two or three sentences." },
  { kicker: "Why it matters", title: "The problem in plain language", body: "Two or three sentences." },
  { kicker: "How to explore", title: "The next action", body: "Two or three sentences." },
];

export function ProductExplainer() {
  return (
    <section className="w-full border-y border-line bg-white">
      <div className="mx-auto max-w-frame px-6 pb-16 pt-12 md:pb-20 md:pt-16">
        <div className="max-w-[640px]">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent-ink">
            Overview
          </span>
          <h2 className="mt-5 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-ink text-balance md:text-[34px]">
            The one-sentence version of the product, with a turn.
          </h2>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-3">
          {cards.map((card, i) => (
            <div key={card.kicker} className="flex flex-col border-t border-line pt-6">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] tabular-nums text-faint">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-ink">{card.kicker}</span>
              </div>
              <h3 className="mt-4 text-[19px] font-medium leading-snug tracking-[-0.01em] text-ink">{card.title}</h3>
              <p className="mt-3 text-[13.5px] leading-[1.7] text-muted">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 3.5 How it works

Use the structure from
[`06-components.md` §5](./06-components.md#5-how-it-works-alternating-rows). Keep
four rows maximum and alternate the visual side.

### 3.6 Comparison

Use the structure from
[`06-components.md` §6](./06-components.md#6-comparison-the-differentiator).
Keep the rows parallel and the winner's border as the only advantage.

### 3.7 Quote

Use the structure from
[`06-components.md` §7](./06-components.md#7-pull-quote--principle).

### 3.8 Final CTA

Use the structure from
[`06-components.md` §8](./06-components.md#8-final-cta). One primary action;
the "simplest next step" strip is optional.

### 3.9 Footer

Use the structure from
[`06-components.md` §9](./06-components.md#9-footer).

---

## 4. Copy templates

### Hero

```text
Give your [audience] a [serif noun] that [outcome].
[One sentence: what it stores/does, what changes, what it refuses to do.]
[Secondary: explore] [Primary: get started]
```

Example structure (not copy):

- "Give your AI agents a *memory* that lasts."
- "It stores what the agent learns and returns what still matters."
- "Fresh facts rise, stale ones fade, conflicts are flagged."

### Explainer

```text
What it is      → A [category] that [specific function].
Why it matters  → The default approach [fails in this way].
How to explore  → [Action], [action], or [action].
```

### How it works

Each row:

```text
[label]        one word, uppercase, accent
[title]        a claim, not a description
[body]         2–3 sentences with one mechanism or number
[in → out]     the transformation, in plain language
[visual]       a simple static diagram
```

### Comparison

```text
Other tools:  4 parallel limitations, no competitor names
Your product: 4 parallel capabilities, same grammatical shape
```

### Quote

```text
[Belief in one sentence.] [What the product does instead, in one sentence.]
```

No quotation marks unless it is a real, attributed quote.

### Final CTA

```text
[Outcome] with a serif word.
[One sentence of reassurance.]
[Primary] [Secondary]
[Optional: 3 numbered commands]
```

---

## 5. Responsive composition

| Viewport | Composition |
|---|---|
| 320–639 | Single column; centred hero; stacked buttons; mobile nav; product visual simplified |
| 640–767 | Hero headline grows; chips inline; still one column |
| 768–1023 | Three-column explainer; alternating row layout; comparison pair; still mobile nav |
| 1024–1279 | Desktop nav; split hero; two-column rows; larger display type |
| 1280+ | Hero at 66px; frame at 1200px; everything at its ceiling |

Test at **320, 375, 768, 1024, 1440**. The common breakages:

- the centre nav run colliding with the wordmark at ~1024px;
- the comparison cards becoming too tall on tablet;
- the product window overflowing horizontally;
- the hero headline leaving one word on its own line at 768px.

---

## 6. Pre-flight checklist

**Structure**

- [ ] One `<h1>`, sequential `<h2>`/`<h3>` after it.
- [ ] Sections use `max-w-frame px-6`.
- [ ] White bands use `border-y border-line bg-white`.
- [ ] Anchors use `scroll-mt-16` (or `scroll-mt-[120px]` if there is a sub-bar).
- [ ] The page has a skip link and `<main id="main">`.

**Visual**

- [ ] Canvas is `#F7F7F5`; text is `#0A0A0F`.
- [ ] Headings are weight 500; only tiny labels are 700.
- [ ] One serif italic word per major heading.
- [ ] Indigo appears on kickers, links and one focus ring only.
- [ ] Cards have a 1px `#E5E5E5` border; shadows are `soft`/`lift`.
- [ ] Radii follow 6 / 8 / 12 / 24.
- [ ] No pure white page background.

**Content**

- [ ] Each section answers one question.
- [ ] No invented customers, logos, or benchmarks.
- [ ] Numbers are real and sourced.
- [ ] Headings make a claim; body copy explains the mechanism.
- [ ] The CTA is a verb, not "Submit".

**Behaviour**

- [ ] Reveals play once and stop under reduced motion.
- [ ] The marquee pauses on hover and stops under reduced motion.
- [ ] Nav is solid, fixed, and unchanged on scroll.
- [ ] Mobile menu reports `aria-expanded` and closes on selection.
- [ ] All buttons have hover, focus-visible and active states.
- [ ] The page works with JavaScript disabled (content visible).

**Performance**

- [ ] Fonts are `display: swap`; only used cuts are loaded.
- [ ] No layout animation; only `opacity`/`transform`.
- [ ] The product mock is DOM/CSS, not a heavy video.
- [ ] No unused Google Font weights.

Next: [`10-porting-guide.md`](./10-porting-guide.md).
