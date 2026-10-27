# Mnemo Landing Kit

A portable copy of the landing-page design language used by **Mnemo**, extracted
so it can be dropped into another project. The look is the **editorial
developer-tool** aesthetic Mnemo shares with Specboard: warm paper, sharp
two-typeface contrast, one indigo accent, hairline structure, and restrained
motion.

This folder is self-contained. It does not affect the Mnemo app or its build.

> **Open the visual preview first:** [`preview.html`](./preview.html)
>
> On macOS: `open landing-kit/preview.html`
>
> It needs no install and no server. Fonts load from `assets/fonts/`.

---

## Design DNA at a glance

| Token | Value | Role |
|---|---|---|
| Canvas | `#F7F7F5` | Warm paper background |
| Ink | `#0A0A0F` | Near-black text, never pure black |
| Muted | `#5E6472` | Secondary copy |
| Line | `#E5E5E5` | 1px section and card borders |
| Accent | `#4F46E5` | One indigo, used sparingly |
| Accent ink | `#3730A3` | Kickers and links on light |
| Sans | **Outfit** | All structure, UI and body copy |
| Serif | **Redaction 35** | Italic accent words only |
| Frame | `1200px` | The page's single content width |
| Gutter | `24px` | `px-6` on every frame |
| Display | `60–66px / 1.05 / -0.035em` | Hero headline |
| UI text | `13.5px` | Nav, buttons, small copy |
| Motion | `0.7s` fade-up, `14px` | One reveal per section |

**The one-line rule:** warm paper + geometric sans + one italic serif word + one
indigo accent + hairlines. Everything else is restraint.

---

## What is in this folder

```text
landing-kit/
├── README.md                  ← you are here
├── CHEATSHEET.md              ← one-page tokens, classes and recipes
├── preview.html               ← standalone visual style guide (no build)
├── docs/
│   ├── 01-design-language.md  ← the principles and the "feel"
│   ├── 02-fonts.md            ← Outfit + Redaction 35 setup and licensing
│   ├── 03-colors.md           ← palette, contrast, semantic colours
│   ├── 04-typography.md       ← full type scale and rules
│   ├── 05-layout-spacing.md   ← frame, rhythm, grids, borders, radii
│   ├── 06-components.md       ← nav, hero, marquee, sections, CTA, footer
│   ├── 07-motion.md           ← reveals, hover, marquee, reduced motion
│   ├── 08-accessibility.md    ← contrast, focus, semantics, motion
│   ├── 09-page-recipe.md      ← the landing-page order + full skeleton
│   ├── 10-porting-guide.md    ← step-by-step for a new project
│   └── 11-source-map.md       ← exact Mnemo files and dependencies
├── assets/
│   └── fonts/
│       ├── Outfit-Variable.woff2
│       ├── Redaction35-Regular.otf
│       ├── Redaction35-Italic.otf
│       ├── FONT-LICENSES.md
│       └── LICENSE-OFL-1.1.txt
└── code/
    ├── tokens.css             ← drop-in CSS variables and utilities
    ├── globals.css            ← full Tailwind globals file
    ├── tailwind.config.ts     ← theme tokens, ready to copy
    ├── app/
    │   ├── display-font.ts    ← Outfit via next/font/google
    │   └── layout.tsx.example ← font wiring for App Router
    └── components/
        ├── animated-section.tsx       ← the scroll reveal, dependency-free
        ├── landing-primitives.tsx.example
        ├── site-nav.tsx.example
        └── landing-page.tsx.example
```

The `*.tsx.example` files use the two-part suffix on purpose, so they are not
picked up by this repo's TypeScript build. Rename them to `.tsx` when you copy
them into a project.

---

## Three ways to use it

### 1. Read it and rebuild it (any stack)

Read [`docs/01-design-language.md`](./docs/01-design-language.md) through
[`docs/06-components.md`](./docs/06-components.md), then use
[`docs/09-page-recipe.md`](./docs/09-page-recipe.md) as the page blueprint.
Everything is expressed as plain CSS values and Tailwind classes, so it ports to
React, Vue, Svelte, Astro, or plain HTML.

### 2. Copy the Next.js + Tailwind setup (fastest)

Follow [`docs/10-porting-guide.md`](./docs/10-porting-guide.md). The short
version:

```bash
# 1. fonts
mkdir -p public/fonts
cp landing-kit/assets/fonts/Redaction35-*.otf public/fonts/

# 2. theme
cp landing-kit/code/tailwind.config.ts ./tailwind.config.ts
cp landing-kit/code/app/display-font.ts ./app/display-font.ts
# merge landing-kit/code/globals.css into ./app/globals.css

# 3. reveal helper
cp landing-kit/code/components/animated-section.tsx ./components/
```

Then wrap the root `<html>` with the two font variables, exactly as shown in
[`code/app/layout.tsx.example`](./code/app/layout.tsx.example).

### 3. Use it as a visual reference

Open [`preview.html`](./preview.html) beside your new project and match the
swatches, type specimens, buttons, cards and section rhythm. It is a static
file, so it also works as a design handoff.

---

## The five-minute checklist

- [ ] Canvas is `#F7F7F5`, not `#FFFFFF`.
- [ ] Body uses Outfit; headings use Outfit Medium (500), not Bold (700).
- [ ] Exactly one serif italic word per major heading, using Redaction 35.
- [ ] Frame is `max-width: 1200px` with `24px` side gutters.
- [ ] Borders are `1px` hairlines in `#E5E5E5`; shadows are barely visible.
- [ ] Indigo `#4F46E5` appears only on links, kickers, focus rings and one CTA.
- [ ] Sections alternate canvas and white bands to read as chapters.
- [ ] Large type has negative tracking; body copy has normal tracking.
- [ ] Sections reveal once with a 14px fade-up; `prefers-reduced-motion` stops it.
- [ ] No dark mode unless you design one deliberately.

---

## What is Mnemo-specific and what is portable

| Portable | Mnemo-specific — replace it |
|---|---|
| Palette, fonts, type scale | The name "Mnemo" and the logo mark |
| 1200px frame and section rhythm | The memory/orbit product visual |
| Nav / hero / marquee / quote / CTA patterns | Copy about AI memory, pgvector, decay |
| Reveal and hover motion | Section anchors and nav labels |
| Card, chip and button recipes | The halftone footer wordmark |
| Accessibility rules | The `#F7F7F5 / #4F46E5` brand pairing itself |

Keep the system; swap the nouns.

---

## Source

Extracted from the Mnemo landing page in this repository. The original design is
documented in [`../docs/frontend.md`](../docs/frontend.md). Mnemo's landing was
in turn matched to the **Specboard** editorial developer-tool aesthetic (same
canvas, frame, hairlines, type pairing and reveal behaviour).

Fonts: **Outfit** by Smartsheet Inc / Rodrigo Fuenzalida (Google Fonts, SIL OFL
1.1) and **Redaction 35** by Jeremy Mickel / Forest Young (MCKL Type, SIL OFL
1.1). See
[`assets/fonts/FONT-LICENSES.md`](./assets/fonts/FONT-LICENSES.md) before
redistributing.
