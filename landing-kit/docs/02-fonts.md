# 02 · Fonts

The pairing is the whole personality of the system:

- **Outfit** — a geometric sans with clean, open forms. It carries 95% of the
  page.
- **Redaction 35** — a high-contrast serif. Only its **italic** is used, and
  only for one word at a time.

Two families. Two jobs. No third font.

---

## 1. Outfit (sans)

| Property | Value |
|---|---|
| Source | [Google Fonts](https://fonts.google.com/specimen/Outfit) |
| Designers | Smartsheet Inc / Rodrigo Fuenzalida |
| Licence | SIL Open Font License 1.1 |
| Weights used | 400 (body), 500 (headings/UI), 600 (wordmark), 800 (footer wordmark only) |
| Variable | `--font-outfit` |
| Fallback | `system-ui, sans-serif` |

### Next.js App Router setup

`app/display-font.ts`:

```ts
import { Outfit } from "next/font/google";

export const displayFont = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});
```

`app/layout.tsx`:

```tsx
import { displayFont } from "./display-font";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.className} ${displayFont.variable}`}>
      <body className="bg-background font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
```

`displayFont.className` applies Outfit as the default family;
`displayFont.variable` exposes `--font-outfit` for Tailwind and inline styles.

Tailwind:

```ts
fontFamily: {
  sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
}
```

### Self-hosted alternative

If the project cannot call Google Fonts at build time, put
`Outfit-Variable.woff2` in `public/fonts/` and use:

```ts
import localFont from "next/font/local";

export const displayFont = localFont({
  src: "../public/fonts/Outfit-Variable.woff2",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
});
```

The kit ships the latin variable file at
`assets/fonts/Outfit-Variable.woff2` (31 KB). Add the latin-ext file only if
the copy needs those glyphs.

---

## 2. Redaction 35 (serif accent)

| Property | Value |
|---|---|
| Source | [MCKL Type — Redaction](https://www.mckltype.com/typefaces/redaction) |
| Designers | Jeremy Mickel / Forest Young |
| Licence | SIL Open Font License 1.1 |
| File used | `Redaction35-Regular.otf`, `Redaction35-Italic.otf` |
| Variable | `--font-redaction` |
| Fallback | `Georgia, "Times New Roman", serif` |

Redaction is a family of 21 cuts across seven grades of "degradation" and three
styles. **Grade 35** is the one in this kit: the middle grade, with enough
contrast to feel editorial but enough weight to sit beside Outfit at display
sizes. Only Regular and Italic are needed.

### Next.js App Router setup

`app/layout.tsx`:

```tsx
import localFont from "next/font/local";

