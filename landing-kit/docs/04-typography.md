# 04 · Typography

The page has one sans, one serif accent and one mono texture. The hierarchy is
built from **size, weight and spacing**, not from extra colours or families.

---

## 1. The three voices

| Voice | Family | Job | Where |
|---|---|---|---|
| Structural | **Outfit** | Navigate, read, explain | 95% of the page |
| Editorial | **Redaction 35 Italic** | Emphasise one word | Display headings, occasionally a quote |
| Technical | System mono | Label, count, quote code | Kickers, metadata, commands |

The serif is a **highlight**, not a voice. One word per heading is the maximum.

---

## 2. The scale

Sizes are in px because the original design is set in px. If your project uses
rem, divide by 16. The ratios matter more than the unit.

| # | Style | Size | Line-height | Tracking | Weight | Typical use |
|---|---|---|---|---|---|---|
| 1 | Display XL | 66px | 1.05 | -0.035em | 500 | Hero on `xl` |
| 2 | Display L | 60px | 1.05 | -0.035em | 500 | Hero on `lg` |
| 3 | Display M | 52px | 1.05 | -0.035em | 500 | Hero on `sm` |
| 4 | Display S | 40px | 1.05 | -0.035em | 500 | Hero on mobile |
| 5 | Band H2 | 46px | 1.10 | -0.030em | 500 | Large comparison/CTA headings |
| 6 | Section H2 | 40px | 1.20 | -0.020em | 500 | "How it works" |
| 7 | Section H2 (small) | 32–34px | 1.15–1.20 | -0.020em | 500 | Mobile / explainer |
| 8 | Step H3 | 30px | 1.20 | -0.020em | 500 | Alternating rows |
| 9 | Card H3 | 19px | 1.30 | -0.010em | 500 | Three-column cards |
| 10 | Pull quote | 30px | 1.45 | -0.010em | 500 | Design-principle section |
| 11 | Body L | 16px | 1.70 | 0 | 400 | Hero support, section intros |
| 12 | Body | 14.5px | 1.75 | 0 | 400 | Step descriptions |
| 13 | Body S | 13.5px | 1.70 | 0 | 400 | Card copy, footer |
| 14 | UI | 13.5px | 1.40 | 0 | 500 | Nav, buttons |
| 15 | Caption | 12px | 1.50 | 0 | 400 | Fine print, chip labels |
| 16 | Kicker | 11px | 1.20 | 0.16em | 700 | Uppercase section labels |
| 17 | Micro mono | 10.5px | 1.20 | 0.14em | 700 | Uppercase mono labels |
| 18 | Mono data | 11–12px | 1.50 | 0 | 400 | Commands, metrics, "in → out" |

### Why these exact jumps

- The display range is huge (`40 → 66px`) but the body range is narrow
  (`13.5 → 16px`). That is the editorial signature: **loud headlines, quiet
  copy**.
- Weight stays at 500 for display and 400 for body. The page never uses 700
  except in tiny uppercase labels.
- Negative tracking scales with size: `-0.035em` at 60–66px, `-0.02em` at
  30–40px, `-0.01em` at 19px, `0` at body sizes.
- Uppercase labels get **positive** tracking (`0.14–0.16em`) to breathe.

---

## 3. Responsive behaviour

| Element | Mobile | `sm` 640 | `md` 768 | `lg` 1024 | `xl` 1280 |
|---|---|---|---|---|---|
| Hero | 40px | 52px | 52px | 60px | 66px |
| Band H2 | 34px | 34px | 46px | 46px | 46px |
| Section H2 | 28–32px | 32px | 40px | 40px | 40px |
| Step H3 | 26px | 26px | 30px | 30px | 30px |
| Body | 13.5–15px | 15px | 15–16px | 16px | 16px |

Use the smallest number of breakpoints that keeps the lines from breaking badly.
The original uses `sm`, `md`, `lg`, `xl` only.

### The hero line break

```tsx
<h1 className="...">
  Give your AI agents a
  <br className="hidden sm:block" />{" "}
  <span className="italic ...">memory</span> that lasts.
</h1>
```

The `<br>` is hidden on mobile so the headline can wrap naturally; on `sm+` it
forces the intended two-line composition. Keep the explicit `{" "}` around the
inline serif span so words do not collide.

---

## 4. Recipes

### Display heading with one serif word

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

### Section heading

```tsx
<h2 className="text-[32px] font-medium leading-[1.2] text-ink text-balance md:text-[40px]">
  From a fact to a recall.
  <br />
  Nothing gets lost, nothing goes stale.
</h2>
```

