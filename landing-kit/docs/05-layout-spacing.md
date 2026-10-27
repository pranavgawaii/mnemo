# 05 · Layout and spacing

The layout is a single column of **chapters** inside one frame. The consistency
of the frame and the vertical rhythm is what makes a page of very different
sections feel like one object.

---

## 1. The frame

```css
.frame {
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: 24px;
}
```

Tailwind:

```html
<div class="mx-auto w-full max-w-frame px-6">...</div>
```

| Token | Value | Notes |
|---|---|---|
| Frame | `1200px` | `max-w-frame` in the Tailwind config |
| Gutter | `24px` | `px-6`; never remove it on mobile |
| Content width | `1152px` | 1200 − 2 × 24 |
| Nav height | `64px` | `h-16` |
| Full-bleed | edge to edge | Only bands and the marquee, never text |

Every section's content uses the same frame. Full-bleed elements (white bands,
the marquee strip, the hero glow) may stretch to the viewport, but the text
inside them still returns to the frame.

---

## 2. Section rhythm

The default section padding is:

```html
<section class="w-full pt-12 pb-16 md:pt-16 md:pb-20">
  <div class="mx-auto max-w-frame px-6">...</div>
</section>
```

| Space | Mobile | Desktop |
|---|---|---|
| Top | 48px (`pt-12`) | 64px (`pt-16`) |
| Bottom | 64px (`pb-16`) | 80px (`pb-20`) |

Variations used in the original:

| Section | Top | Bottom | Why |
|---|---|---|---|
| Hero | 112px (`pt-28`) → 144px (`lg:pt-36`) | 56px (`pb-14`) | Clears the fixed 64px nav and gives the headline air |
| Marquee | 56–80px above | 24px + caption | It is a band, not a section |
| Explainer | 48/64px | 64/80px | White band |
| How it works | 48/64px | 64/80px | Default |
| Comparison | 48/64px | 64/80px | White band |
| Quote | 48/64px | 64/80px | Centred, no band |
| Final CTA | 48/64px | 80/96px | More room to close |
| Footer | its own component | its own component | — |

**Rule:** when in doubt, use `pt-12 md:pt-16 pb-16 md:pb-20`. Consistency beats
per-section improvisation.

### Vertical gaps inside a section

| Relationship | Gap |
|---|---|
| Kicker → heading | `mt-5` / `mt-6` (20–24px) |
| Heading → intro paragraph | `mt-4`–`mt-6` (16–24px) |
| Intro → content grid | `mt-12`–`mt-14` (48–56px) |
| Between cards | `gap-10` (40px) |
| Between alternating rows | `gap-16 md:gap-20` (64–80px) |
| Heading → CTA buttons | `mt-9` (36px) |
| CTA button row → next steps | `mt-10` (40px) |

---

## 3. Band alternation

The page uses two surfaces:

| Surface | Classes | Use |
|---|---|---|
| Paper | `bg-background` (default) | Hero, narrative, how it works, quote, final CTA |
| White band | `border-y border-line bg-white` | Product explainer, comparison table |

The transition is always a **1px rule**, never a shadow or a rounded container.
This is what makes the page read like a printed report rather than a stack of
cards.

```html
<section class="w-full border-y border-line bg-white">
  <div class="mx-auto max-w-frame px-6 pt-12 pb-16 md:pt-16 md:pb-20">
    ...
  </div>
</section>
```

### Band order used by Mnemo

```text
paper      Hero
paper      Marquee (tinted hairline strip)
white      Product explainer
paper      How it works
white      Comparison
paper      Pull quote
paper      Final CTA (white panel on paper)
paper      Footer
```

Two white bands separated by one paper section is the maximum. More than that
and the alternation stops reading as structure.

---

## 4. Grids

### Three numbered columns

```html
<div class="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-3">
  <div class="flex flex-col border-t border-line pt-6">...</div>
  <div class="flex flex-col border-t border-line pt-6">...</div>
  <div class="flex flex-col border-t border-line pt-6">...</div>
</div>
```

- `gap-x-10` (40px) gives each column a generous gutter.
- `gap-y-10` handles the mobile stack.
- The top border is the only card chrome; the card is not a box.
- Number + kicker sit on one baseline; title follows at `mt-4`.

### Alternating two-column rows

```html
<div class="flex flex-col items-center gap-12 md:flex-row lg:gap-20">
  <div class="flex-1 md:px-10">Copy</div>
  <div class="w-full max-w-[500px] flex-1">Visual</div>
</div>
```

Reverse every other row with `md:flex-row-reverse`. On mobile, everything stacks
in DOM order, so keep the copy first.

### Comparison pair

```html
<div class="mx-auto flex max-w-[900px] flex-col gap-5 md:flex-row">
  <div class="flex-1 rounded-xl border border-line bg-[#FCFCFB] p-6 md:p-8">...</div>
  <div class="flex-1 rounded-xl border border-accent/50 bg-white p-6 shadow-soft md:p-8">...</div>
</div>
```

The winner is distinguished by **one accent border**, not by a coloured fill.
The loser gets the warmer card tint.

### Split hero

```html
<div class="mb-12 flex flex-col items-center justify-between gap-10 lg:flex-row">
  <div class="w-full flex-1 text-center lg:text-left">Headline</div>
  <div class="flex w-full shrink-0 flex-col items-center gap-7 lg:w-auto lg:items-end">
    Copy + buttons
  </div>
</div>
```

