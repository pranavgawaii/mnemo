# 08 · Accessibility

The visual system is quiet, which makes accessibility easier: strong text
contrast, few colours, no autoplaying carousels, no scroll-jacking. A few things
still need deliberate attention.

---

## 1. Focus

Every interactive element gets a visible indigo ring. Do not remove it.

```css
:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
  border-radius: 4px;
}
```

- `:focus-visible`, not `:focus`, so pointer users do not see a ring after a
  click.
- 2px is thick enough to see against both the paper canvas and white cards.
- 2px offset keeps the ring clear of the border it sits beside.
- The `border-radius: 4px` is only for the outline shape; it does not alter the
  element.

For elements with their own rounded shape, the ring follows the element's
radius in modern browsers. If you need an exact match, use a `ring` utility
instead:

```html
<a class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background">
```

### Never

```css
/* Do not ship this */
*:focus { outline: none; }
```

If a custom focus style is required, it must be at least as visible as the
default.

---

## 2. Skip link

The first focusable element is a skip link to `#main`. It is visually hidden
until focused, then appears in the top-left over the nav.

```tsx
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-[13px] focus:text-white"
>
  Skip to content
</a>

<main id="main">...</main>
```

Keep the `<main id="main">` around the landing sections, not the nav or footer.

---

## 3. Contrast

Measured against this exact palette:

| Pair | Ratio | AA normal text |
|---|---|---|
| Ink `#0A0A0F` on paper `#F7F7F5` | 18.41 | Pass |
| Ink on white `#FFFFFF` | 19.75 | Pass |
| Muted `#5E6472` on paper | 5.53 | Pass |
| Muted on white | 5.93 | Pass |
| Faint `#69707E` on paper | 4.64 | Pass (just) |
| Faint on white | 4.98 | Pass |
| Accent `#4F46E5` on paper | 5.86 | Pass |
| Accent on white | 6.29 | Pass |
| Accent ink `#3730A3` on `#EEF0FF` | 8.77 | Pass |
| White on accent | 6.29 | Pass |
| White on button `#18181B` | 17.72 | Pass |

Watch-outs:

- **Faint on `accent-soft`** is 4.39:1 and fails. Do not put tertiary text on
  indigo-tinted surfaces.
- **Solid semantic colours** (`#22C55E`, `#EF4444`, `#F59E0B`) fail as text on
  white. Use the text-safe variants (`#15803D`, `#B91C1C`, `#B45309`).
- **Muted text over the ambient glows** is not guaranteed; keep the glows behind
  a solid card.
- Disabled states should still be legible. Use opacity `0.5` only on
  non-essential decoration, not on labels the user needs.

---

## 4. Semantics

### Landmarks

```tsx
<header>   {/* SiteNav */}
<nav aria-label="Primary">...</nav>
</header>

<main id="main">
  <section aria-labelledby="hero-title">...</section>
  <section aria-labelledby="how-title">...</section>
</main>

<footer>...</footer>
```

- One `<h1>` per page: the hero headline.
- Each section gets an `<h2>`; cards and steps get `<h3>`.
- Do not use a `<div>` with big type as a heading. Screen-reader users navigate
  by heading level.
- Kickers are `<span>` or `<p>`, not headings. They are labels, not structure.
- If a section has no visible heading (e.g. the marquee), use `aria-label` on
  the `<section>`.

### The nav

```tsx
<button
  type="button"
  aria-label={open ? "Close menu" : "Open menu"}
  aria-expanded={open}
  aria-controls="mobile-menu"
>
```

- The menu button is a real `<button>`, not a clickable `<div>`.
- `aria-expanded` reflects state.
- The mobile panel has `id="mobile-menu"`.
- The logo link has `aria-label="YourProduct home"`.

### Links vs buttons

- Navigation → `<a href>`.
- Actions that change state on the same page → `<button type="button">`.
- Never use an `<a>` without `href` as a button; it is not keyboard-focusable.
- External links get `target="_blank" rel="noopener noreferrer"` and, ideally,
  a visually hidden "(opens in a new tab)".

### The comparison table

The ✗/✓ marks are decorative duplicates of the text. Hide them from assistive
technology:

```tsx
<span aria-hidden="true" className="text-[#EF4444]">✗</span>
```

