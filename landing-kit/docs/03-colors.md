# 03 · Colour

The palette is small on purpose: **one canvas, one ink, one accent, one line**.
Everything else is a tint of those four or a semantic signal used in data only.

---

## Core palette

| Token | Hex | Tailwind | Role |
|---|---|---|---|
| `background` | `#F7F7F5` | `bg-background` | Warm paper canvas; the default page surface |
| `foreground` / `ink` | `#0A0A0F` | `text-foreground`, `text-ink` | Primary text and dark buttons |
| `muted` | `#5E6472` | `text-muted` | Secondary body copy, descriptions |
| `faint` | `#69707E` | `text-faint` | Tertiary labels, metadata, small mono |
| `line` | `#E5E5E5` | `border-line` | Section rules, card borders, dividers |
| `hairline` | `#EFEFEC` | `border-hairline` | Quieter internal dividers |
| `accent` | `#4F46E5` | `text-accent`, `bg-accent` | Links, active states, focus ring |
| `accent-soft` | `#EEF0FF` | `bg-accent-soft` | Tinted badge/background |
| `accent-ink` | `#3730A3` | `text-accent-ink` | Kickers and links on light surfaces |
| `white` | `#FFFFFF` | `bg-white` | Full-bleed bands and cards |
| `card` | `#FCFCFB` | `bg-[#FCFCFB]` | Slightly warm card surface |
| `button` | `#18181B` | `bg-[#18181B]` | Primary button base |
| `button-hover` | `#27272A` | `hover:bg-[#27272A]` | Primary button hover |

The three near-blacks are deliberate:

- `#0A0A0F` — text and ink (a touch of blue, never pure black);
- `#18181B` — the primary button, slightly lifted from the text colour;
- `#27272A` — its hover state.

---

## Semantic colours

These are for **data and state**, not for decoration. They appear inside product
mocks, comparison checks, conflict cards and charts.

| Meaning | Solid | Text-safe | Soft background | Border |
|---|---|---|---|---|
| Success | `#22C55E` | `#15803D` / `#16A34A` | `#F0FDF4` | `#BBF7D0` |
| Danger | `#EF4444` | `#B91C1C` | `#FEF2F2` | `#FECACA` |
| Warning | `#F59E0B` | `#B45309` | `#FFFBEB` | `#FDE68A` |
| Info / accent | `#4F46E5` | `#3730A3` | `#EEF0FF` | `#C7D2FE` |

**Important:** the solid colours (`#22C55E`, `#EF4444`, `#F59E0B`) do **not**
meet AA for normal text on white. Use them for dots, bars, icons and fills, and
use the text-safe column for words.

---

## Ambient glows (optional)

The product window in the hero sits on three very soft blurred washes. They are
the only gradients in the system.

| Colour | Opacity | Position |
|---|---|---|
| `#C7D2FE` (periwinkle) | 50% | left |
| `#E7D9FB` (lilac) | 45% | centre |
| `#BFE3F7` (sky) | 45% | right |

```html
<div class="pointer-events-none absolute inset-0 -z-10">
  <div class="absolute -left-[70px] top-[70px] bottom-[150px] w-[360px] rounded-full bg-[#C7D2FE] opacity-50 blur-[90px] mix-blend-multiply"></div>
  <div class="absolute left-1/2 top-[90px] bottom-[150px] w-[560px] -translate-x-1/2 rounded-full bg-[#E7D9FB] opacity-45 blur-[90px] mix-blend-multiply"></div>
  <div class="absolute -right-[70px] top-[70px] bottom-[150px] w-[360px] rounded-full bg-[#BFE3F7] opacity-45 blur-[90px] mix-blend-multiply"></div>
</div>
```

Keep the washes **inside** the card's vertical bounds so the blur cannot leak
into the next section. If in doubt, omit them; the page works without any glow.

---

## Contrast

Measured WCAG 2.1 ratios on this exact palette:

| Foreground | On `#F7F7F5` | On `#FFFFFF` | On `#EEF0FF` |
|---|---|---|---|
| Ink `#0A0A0F` | 18.41 | 19.75 | 17.44 |
| Muted `#5E6472` | 5.53 | 5.93 | 5.24 |
| Faint `#69707E` | 4.64 | 4.98 | **4.39** |
| Accent `#4F46E5` | 5.86 | 6.29 | 5.55 |
| Accent ink `#3730A3` | 9.26 | 9.93 | 8.77 |
| Button `#18181B` | 16.52 | 17.72 | 15.64 |

