# 11 · Source map and inventory

Where every value and component in this kit came from.

---

## 1. Primary sources

| Source | What it contains |
|---|---|
| `app/globals.css` | CSS variables, base rules, utilities, keyframes, reduced motion |
| `tailwind.config.ts` | Colour tokens, font families, shadows, 1200px frame |
| `app/display-font.ts` | Outfit via `next/font/google` |
| `app/layout.tsx` | Font wiring, metadata, viewport, no-JS fallback |
| `app/page.tsx` | Landing page composition |
| `docs/frontend.md` | The original design rationale and page map |
| `lib/site.ts` | Nav links, CTAs, anchors, metadata strings |

---

## 2. Landing components

| File | Role | Portable to another project? |
|---|---|---|
| `components/animated-section.tsx` | Scroll reveal, `IntersectionObserver` | **Yes**; the kit version destructures `style` so a custom style cannot drop the delay |
| `components/site-nav.tsx` | Fixed 64px nav, centre logo, CTA pill, mobile menu | Yes; replace links and wordmark |
| `components/hero.mdx` | Split hero, serif word, CTAs, stack strip | Structure yes; replace copy and product visual |
| `components/pipeline-marquee.mdx` | Full-bleed stage marquee | Yes; replace stage labels |
| `components/product-explainer.mdx` | White band, 3 numbered columns | Yes; replace copy |
| `components/how-it-works.mdx` | Alternating rows with "in → out" line | Yes; replace steps and visuals |
| `components/differentiator.mdx` | Two-card comparison | Yes; replace lists |
| `components/principle-quote.mdx` | Centred pull quote | Yes; replace quote |
| `components/final-cta.mdx` | White 24px CTA panel + next steps | Yes; replace actions |
| `components/site-footer.tsx` | Footer wrapper | Yes; replace content; halftone optional |
| `components/ui/halftone-wordmark-footer.tsx` | Vendored halftone footer | Optional; MIT-style registry component; check its licence |
| `components/logo.tsx` | Mnemo orbit logo mark | No; replace with your mark |
| `components/memory-window.tsx` | Mnemo product mock | No; product-specific |
| `components/hero-orbit.tsx` | Mnemo orbit backdrop | No; product-specific |
| `components/visuals.tsx` | Store/cosine/decay/conflict diagrams | Structure reusable; content specific |
| `components/code.tsx` | Inline code chip | Yes |
| `components/scroll-manager.tsx` | Scroll restoration | Yes, if needed |

The `.mdx` files wrap their JSX in a single expression (`{(<section>...)}`) so
MDX does not inject `<p>` tags into the markup. If you convert them to `.tsx`,
remove the wrapper.

---

## 3. Docs page components (not part of this kit)

The docs page is a separate design surface. It shares the shell, palette and
type, but adds:

- a sticky contents rail (`components/docs-toc.tsx`, `components/ui/hook-sidebar.tsx`);
- chapter headers (`components/docs-chapter.tsx`);
- section hairlines (`components/docs-section.tsx`);
- interactive diagrams (`architecture-explorer.tsx`, `lifecycle-explorer.tsx`,
  `api-explorer.tsx`);
- calculators and demos (`memory-playground.tsx`, `ranking-explorer.tsx`,
  `contradiction-explainer.tsx`).

If you are porting only the **landing page**, ignore this group.

---

## 4. Design tokens

### Exact values

| Token | Source |
|---|---|
| Canvas `#F7F7F5` | `tailwind.config.ts` → `colors.background`; `globals.css` → `--background` |
| Ink `#0A0A0F` | `colors.foreground`, `colors.ink`; `--foreground` |
| Muted `#5E6472` | `colors.muted` |
| Faint `#69707E` | `colors.faint` |
| Line `#E5E5E5` | `colors.line` |
| Hairline `#EFEFEC` | `colors.hairline` |
| Accent `#4F46E5` | `colors.accent.DEFAULT`; focus ring |
| Accent soft `#EEF0FF` | `colors.accent.soft` |
| Accent ink `#3730A3` | `colors.accent.ink` |
| Frame `1200px` | `maxWidth.frame` |
| Soft shadow | `boxShadow.soft` |
| Lift shadow | `boxShadow.lift` |
| Sans variable | `--font-outfit` (`app/display-font.ts`) |
| Serif variable | `--font-redaction` (`app/layout.tsx`) |

### Type values

The type scale is not in the Tailwind config; it is written as arbitrary values
in the components (`text-[13.5px]`, `tracking-[-0.035em]`). That is deliberate:
the exact sizes are part of the design and should not be rounded to Tailwind's
default scale.

Search the components for `text-[` to see every size in use. The full table is in
[`04-typography.md`](./04-typography.md).