Do not rely on colour alone to distinguish the two columns. The headings
("Other tools" / "YourProduct") and the order of the lists carry the meaning.

### The marquee

The duplicated stage set exists only for the seamless loop. In production, mark
the second set `aria-hidden="true"` and keep the first set readable:

```tsx
<div className="flex w-max animate-marquee">
  <StageSet />
  <div aria-hidden="true"><StageSet /></div>
</div>
```

Also give the section an accessible name:

```tsx
<section aria-label="The recall path">
```

If the marquee is essential content, consider a static list on small screens or
under reduced motion. The duplicated text should never be read twice.

---

## 5. Motion

Covered in detail in [`07-motion.md`](./07-motion.md). The contract:

- `prefers-reduced-motion: reduce` stops the reveal, the marquee, the product
  mock and all hover transforms.
- Content is visible without JavaScript via the `<noscript>` rule.
- No autoplaying video with sound; no flashing content.
- Scroll behaviour switches to `auto` under reduced motion.

---

## 6. Keyboard

- Tab order follows DOM order: skip link → nav → main → footer.
- The mobile menu opens with Enter/Space and closes with the button; do not
  trap focus unless it is a modal.
- If you add a modal (waitlist, video), trap focus inside it, close on `Escape`,
  and return focus to the trigger.
- The nav CTA and all content buttons are reachable and have a visible ring.
- Do not use `tabindex` greater than 0.
- Do not make a non-interactive card focusable "for hover"; use a real link or
  button inside it.

### Target size

- Icon buttons: at least `36×36px` (`h-9 w-9`), ideally `44×44px`.
- Text buttons: at least 40px tall (`py-2.5` + 14px text).
- Nav links: the hit area should include vertical padding; do not rely on the
  13.5px text alone.
- Space adjacent targets by at least 8px.

---

## 7. Text and zoom

- Body text is `13.5–16px`; it must remain readable at 200% zoom.
- The layout uses `max-w-frame` and flex/grid, so it reflows at 320px width.
- Avoid fixed heights on text containers. The hero window has fixed heights by
  design, but it is decorative; the surrounding text is not.
- Use `text-wrap: balance` on headings only; it degrades gracefully.
- Do not disable pinch-zoom:

```html
<!-- Do NOT add maximum-scale=1 or user-scalable=no -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

---

## 8. Images and icons

- Every `<img>` needs an `alt`. Decorative images use `alt=""`.
- Inline SVG icons get `aria-hidden="true"` when paired with a text label.
- Icon-only buttons need an `aria-label`.
- The logo mark is decorative beside the wordmark; hide it and label the link.
- Product mock screenshots need a caption or a nearby text description; the
  image is not the only explanation of the feature.

---

## 9. The light-only decision

```tsx
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#F7F7F5",
};
```

```css
:root {
  color-scheme: light;
}
```

This tells the browser not to apply a dark form-control theme over the warm
canvas. It is also an accessibility decision: the page has one designed
contrast environment rather than an automatic inversion that may fail contrast.

If you add a dark theme, design it explicitly and re-test every pair.

---

## 10. Testing checklist

- [ ] Tab through the whole page; every stop has a visible focus ring.
- [ ] The skip link appears on the first Tab and jumps to `#main`.
- [ ] The mobile menu opens, closes, and reports `aria-expanded`.
- [ ] Headings run h1 → h2 → h3 with no skipped levels.
- [ ] The marquee's duplicate content is hidden from AT.
- [ ] The comparison's ✗/✓ marks are `aria-hidden` and the text carries meaning.
- [ ] All text passes 4.5:1 against its actual background.
- [ ] The page is readable at 200% zoom and at 320px width.
- [ ] `prefers-reduced-motion: reduce` stops all animation.
- [ ] The page is usable with JavaScript disabled (content visible).
- [ ] Every image has an appropriate `alt`; every icon-only button has a label.
- [ ] No `outline: none` without an equivalent replacement.

---

## 11. A note on "premium" and accessibility

The two are not in tension here. The system's restraint — one accent, strong
ink, generous space, large headings — is already accessible. The usual failures
come from adding things: a low-contrast grey caption, a text-free icon button, a
scroll animation that cannot be turned off, a custom cursor.

When in doubt, remove the effect rather than lower the contrast.

Next: [`09-page-recipe.md`](./09-page-recipe.md).