What this means:

- **Ink, muted, accent and accent-ink** pass AA for normal text everywhere in
  the core palette.
- **Faint** passes on the paper canvas and on white, but **fails on
  `accent-soft`** (4.39). Do not place `text-faint` on indigo-tinted surfaces.
  At `10.5–12px` it is still only just over the line, so reserve it for
  non-essential metadata.
- White text on `accent` is 6.29:1. White on the dark button is 17.72:1.
- Do not put muted text on the ambient glows; those are decorative and sit
  behind a white card anyway.

---

## Usage ratio

Think in area, not in number of tokens:

| Area | Share | What |
|---|---|---|
| Canvas + white | ~70% | Background, bands, cards, space |
| Ink + muted | ~25% | Headlines, body, rules, buttons |
| Accent | ~5% | Kickers, links, one badge, focus ring |

If a screenshot looks purple, the accent share is too high. If it looks grey,
add one more mono kicker or one more indigo link — not a coloured section.

---

## Where the accent is allowed

**Yes**

- uppercase mono kickers (`text-accent-ink`);
- inline text links (`text-accent-ink underline decoration-line`);
- the active tab / active step;
- the focus-visible ring (`#4F46E5`, 2px, offset 2px);
- one badge (`bg-accent-soft text-accent-ink`);
- the winning comparison card's border (`border-accent/50`);
- a data bar or dot in a product mock.

**No**

- a full indigo hero or footer;
- indigo body copy;
- indigo drop shadows;
- two different indigo hues used as separate brands;
- accent gradients on buttons;
- colouring every icon.

---

## CSS variables

`code/tokens.css` contains the full set. The minimal version:

```css
:root {
  --background: #f7f7f5;
  --foreground: #0a0a0f;

  --ink: #0a0a0f;
  --muted: #5e6472;
  --faint: #69707e;

  --line: #e5e5e5;
  --hairline: #efefec;

  --accent: #4f46e5;
  --accent-soft: #eef0ff;
  --accent-ink: #3730a3;

  --surface: #ffffff;
  --surface-2: #fcfcfb;
  --btn: #18181b;
  --btn-hover: #27272a;

  --success: #22c55e;
  --danger: #ef4444;
  --warning: #f59e0b;

  color-scheme: light;
}
```

`color-scheme: light` is not cosmetic. It stops mobile browsers from inventing
dark native controls (range thumbs, scrollbars, autofill) over the warm canvas.

---

## Tailwind config

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F7F5",
        foreground: "#0A0A0F",
        ink: "#0A0A0F",
        muted: "#5E6472",
        faint: "#69707E",
        line: "#E5E5E5",
        hairline: "#EFEFEC",
        accent: {
          DEFAULT: "#4F46E5",
          soft: "#EEF0FF",
          ink: "#3730A3",
        },
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(10,10,15,0.04), 0 8px 24px -12px rgba(10,10,15,0.10)",
        lift: "0 1px 2px rgba(10,10,15,0.05), 0 20px 40px -24px rgba(10,10,15,0.18)",
      },
      maxWidth: {
        frame: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Opacity variants used in the wild

The original components lean on a few opacity modifiers. Keep them for texture,
not for new colours:

| Class | Effect |
|---|---|
| `text-ink/70` | softer card titles |
| `text-ink/75` | chip labels |
| `border-accent/50` | winning comparison card |
| `border-black/[0.07]` | nav bottom rule (slightly softer than `line`) |
| `bg-black/[0.03]` | secondary button hover |
| `bg-white/30` | glass shell around the product window |
| `ring-white/10`, `ring-white/15` | top-lit dark buttons |

---

## Dark mode

This system is **light-only by design**. The warmth of the paper is the point;
an automatic inversion produces a different, much colder product.

If a dark theme is a real requirement, design it explicitly:

- canvas `#101014`, ink `#F5F5F2`;
- muted `#A1A1AA`, line `#27272A`;
- accent `#818CF8` (a lighter indigo for contrast on dark);
- keep the same type scale and hairline discipline;
- re-check every semantic colour for contrast.

Do not ship `prefers-color-scheme: dark` on top of this palette.

Next: [`04-typography.md`](./04-typography.md).
