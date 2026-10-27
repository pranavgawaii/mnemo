# 10 · Porting guide

Three paths: the exact Mnemo stack (Next.js 15 + Tailwind 3), a Tailwind 4
variant, and a framework-free HTML/CSS version. Pick one.

---

## Path A — Next.js 15 + Tailwind 3 (the original stack)

### 0. What you need

| Package | Why |
|---|---|
| `next` 15, `react` 19 | App Router |
| `tailwindcss` 3.4 | The theme tokens |
| `lucide-react` | Icons in the nav/hero/sections (optional) |
| `clsx`, `tailwind-merge` | Only if you use the `cn` helper; not required for the kit |
| `@next/mdx` | Only if you keep the `.mdx` section files |

The design itself needs **no runtime dependencies**. The reveal is a small
client component using `IntersectionObserver`.

```bash
pnpm add lucide-react
# optional, only if you keep MDX sections:
pnpm add @next/mdx @mdx-js/loader @mdx-js/react
```

### 1. Copy the fonts

```bash
mkdir -p public/fonts
cp landing-kit/assets/fonts/Redaction35-Regular.otf public/fonts/
cp landing-kit/assets/fonts/Redaction35-Italic.otf public/fonts/
```

Optional self-hosted Outfit:

```bash
cp landing-kit/assets/fonts/Outfit-Variable.woff2 public/fonts/
```

If you use `next/font/google` for Outfit (the original), you do not need the
local file.

### 2. Copy the theme

```bash
cp landing-kit/code/tailwind.config.ts ./tailwind.config.ts
cp landing-kit/code/app/display-font.ts ./app/display-font.ts
```

If the project already has a Tailwind config, **merge** the `theme.extend`
block instead of overwriting:

- `fontFamily.sans`, `fontFamily.serif`, `fontFamily.mono`
- `colors`
- `boxShadow`
- `maxWidth.frame`

### 3. Merge the globals

`code/globals.css` is the full Tailwind entry. If you already have one, keep
your `@tailwind` directives and add:

- the `:root` variables;
- the `html, body` rules;
- `::selection`, `:focus-visible`;
- the utilities (`.animate-fade-up`, `.text-balance`, `.link-underline`,
  `.grain`, `.animate-marquee`);
- the keyframes;
- the reduced-motion block.

The minimum viable set is in `code/tokens.css`.

### 4. Wire the fonts in the root layout

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { displayFont } from "./display-font";
import "./globals.css";