const redaction = localFont({
  src: [
    {
      path: "../public/fonts/Redaction35-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Redaction35-Italic.otf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-redaction",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${displayFont.className} ${displayFont.variable} ${redaction.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

Copy the files first:

```bash
mkdir -p public/fonts
cp landing-kit/assets/fonts/Redaction35-*.otf public/fonts/
```

The `path` in `localFont` is relative to the file that calls it. In
`app/layout.tsx`, `../public/fonts/...` is correct when `public/` is at the
project root.

Tailwind:

```ts
fontFamily: {
  serif: ["var(--font-redaction)", "Georgia", "serif"],
}
```

### Plain CSS alternative

If you are not using Next.js:

```css
@font-face {
  font-family: "Redaction 35";
  src: url("/fonts/Redaction35-Regular.otf") format("opentype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Redaction 35";
  src: url("/fonts/Redaction35-Italic.otf") format("opentype");
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

:root {
  --font-serif: "Redaction 35", Georgia, serif;
}
```

The preview file uses exactly this approach.

---

## 3. How to use the serif

One word. Italic. Regular weight. Slightly larger than the surrounding sans so
the optical size matches.

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

Why the details matter:

| Detail | Reason |
|---|---|
| `italic` | Redaction's italic is the voice; the roman is too static for this role |
| `font-normal` | Never bold the serif; the contrast comes from the skeleton, not weight |
| `tracking-normal` | The heading's negative tracking would crush the serif |
| `text-[112%]` | Equalises the optical size against Outfit at the same font-size |
| `inline` span | Keeps the word inside the heading's line boxes and wrapping |
| One word only | The serif is a highlight, not a second body face |

Shorter version for smaller headings:

```tsx
<span className="italic font-normal tracking-normal" style={{ fontFamily: "var(--font-redaction), serif" }}>
  remember
</span>
```

At `32–44px` the `112%` bump is optional; at `60px+` it matters.

---

## 4. The sans in use

| Element | Class | Size | Weight |
|---|---|---|---|
| Wordmark | `text-[19px] font-semibold tracking-tight` | 19px | 600 |
| Nav link | `text-[13.5px] font-medium` | 13.5px | 500 |
| Hero | `text-[40px] sm:text-[52px] lg:text-[60px] xl:text-[66px] font-medium leading-[1.05] tracking-[-0.035em]` | 40–66px | 500 |
| Section H2 | `text-[32px] md:text-[40px] font-medium leading-[1.2]` | 32–40px | 500 |
| Band H2 | `text-[34px] md:text-[46px] font-medium leading-[1.1] tracking-[-0.03em]` | 34–46px | 500 |
| Card title | `text-[19px] font-medium leading-snug tracking-[-0.01em]` | 19px | 500 |
| Body | `text-[13.5px] leading-[1.7]` | 13.5px | 400 |
| Body large | `text-[15px] md:text-[16px] leading-[1.7]` | 15–16px | 400 |
| Button | `text-[14px] font-medium` | 14px | 500 |

Headings are **500**, not 700. The scale creates the hierarchy; boldness would
make the page feel like a landing-page template.

---

## 5. Mono

The mono is not a brand font. Use the platform stack:

```css
font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
```

It appears in:

- uppercase kickers (`font-mono text-[10.5px] font-bold uppercase tracking-[0.16em]`);
- small metadata and labels;
- code and command snippets;
- the "in → out" line under a step;
- numeric indices (`01`, `02`, `03`) with `tabular-nums`.

Keep mono at `10.5–12px`. It is a texture, not a reading face.

---

## 6. Loading performance

- `display: "swap"` on both fonts. Text is readable immediately.
- Only `latin` for Outfit unless the copy needs more.
- Only two Redaction cuts (regular + italic), not the whole 21-font family.
- Preload the serif if a serif word is above the fold (Next's `localFont` does
  this automatically).
- Do not load weights you never use. The system needs 400, 500, 600 and one
  footer 800; Outfit is variable, so this costs one file.
- Keep the OTF files in `public/fonts/`; they total ~85 KB.

---

## 7. Fallback quality

If Redaction fails to load, Georgia Italic is the fallback. It is wider and
lower-contrast, but the layout still works because:

- the serif word is inside a heading with `text-balance` and normal wrapping;
- the `112%` bump is modest;
- no serif word is used as a layout-critical single-line element.

For a closer fallback, use one of these Google Fonts (all have italics):

| Fallback | Character |
|---|---|
| **Instrument Serif Italic** | High contrast, narrow, very close in spirit |
| **Newsreader Italic** | Editorial, slightly warmer |
| **Source Serif 4 Italic** | More neutral, safer for long text |
| **Playfair Display Italic** | More decorative; use with care |

Do not silently replace Redaction with a different family in production; the
pairing is the design.

---

## 8. Licensing

Both fonts are free to use under the **SIL Open Font License 1.1**, including
commercial use. If you redistribute the font files (for example, in a public
template or a design kit), include the licence notice. See
[`../assets/fonts/FONT-LICENSES.md`](../assets/fonts/FONT-LICENSES.md).

The OFL allows embedding and bundling; it does not allow selling the fonts on
their own. Keep the copyright notices with the files.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Serif renders as Georgia | `--font-redaction` not on `<html>` | Add `${redaction.variable}` to the root class list |
| Sans renders as system-ui | `--font-outfit` not on `<html>`, or `font-sans` not applied | Add the variable and set `font-sans` on `<body>` |
| Font 404s in production | `path` is relative to the wrong file, or files are not in `public/` | Check the `localFont` path and the deployed `public/fonts/` folder |
| Heading looks too wide | Negative tracking missing | Add `tracking-[-0.035em]` at display sizes |
| Serif looks too small | Optical size mismatch | Add `text-[112%]` |
| Serif looks too heavy | Used `font-semibold`/`font-bold` | Use `font-normal` |
| Layout shifts on load | `display` not set, or wrong fallback metrics | Keep `display: "swap"`; use `adjustFontFallback` if needed |
| Italic does not apply | Only the regular file was declared | Declare the italic file with `style: "italic"` |

Next: [`03-colors.md`](./03-colors.md).