### Uppercase kicker (sans)

```tsx
<span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
  How it works
</span>
```

### Uppercase kicker (mono, accent)

```tsx
<span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent-ink">
  Overview
</span>
```

Use the mono version when the label is tied to a technical object or a numbered
card. Use the sans version for a plain section chapter label.

### Card title + body

```tsx
<h3 className="mt-4 text-[19px] font-medium leading-snug tracking-[-0.01em] text-ink">
  A memory service for agents
</h3>
<p className="mt-3 text-[13.5px] leading-[1.7] text-muted">
  One FastAPI app over Postgres + pgvector with an API you can call in three
  lines of curl.
</p>
```

### Pull quote

```tsx
<p className="mx-auto mt-6 max-w-[860px] text-[22px] font-medium leading-[1.45] tracking-[-0.01em] text-ink text-balance md:text-[30px]">
  Memory that forgets is memory you can trust.
</p>
```

No quotation marks, no attribution, no serif. The scale and the surrounding
space do the work.

### Mono annotation

```tsx
<p className="mt-5 border-t border-hairline pt-4 font-mono text-[11px] text-faint">
  a sentence in → an embedded, addressable memory out
</p>
```

---

## 5. Measure and wrapping

| Content | Maximum width |
|---|---|
| Hero support paragraph | `400px` |
| Section intro | `560–580px` |
| Section heading | `640px` |
| Pull quote | `860px` |
| CTA panel heading | `720px` |
| CTA panel support | `560px` |

Aim for **45–75 characters** per line. The body copy is small, so a too-wide
measure becomes tiring quickly.

Use `text-balance` on headings of 1–3 lines. It is supported in modern browsers
and degrades to normal wrapping. Do not apply it to long paragraphs; it is
expensive and can create ragged blocks.

---

## 6. Weight rules

| Weight | Use |
|---|---|
| 400 | Body, descriptions, serif accent |
| 500 | Display headings, nav, buttons, card titles |
| 600 | Wordmark only |
| 700 | Tiny uppercase kickers (11px), footer wordmark |
| 800 | Footer halftone wordmark only |

**Never** use 700+ for a display heading. The large sizes already carry the
weight; bolding them makes the page feel like a template.

---

## 7. Numerals

Use `tabular-nums` for indices and aligned numbers:

```tsx
<span className="font-mono text-[11px] tabular-nums text-faint">01</span>
```

This keeps `01 / 02 / 03` aligned in a three-column row.

---

## 8. What not to do

| Don't | Why |
|---|---|
| Set a paragraph in Redaction | The serif becomes a body face and the page turns into pastiche |
| Use two serif words in one heading | The emphasis stops being emphasis |
| Bold the serif | Redaction's contrast is in the strokes, not the weight |
| Add letter-spacing to body copy | It hurts readability and looks like a caption |
| Use uppercase for long labels | Only 1–3 words; uppercase is a texture |
| Mix in a third family | The two-family contract is the design |
| Use `#000` or `#FFF` for text | Both are harsher than the warm palette |
| Center every section | The system needs asymmetry to breathe |
| Use `text-4xl`/`text-5xl` defaults | The exact px sizes and tracking are part of the look |
| Use `leading-none` on multi-line headings | The lines collide; use `1.05–1.2` |

---

## 9. A complete type specimen (copy-paste)

```tsx
<div className="mx-auto max-w-frame px-6 py-16">
  <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent-ink">
    Typography
  </span>

  <h1 className="mt-5 text-[40px] font-medium leading-[1.05] tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[60px]">
    A system with a
    <span
      className="ml-2 italic font-normal tracking-normal text-[112%]"
      style={{ fontFamily: "var(--font-redaction), serif" }}
    >
      voice
    </span>
    .
  </h1>

  <p className="mt-6 max-w-[560px] text-[15px] leading-[1.7] text-muted md:text-[16px]">
    Outfit carries the structure. Redaction carries one word. The mono carries
    the small technical labels. That is the entire cast.
  </p>

  <hr className="my-10 border-line" />

  <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.02em] text-ink md:text-[40px]">
    Section heading
  </h2>
  <h3 className="mt-6 text-[19px] font-medium leading-snug tracking-[-0.01em] text-ink">
    Card heading
  </h3>
  <p className="mt-3 max-w-[580px] text-[14.5px] leading-[1.75] text-muted">
    Body copy at 14.5px with a 1.75 line-height. It is deliberately small; the
    whitespace around it is what makes the page feel generous.
  </p>
</div>
```

Next: [`05-layout-spacing.md`](./05-layout-spacing.md).