const redaction = localFont({
  src: [
    { path: "../public/fonts/Redaction35-Regular.otf", weight: "400", style: "normal" },
    { path: "../public/fonts/Redaction35-Italic.otf", weight: "400", style: "italic" },
  ],
  variable: "--font-redaction",
  display: "swap",
});

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#F7F7F5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${displayFont.className} ${displayFont.variable} ${redaction.variable}`}
    >
      <body className="bg-background font-sans text-ink antialiased">
        <noscript>
          <style>{`[data-reveal="pending"]{opacity:1 !important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
```

If your global CSS uses `@tailwind base`, the `:root` block from the kit will
apply automatically.

### 5. Copy the reveal

```bash
cp landing-kit/code/components/animated-section.tsx ./components/
```

It is a client component and self-contained. No `motion` package required.

### 6. Build the page

Start from `code/components/landing-page.tsx.example` or the full skeleton in
[`09-page-recipe.md`](./09-page-recipe.md). Rename `.tsx.example` to `.tsx` in
your project.

Copy the section components from Mnemo if you want the exact originals:

| Mnemo source | Portable? |
|---|---|
| `components/animated-section.tsx` | Yes, verbatim |
| `components/site-nav.tsx` | Yes; replace `lib/site.ts` links and the wordmark |
| `components/hero.mdx` | Structure yes; replace the product window |
| `components/pipeline-marquee.mdx` | Yes; replace stage labels |
| `components/product-explainer.mdx` | Yes; replace copy |
| `components/how-it-works.mdx` | Yes; replace steps and visuals |
| `components/differentiator.mdx` | Yes; replace lists |
| `components/principle-quote.mdx` | Yes; replace the quote |
| `components/final-cta.mdx` | Yes; replace the actions |
| `components/site-footer.tsx` | Structure yes; the halftone footer is optional |
| `components/memory-window.tsx` | No; product-specific mock |

The `.mdx` files in the original wrap their JSX in a single expression so MDX
does not reinterpret the markup as Markdown:

```mdx
{(
  <section>...</section>
)}
```

If you convert them to `.tsx`, remove the wrapper and the `export const` at the
top can stay.

### 7. Add the link-underline utility

The nav and footer use it. It lives in `globals.css`:

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

### 8. Create the site config

Centralise the brand so a rename is one file:

```ts
// lib/site.ts
export const SITE_NAME = "YourProduct";
export const SITE_TAGLINE = "One line that says what it is";
export const DOCS_URL = "/docs";

export const NAV_LEFT = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
];

export const NAV_RIGHT = [
  { label: "Pricing", href: "/#pricing" },
  { label: "GitHub", href: "https://github.com/you/repo", external: true },
];

export const NAV_CTA = { label: "Read docs", href: DOCS_URL, external: false };
```

### 9. Verify

```bash
pnpm typecheck
pnpm build
pnpm dev
```

Check:

- the serif word renders in Redaction (not Georgia);
- the nav is 64px and solid;
- the white bands are separated by hairlines;
- the marquee loops seamlessly and pauses on hover;
- reduced motion stops the reveal and marquee;
- the page is readable at 320px and 200% zoom.

---

## Path B — Next.js + Tailwind 4

Tailwind 4 removes `tailwind.config.ts` by default and moves tokens into CSS
with `@theme`. The visual values stay identical.

### 1. Fonts

Same as Path A: copy the OTFs to `public/fonts/` and declare them with
`next/font/local`.

### 2. Globals

```css
@import "tailwindcss";

@theme {
  --color-background: #f7f7f5;
  --color-foreground: #0a0a0f;
  --color-ink: #0a0a0f;
  --color-muted: #5e6472;
  --color-faint: #69707e;
  --color-line: #e5e5e5;
  --color-hairline: #efefec;
  --color-accent: #4f46e5;
  --color-accent-soft: #eef0ff;
  --color-accent-ink: #3730a3;

  --font-sans: var(--font-outfit), system-ui, sans-serif;
  --font-serif: var(--font-redaction), Georgia, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;

  --shadow-soft: 0 1px 2px rgb(10 10 15 / 0.04), 0 8px 24px -12px rgb(10 10 15 / 0.10);
  --shadow-lift: 0 1px 2px rgb(10 10 15 / 0.05), 0 20px 40px -24px rgb(10 10 15 / 0.18);
}
```

Then replace `max-w-frame` with an arbitrary value or a custom utility:

```css
@utility max-w-frame {
  max-width: 1200px;
}
```

Or simply use `max-w-[1200px]` everywhere. The kit's class snippets are written
for Tailwind 3; in Tailwind 4, `max-w-frame` needs the utility above.

### 3. What changes

| Tailwind 3 | Tailwind 4 |
|---|---|
| `tailwind.config.ts` | `@theme` in CSS |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| `theme.extend.colors` | `--color-*` variables |
| `theme.extend.fontFamily` | `--font-*` variables |
| `theme.extend.boxShadow` | `--shadow-*` variables |
| `maxWidth.frame` | custom utility or `max-w-[1200px]` |

The component classes themselves (`text-[13.5px]`, `border-line`, `bg-white`,
`tracking-[-0.035em]`) do not change.

---

## Path C — Vite / React / Astro / plain HTML

### Option C1: plain HTML + CSS

1. Copy `assets/fonts/` to `public/fonts/` or `assets/fonts/`.
2. Copy `code/tokens.css` and the `@font-face` block from
   [`02-fonts.md`](./02-fonts.md).
3. Use [`preview.html`](../preview.html) as the reference for section markup
   and CSS.
4. Replace the sample content.

This is the lowest-friction path if the other project is not React.

### Option C2: Vite + React

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

Then follow Path A from step 2, changing `app/` to `src/`:

- put `display-font.ts` logic aside; Vite does not have `next/font`. Use the
  `@font-face` CSS from [`02-fonts.md`](./02-fonts.md) instead.
- put the fonts in `public/fonts/`.
- add `--font-outfit` and `--font-redaction` to `:root`.
- copy `animated-section.tsx` as-is (it only uses React).
- copy the page skeleton into `src/App.tsx`.
- add `@tailwind base/components/utilities` to `src/index.css`.

### Option C3: Astro

- Put fonts in `public/fonts/`.
- Add the `@font-face` block to a global stylesheet.
- Use the Tailwind integration with the same config.
- The reveal can be a tiny inline script:

```html
<script>
  const els = document.querySelectorAll("[data-reveal]");
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-reveal", "visible");
          entry.target.classList.add("animate-fade-up");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => io.observe(el));
</script>
```

---

## Rename checklist

When adapting the kit to another brand, change these in order:

- [ ] `SITE_NAME`, wordmark, logo mark, footer brand line.
- [ ] `SITE_TAGLINE` and page `<title>` / description.
- [ ] Nav labels and `lib/site.ts` anchors.
- [ ] Hero headline, support copy, both CTAs.
- [ ] Marquee stage names.
- [ ] Explainer kickers, titles, body.
- [ ] How-it-works labels, titles, body, in/out lines.
- [ ] Comparison column names and list items.
- [ ] Quote text and kicker.
- [ ] Final CTA heading, support, buttons, next steps.
- [ ] Footer columns, contact, copyright.
- [ ] Favicon, OG image, theme colour.

Do **not** rename the palette or type scale unless the brand genuinely requires
it. The system works because the values are consistent.

---

## Common pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| `--font-redaction` not on `<html>` | Serif falls back to Georgia | Add `${redaction.variable}` to the root className |
| Wrong `localFont` path | 404 or build error | Path is relative to the file; from `app/layout.tsx`, use `../public/fonts/...` |
| `overflow-x: hidden` on `html, body` | `position: sticky` breaks | Use `overflow-x: clip` |
| `max-w-frame` undefined | No max width | Add `maxWidth.frame` to the config, or use `max-w-[1200px]` |
| `/50` opacity on a custom colour | Tailwind cannot parse it | Use `border-accent/50` only if `accent` is a proper colour token; otherwise use `rgb(... / 0.5)` |
| White page background | Bands disappear | Set `bg-background` on `<body>` |
| Serif word too small | Optical mismatch | Add `text-[112%]` |
| Serif word too bold | Used `font-semibold` | Use `font-normal` |
| Headline lines collide | `leading-none` | Use `leading-[1.05]` |
| Marquee jumps at the loop | Only one copy of the set | Duplicate the set; translate `-50%` |
| Reveal flashes on load | No initial `opacity-0` | Keep `opacity-0` until visible |
| Content invisible without JS | No `<noscript>` fallback | Add the `[data-reveal="pending"]` rule |
| Anchor hides under nav | No scroll margin | Add `scroll-mt-16` (or `scroll-mt-[120px]`) |
| Mobile nav collides at 1024px | Breakpoint too low | Switch at `lg`, not `md` |
| Product window overflows | Scale applied without clipping | Put `overflow-hidden` on the page wrapper |
| Too much indigo | Accent used for fills | Return to 5%: kickers, links, focus ring |
| Headings feel shouty | Weight 700 | Use `font-medium` (500) |
| Cards look generic | `rounded-2xl` + shadow on every card | Use 12px radius + 1px border; shadow only on the winner |
| Type looks default | Tailwind's `text-4xl` | Use the exact px sizes and tracking |

---

## Dependency-free minimum

If you want the smallest possible port, you only need:

1. `assets/fonts/` + the `@font-face` CSS;
2. `code/tokens.css`;
3. `code/components/animated-section.tsx`;
4. the section markup from this kit.

No Tailwind required if you translate the classes to plain CSS. The preview file
shows what that looks like in practice.

Next: [`11-source-map.md`](./11-source-map.md).