The headline is left-aligned on desktop and right-aligned copy sits beside it.
On mobile both centre. This asymmetry is a signature; avoid a fully centred
hero with a centred headline and centred buttons.

---

## 5. Spacing scale

The project uses Tailwind's 4px base. The values that actually appear:

| Token | px | Typical use |
|---|---|---|
| `1` | 4 | icon gaps |
| `1.5` | 6 | tiny chip padding |
| `2` | 8 | icon/text gap |
| `2.5` | 10 | button vertical padding |
| `3` | 12 | inline gaps |
| `3.5` | 14 | chip row gaps |
| `4` | 16 | paragraph top margin |
| `5` | 20 | kicker → heading |
| `6` | 24 | gutter, card padding |
| `8` | 32 | card padding on desktop |
| `9` | 36 | heading → CTA |
| `10` | 40 | card grid gap |
| `12` | 48 | section top (mobile) |
| `14` | 56 | heading → grid |
| `16` | 64 | section top (desktop) |
| `20` | 80 | section bottom (desktop), row gap |
| `24` | 96 | closing CTA bottom |

Stick to these. The system has no `7`, `11`, `13` etc. Arbitrary one-off values
are reserved for very small optical adjustments (`h-9`, `w-[74px]`).

---

## 6. Radii

| Element | Radius | Tailwind |
|---|---|---|
| Chip / tag | 6px | `rounded-[6px]` |
| Button | 8px | `rounded-lg` |
| Card | 12px | `rounded-xl` |
| CTA panel | 24px | `rounded-[24px]` |
| Pill CTA | 999px | `rounded-full` |
| Product window shell | 24px | `rounded-[24px]` |
| Input / small control | 8px | `rounded-lg` |

The hierarchy is intentional: **the larger the object, the larger the radius**.
Do not use `rounded-2xl` on every card; it flattens the hierarchy and reads as
generic SaaS.

---

## 7. Borders and shadows

### Borders

```css
border: 1px solid #E5E5E5;   /* line */
border: 1px solid #EFEFEC;   /* hairline, internal */
border-bottom: 1px solid rgba(0, 0, 0, 0.07); /* nav */
```

- Section boundaries: `border-y border-line`.
- Card boundaries: `border border-line`.
- Internal dividers: `border-t border-hairline`.
- Nav: `border-b border-black/[0.07]` (a touch softer than `line`).
- Do not use 2px borders except for a deliberate active tab indicator in a
  product mock.

### Shadows

Only two:

```ts
boxShadow: {
  soft: "0 1px 2px rgba(10,10,15,0.04), 0 8px 24px -12px rgba(10,10,15,0.10)",
  lift: "0 1px 2px rgba(10,10,15,0.05), 0 20px 40px -24px rgba(10,10,15,0.18)",
}
```

- `shadow-soft`: the winning comparison card, secondary buttons, a highlighted
  panel.
- `shadow-lift`: a hero product window or a lifted primary control.
- Everything else uses a border.

The primary dark button has its own two-layer shadow plus an inset top
highlight; see [`06-components.md`](./06-components.md).

---

## 8. Z-index

Keep the stack short and explicit:

| Layer | z-index |
|---|---|
| Page content | `10` |
| Sticky docs rail | `30` |
| Fixed nav | `50` |
| Skip link focus | `60` |

No `z-[9999]`. If a new layer needs a higher number, the layout is probably
wrong.

---

## 9. Overflow and sticky

```css
html,
body {
  overflow-x: clip; /* NOT hidden */
}
```

`clip` prevents horizontal scroll without creating a scroll container. `hidden`
on `html`/`body` would break `position: sticky` inside the page (the docs
sidebar relies on this).

---

## 10. Responsive rules

| Breakpoint | Width | Change |
|---|---|---|
| default | < 640 | Single column, centred hero, stacked CTAs, mobile nav |
| `sm` | 640 | Hero headline grows; chips can sit inline |
| `md` | 768 | Three-column grids, alternating rows, band headings grow |
| `lg` | 1024 | Desktop nav appears, split hero, two-column CTA/footer |
| `xl` | 1280 | Hero reaches 66px |

Rules:

1. Design the mobile stack first; the desktop composition is the enhancement.
2. Do not hide content on mobile unless it is decorative (the product window can
   be simplified, not removed).
3. Nav switches at `lg`, not `md`; the centred desktop nav needs the width.
4. Tap targets are at least 36×36px (`h-9 w-9` icon buttons), preferably 44px.
5. Use `px-6` at every breakpoint; the frame gets wider, not the gutter.

---

## 11. A section template

```tsx
export function Section({
  id,
  band = false,
  children,
}: {
  id?: string;
  band?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={
        band
          ? "w-full scroll-mt-16 border-y border-line bg-white"
          : "w-full scroll-mt-16"
      }
    >
      <div className="mx-auto max-w-frame px-6 pt-12 pb-16 md:pt-16 md:pb-20">
        {children}
      </div>
    </section>
  );
}
```

Use `scroll-mt-16` (64px) so in-page anchors clear the fixed nav. If the page
has a secondary sticky bar, increase it to `120px`.

Next: [`06-components.md`](./06-components.md).