---

## 5. Fonts

| File | Size | Source | Licence |
|---|---|---|---|
| `assets/fonts/Outfit-Variable.woff2` | 31 KB | Google Fonts, latin variable | SIL OFL 1.1 |
| `assets/fonts/Redaction35-Regular.otf` | 40 KB | MCKL Type | SIL OFL 1.1 |
| `assets/fonts/Redaction35-Italic.otf` | 45 KB | MCKL Type | SIL OFL 1.1 |

The original project loads Outfit from Google Fonts at build time via
`next/font/google`. The kit ships the variable WOFF2 so the preview and
self-hosted ports work offline. The Redaction files are copied verbatim from
`public/fonts/`.

See [`../assets/fonts/FONT-LICENSES.md`](../assets/fonts/FONT-LICENSES.md).

---

## 6. Stack used by the original

From `package.json` at the time of extraction:

| Package | Version | Used for |
|---|---|---|
| `next` | 15.5.28 | App Router |
| `react` / `react-dom` | 19.0.0 | UI |
| `tailwindcss` | 3.4.19 | Styling |
| `typescript` | 5.9.3 | Types |
| `lucide-react` | 1.59.0 | Icons |
| `@next/mdx` | 15.5.28 | `.mdx` sections |
| `@mdx-js/loader` / `@mdx-js/react` | 3.1.1 | MDX |
| `motion` | 14.3.0 | Only the docs sidebar; not the landing reveal |
| `clsx` + `tailwind-merge` | 2.1.1 / 2.6.1 | `cn` helper in docs UI |

The landing page itself needs only **Next, React, Tailwind and lucide-react**
(and lucide is optional if you use inline SVG).

---

## 7. What the kit adds

Everything under `landing-kit/` is new documentation and packaging. It does not
change the Mnemo app.

| File | Purpose |
|---|---|
| `README.md` | Orientation, design DNA, quick start |
| `CHEATSHEET.md` | One-page tokens, classes, rules |
| `preview.html` | Standalone visual style guide |
| `docs/01`–`docs/11` | The written system |
| `code/tokens.css` | Minimal drop-in CSS variables |
| `code/globals.css` | Full Tailwind globals |
| `code/tailwind.config.ts` | Theme config |
| `code/app/display-font.ts` | Outfit setup |
| `code/app/layout.tsx.example` | Font wiring |
| `code/components/animated-section.tsx` | Reveal, dependency-free |
| `code/components/landing-primitives.tsx.example` | Section, Kicker, Heading, Body, Button, Chip |
| `code/components/site-nav.tsx.example` | Config-driven nav |
| `code/components/landing-page.tsx.example` | Full page composition |
| `assets/fonts/*` | Portable font files + licence notes |

`*.tsx.example` is used so this repo's TypeScript build does not compile the
examples. Rename to `.tsx` when copying.

---

## 8. Design decisions worth preserving

These are the choices that make the result look like the reference rather than a
generic Tailwind landing page:

1. **Warm canvas** (`#F7F7F5`) instead of white.
2. **Outfit at weight 500** for display, not 700.
3. **Redaction italic at 112%** for one word per heading.
4. **1200px frame with 24px gutters**, consistently.
5. **Hairline bands** (`border-y border-line bg-white`) instead of shadows.
6. **Small body copy** (13.5–16px) with generous space.
7. **Mono uppercase kickers** at 10.5–11px with 0.14–0.16em tracking.
8. **One indigo accent**, ~5% of the page.
9. **One reveal**, 14px / 0.7s, staggered by 100ms.
10. **One primary button per view**, 8px radius, dark ink.
11. **A white 24px CTA panel** as the closing object.
12. **No customer quotes or logos** unless they are real.

---

## 9. Known project-specific content

Do not copy these into another product without rewriting:

- the name **Mnemo** and the orbit logo;
- the headline "Give your AI agents a memory that lasts";
- the words "pgvector", "all-MiniLM-L6-v2", "180-day half-life", "0.82 gate";
- the memory-window mock;
- the halftone `mnemo` footer wordmark;
- the `ANCHORS` map in `lib/site.ts`;
- the `#F7F7F5` + indigo pairing as a **brand** (it is portable as a system, but
  a different brand may need a different accent).

The system is the gift; the nouns are not.

---

## 10. Verification commands used for this kit

```bash
# from the repository root
pnpm typecheck        # confirms the kit's .ts/.tsx files do not break the app
pnpm build            # confirms the app still builds
open landing-kit/preview.html
```

If `typecheck` reports errors in `landing-kit/`, check that you did not rename
an `.tsx.example` file to `.tsx` inside this repository. The examples are
excluded by extension on purpose.
