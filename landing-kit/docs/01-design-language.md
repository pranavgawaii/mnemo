# 01 · Design language

## What this look is

An **editorial developer-tool** aesthetic: the calm of a well-set technical
journal, the precision of a developer console, and the warmth of paper rather
than the glare of a white SaaS dashboard.

It comes from Specboard and is used unchanged on Mnemo's marketing site. The
content changes; the grammar stays the same.

Three words to hold onto: **warm, sharp, quiet.**

- **Warm** — the canvas is `#F7F7F5`, not white. Text is `#0A0A0F`, not black.
- **Sharp** — large type is tightly tracked; rules are 1px; corners are modest.
- **Quiet** — one indigo accent, almost no shadow, motion that only reveals.

---

## The eight principles

### 1. Paper, not glass

The page is a printed page. There is no glassmorphism, no neon glow, no
gradient mesh behind the hero. The only soft colour is a low-opacity ambient
wash under a product window, and even that is optional.

**Do:** `background: #F7F7F5` and white bands.
**Don't:** `#FFFFFF` page canvas, purple-to-pink gradients, blurred glass cards.

### 2. One frame, one rhythm

Everything sits in a single `1200px` frame with `24px` gutters. Section after
section uses the same horizontal rule. The repetition is the luxury: the eye
learns where content starts.

**Do:** `mx-auto w-full max-w-frame px-6`.
**Don't:** alternate between 1100px, 1280px and full-bleed content for no reason.

### 3. Hairlines carry the structure

Borders are `1px` and quiet (`#E5E5E5`). Sections, cards, and step rows are
separated by rules, not by heavy shadows or filled boxes. The page should feel
drawn, not assembled from floating panels.

**Do:** `border border-line`, `border-t border-line`, `border-y border-line`.
**Don't:** 2px borders, thick dividers, or a shadow on every card.

### 4. Two typefaces, two jobs

**Outfit** does the work: navigation, headings, body, buttons, labels.
**Redaction 35 Italic** does one thing: a single emphasised word inside a
display heading, and occasionally a pull quote.

The contrast is the personality. It only works if the serif stays rare.

**Do:** `a <em>memory</em> that lasts`.
**Don't:** set a whole paragraph in serif, or use serif for UI labels.

### 5. One accent, used like punctuation

Indigo `#4F46E5` is the only brand colour. It marks links, kickers, the active
state and the focus ring. Large indigo fills are not part of the system.

**Do:** 5% of the page at most.
**Don't:** an indigo hero, indigo section backgrounds, or two accent colours.

### 6. Sections are chapters

The landing page alternates between the warm canvas and a white band. Each band
change signals a new chapter. Layout changes too: split hero, marquee, three
numbered columns, alternating rows, two comparison cards, centred quote, boxed
CTA. No two adjacent sections look the same.

**Do:** white for product/comparison bands; canvas for narrative and closing.
**Don't:** stack five identical three-column card grids.

### 7. Type does the shouting

Hierarchy comes from size, weight and space — not colour. A section heading is
`40px` at weight `500`; body is `14.5px` at weight `400`. The jump is large, the
palette is small.

**Do:** `font-medium` (500) for display type, generous margins.
**Don't:** `font-bold` headings and five competing accent colours.

### 8. Motion reveals, never performs

Content fades up `14px` once when it enters the viewport, over `0.7s` with an
ease-out curve. The marquee drifts. Buttons lift `1px`. That is the whole
vocabulary. Nothing loops in the reader's peripheral vision, and everything
stops under `prefers-reduced-motion`.

**Do:** one reveal per section, staggered by 80–100ms.
**Don't:** parallax, scroll-jacking, bouncing icons, or hover effects that move
layout.

---

## The page's visual temperature

| Dimension | Setting |
|---|---|
| Contrast | High for text, very low for surfaces |
| Density | Airy; one idea per viewport |
| Ornament | Almost none; rules and numerals only |
| Corners | 6px chips, 8px buttons, 12px cards, 24px CTA panel |
| Shadow | A hint of lift, never a glow |
| Colour | ~70% paper/white, ~25% ink, ~5% indigo |
| Voice | Plain, specific, technical, no hype |

---

## The signature moves

These are the details that make the system recognisable. Use three or four of
them in a page; using all of them everywhere becomes a costume.

1. **The italic serif word** inside a sans headline.
2. **The mono uppercase kicker** above a section heading.
3. **The numbered editorial card** (`01 / WHAT IT IS`) with a top rule.
4. **The full-bleed marquee** between a hairline band.
5. **The alternating step row** with an "in → out" mono footer.
6. **The comparison pair** where only the winning card gets an accent border.
7. **The centred pull-quote** with no quotation marks and no attribution.
8. **The boxed closing CTA** on white, inside a rounded 24px panel.
9. **The hairline underline sweep** on nav links.
10. **The halftone wordmark footer** (optional; a plain footer also works).

---

## Voice and copy

The visual system expects copy with the same restraint.

- Lead with the concrete noun, not the benefit adjective: "a persistent memory
  service", not "unlock the power of memory".
- Use short declarative sentences. One idea per sentence.
- Numbers and mechanisms beat adjectives: "180-day half-life", "soft-delete".
- Kickers are 1–3 words, Title Case or uppercase: `Overview`, `How it works`,
  `The difference`.
- Headings can run two lines, but the second line should add a turn, not repeat.
- Do not invent testimonials or customer logos. If there are none, use a design
  principle, a technical fact, or an open-source note instead.

---

## What breaks the look

| Mistake | Why it breaks |
|---|---|
| Pure white canvas | Loses the paper warmth; every band stops reading as a band |
| Two accent colours | The single-indigo discipline disappears |
| Serif body copy | The accent becomes the voice; the page turns into a magazine pastiche |
| Bold headings at 700–800 | The type becomes shouty; the system is built on 500 |
| Large shadows / glass cards | Reads as generic SaaS, not editorial |
| Rounded `2xl` everywhere | The 6/8/12/24 radius hierarchy collapses |
| Full-width centred text | Kills the asymmetric, art-directed feel |
| Animating everything on scroll | The reveal stops meaning "this matters" |
| A second font for "variety" | Two families is the whole contract |
| Dark mode auto-inversion | The palette is designed as light-only; invert it deliberately or not at all |

---

## A quick test

Squint at the page. You should see:

1. a large near-black headline with one italic serif word,
2. a lot of warm grey space,
3. a thin horizontal rule,
4. a small indigo label,
5. and almost no boxes.

If you see five coloured cards and a gradient, you have left the system.

Next: [`02-fonts.md`](./02-fonts.md).
