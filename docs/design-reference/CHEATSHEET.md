# One-page cheat sheet

Everything you need to reproduce the look, without reading the long docs.

## Tokens

```css
:root {
  --background: #f7f7f5;  /* warm paper canvas */
  --foreground: #0a0a0f;  /* ink */
  --ink:        #0a0a0f;
  --muted:      #5e6472;  /* secondary text */
  --faint:      #69707e;  /* tertiary text, small labels */
  --line:       #e5e5e5;  /* 1px borders */
  --hairline:   #efefec;  /* quieter dividers */
  --accent:     #4f46e5;  /* indigo */
  --accent-soft:#eef0ff;
  --accent-ink: #3730a3;
  --surface:    #ffffff;  /* white bands + cards */
  --surface-2:  #fcfcfb;  /* card tint */
  --btn:        #18181b;  /* primary dark button */
  --btn-hover:  #27272a;
  --success:    #22c55e;
  --danger:     #ef4444;
  --warning:    #f59e0b;
}
```

## Type

```css
--font-sans:  "Outfit", system-ui, sans-serif;
--font-serif: "Redaction 35", Georgia, serif;
--font-mono:  ui-monospace, "SFMono-Regular", Menlo, monospace;
```

| Style | Size | Line | Tracking | Weight |
|---|---|---|---|---|
| Hero (xl) | 66px | 1.05 | -0.035em | 500 |
| Hero | 60px | 1.05 | -0.035em | 500 |
| H2 band | 46px | 1.10 | -0.030em | 500 |
| H2 section | 40px | 1.20 | -0.020em | 500 |
| H3 step | 30px | 1.20 | -0.020em | 500 |
| Card title | 19px | 1.30 | -0.010em | 500 |
| Body large | 16px | 1.70 | 0 | 400 |
| Body | 14.5px | 1.75 | 0 | 400 |
| Body small | 13.5px | 1.70 | 0 | 400 |
| UI / nav | 13.5px | 1.40 | 0 | 500 |
| Caption | 12px | 1.50 | 0 | 400 |
| Kicker | 11px | 1.20 | 0.16em | 700, uppercase |
| Micro mono | 10.5px | 1.20 | 0.14em | 700, uppercase |

**Serif accent recipe**

```tsx
<span
  className="italic font-normal tracking-normal text-[112%]"
  style={{ fontFamily: "var(--font-redaction), Georgia, serif" }}
>
  memory
</span>
```

## Layout

```text
Frame          max-width: 1200px
Gutter         padding-inline: 24px
Nav height     64px
Section pad    padding-top: 48/64px; padding-bottom: 64/80px
Section gap    48–80px
Hero top pad   112–144px
Card radius    12px (rounded-xl)
CTA radius     24px (rounded-[24px])
Button radius  8px (rounded-lg) or 999px (pill)
Chip radius    6px
```

## The five classes you will reuse

```html
<!-- Page frame -->
<div class="mx-auto w-full max-w-frame px-6">...</div>

<!-- Uppercase mono kicker -->
<span class="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent-ink">
  Overview
</span>

<!-- Big heading -->
<h2 class="mt-5 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-ink text-balance md:text-[34px]">
  A short, specific promise.
</h2>

<!-- Body copy -->
<p class="mt-3 text-[13.5px] leading-[1.7] text-muted">...</p>

<!-- Hairline card -->
<div class="rounded-xl border border-line bg-[#FCFCFB] p-6 md:p-8">...</div>
```

## Buttons

```html
<!-- Primary -->
<a class="inline-flex items-center gap-2 rounded-lg bg-[#18181B] px-5 py-2.5 text-[14px] font-medium text-[#FAFAFA] shadow-[0_4px_14px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-white/10 transition-all hover:-translate-y-px hover:bg-[#27272A]">
  Start
</a>

<!-- Secondary -->
<a class="inline-flex items-center gap-2 rounded-[8px] border border-line bg-white px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md">
  Learn more
</a>
```

## Section bands

```html
<!-- Narrative: warm paper -->
<section class="w-full pt-12 pb-16 md:pt-16 md:pb-20">...</section>

<!-- Product / comparison: white band -->
<section class="w-full border-y border-line bg-white">
  <div class="mx-auto max-w-frame px-6 pt-12 pb-16 md:pt-16 md:pb-20">...</div>
</section>
```

## Motion

```css
/* fade up 14px, once, 0.7s */
animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
```

```tsx
<AnimatedSection delay={200}>...</AnimatedSection>
```

Delays: `100 → 200 → 300 → 400 → 460ms` down a section. Stop everything under
`prefers-reduced-motion: reduce`.

## Rules that keep it premium

1. One accent colour. No second brand colour.
2. One serif italic word per heading. Not a serif sentence.
3. Hairlines, not drop shadows.
4. White is a **band**, not the page canvas.
5. Never use pure `#000` or `#FFF` for text.
6. Body copy stays at 13.5–16px; let whitespace carry the scale.
7. Headings use weight 500, not 700.
8. Animate only `opacity` and `transform`.
9. Keep section padding consistent; do not improvise per section.
10. Every section answers one question and has one job.
