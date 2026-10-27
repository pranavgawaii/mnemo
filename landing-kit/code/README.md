# Code folder

Copy map for a Next.js 15 + Tailwind 3 project.

| Kit file | Destination | Notes |
|---|---|---|
| `tailwind.config.ts` | `tailwind.config.ts` | Merge `theme.extend` if one exists |
| `globals.css` | `app/globals.css` | Merge with existing globals if needed |
| `app/display-font.ts` | `app/display-font.ts` | Outfit via `next/font/google` |
| `app/layout.tsx.example` | `app/layout.tsx` | Rename; keep both font variables on `<html>` |
| `components/animated-section.tsx` | `components/animated-section.tsx` | Ready to use; no deps |
| `components/landing-primitives.tsx.example` | `components/landing-primitives.tsx` | Rename |
| `components/site-nav.tsx.example` | `components/site-nav.tsx` | Rename; replace links/brand |
| `components/landing-page.tsx.example` | `app/page.tsx` | Rename; split sections as needed |

Fonts:

```bash
mkdir -p public/fonts
cp ../assets/fonts/Redaction35-Regular.otf public/fonts/
cp ../assets/fonts/Redaction35-Italic.otf public/fonts/
# optional self-hosted Outfit:
cp ../assets/fonts/Outfit-Variable.woff2 public/fonts/
```

The `*.tsx.example` suffix is intentional: this repository's TypeScript build
ignores those files. Rename them when you copy them out.

If you use the full `globals.css`, you do **not** need `tokens.css`. Use
`tokens.css` only for a framework-free port or as a quick reference.

Read the step-by-step version in [`../docs/10-porting-guide.md`](../docs/10-porting-guide.md).
