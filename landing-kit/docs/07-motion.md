# 07 · Motion

Motion has exactly one job here: **reveal content when it arrives**. It is not
used to demonstrate technical sophistication. The entire system is a fade-up, a
marquee, a 1px button lift and an underline sweep.

---

## 1. The reveal

**Source:** `components/animated-section.tsx` · **Drop-in:** `code/components/animated-section.tsx`

```tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

export function AnimatedSection({
  children,
  className = "",
  delay = 0,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.12 }
    );

    observer.observe(node);
    return () => observer.unobserve(node);
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={isVisible ? "visible" : "pending"}
      className={`${className} ${isVisible ? "animate-fade-up" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms`, ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
}
```

### Why this implementation

| Choice | Reason |
|---|---|
| `IntersectionObserver` | No scroll listener, no layout thrash, no library |
| `threshold: 0.12` | Fires when ~12% of the block is visible; early enough to feel responsive |
| `unobserve` after first entry | The reveal plays **once**; scrolling back up should not replay it |
| `opacity-0` before | Prevents a flash of the final state before the observer runs |
| `data-reveal` | A hook for tests, debugging, and the no-JS fallback |
| `animationDelay` inline | Per-instance stagger without generating new classes |
| `motion-reduce` in CSS | The component itself stays simple; the stylesheet owns the exception |

### No-JS fallback

The page includes a `<noscript>` style so content is never invisible without
JavaScript:

```tsx
<noscript>
  <style>{`[data-reveal="pending"]{opacity:1 !important}`}</style>
</noscript>
```

Put it in the root layout, beside the `<body>` content.

### The animation

```css
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-up {
  animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
```

- **14px**, not 40px. It is a settle, not a slide.
- **0.7s**, not 0.3s. The slow ease is what makes it feel expensive.
- `cubic-bezier(0.16, 1, 0.3, 1)` — a strong ease-out; fast start, long calm
  finish. This curve is used for buttons and hovers too.
- `forwards` keeps the final state; `opacity: 0` is the pre-animation state.
- Only `opacity` and `transform` animate, so the browser can keep it on the
  compositor.

---

## 2. Stagger

Use delay to create a reading order, not a fireworks show.

| Context | Delays |
|---|---|
| Hero headline | `100ms` |
| Hero support copy | `200ms` |
| Hero buttons | `300ms` |
| Hero product window | `400ms` |
| Hero stack strip | `460ms` |
| Three-column cards | `0 / 90 / 180ms` |
| Comparison cards | `100 / 200ms` |
| Any single block | `0` |

Rules:

- Keep the total cascade under ~600ms; after that the last item feels late.
- Do not animate every paragraph. One `AnimatedSection` per meaningful block.
- Nested `AnimatedSection`s double the delay; avoid nesting.
- The delay is applied to the *animation start*, not to the element's
  visibility; a section far below the fold simply starts when it arrives.

```tsx
<AnimatedSection delay={100}>Headline</AnimatedSection>
<AnimatedSection delay={200}>Supporting copy</AnimatedSection>
<AnimatedSection delay={300}>Buttons</AnimatedSection>
```

---

## 3. Marquee

```css
@keyframes marquee {
  from { transform: translateX(0%); }
  to   { transform: translateX(-50%); }
}

.animate-marquee {
  animation: marquee 32s linear infinite;
}

.animate-marquee:hover {
  animation-play-state: paused;
}
```

- The track must contain the stage set **twice**; translating by exactly `-50%`
  then loops seamlessly.
- 32 seconds for a six-item set. Shorter feels frantic; longer feels broken.
- Pause on hover so a reader can finish a label.
- Add `aria-label` to the section and mark the duplicate set `aria-hidden` in a
  production build (see [accessibility](./08-accessibility.md)).
- Stop the animation entirely under reduced motion; the duplicated content is
  still visible, just static.

---

## 4. Hover and press

| Element | Motion |
|---|---|
| Primary button | `-translate-y-px`, background `#18181B → #27272A`, shadow deepens, 300ms |
| Secondary button | `-translate-y-0.5`, background `black/[0.03]`, shadow `soft`, 300ms |
| Nav link | underline `background-size: 0 → 100%` over 350ms, colour to accent 200ms |
| Nav CTA | lift 1px, shadow deepens, white sheen fades in |
| Chip | none; chips are static |
| Card | border colour shift only, no lift |
| Arrow link | arrow translates `2px` on hover |

```html
class="transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-px active:translate-y-0 active:scale-[0.985]"
```

The press state is tiny: `scale(0.985)` for 150ms. It gives the control a
physical feel without a bounce.

**Do not** animate `width`, `height`, `top`, `left` or `margin`. Layout
animation is the fastest way to make a premium page feel cheap.

---

## 5. Reduced motion

Every animation must be disabled here:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }

  .animate-fade-up,
  .animate-cascade,
  .animate-marquee,
  .animate-draw-line {
    animation: none;
    opacity: 1;
  }

  .link-underline {
    transition: none;
  }

  .orbit-spin,
  .orbit-upright,
  .orbit-core-pulse {
    animation: none;
  }
}
```

For hover transforms, add `motion-reduce:transition-none` and reset the
transform:

```html
class="transition-all duration-300 hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0"
```

The page must be fully readable and fully functional with motion off. This is
not optional; some users experience nausea or migraine from scroll motion.

---

## 6. Product-mock animations

The hero window uses a slightly different rhythm because it is a simulation:

| Element | Timing |
|---|---|
| Timeline line draws | `5.4s` linear, once |
| Row 1 (stored) | `1400ms` |
| Row 2 (recall) | `2200ms` |
| Row 3 (finding) | `3000ms` |
| Row 4 (fact) | `3800ms` |
| Row 5 (resolution) | `4600ms` |
| Row 6 (check) | `5400ms` |
| Orbit rings | 48–96s linear, infinite |
| Orbit core pulse | `4.5s` ease-in-out, infinite |

These are deliberately slower than the page reveal. A product demo should feel
like it is thinking, not racing. Pause ring rotations on hover so nodes are easy
to hit. Stop everything under reduced motion.

---

## 7. What not to do

| Don't | Why |
|---|---|
| A scroll listener that updates state on every frame | Jank, and unnecessary; `IntersectionObserver` is built for this |
| Parallax layers | Fights the calm, editorial layout |
| Scroll-jacking / snap | Breaks keyboard and trackpad expectations |
| Reveal every paragraph | The page feels like it is loading forever |
| Bounce or spring on buttons | The system's easing is a clean ease-out |
| Infinite decorative animation in peripheral vision | Distracts from reading |
| Animating `height: auto` | Expensive and can shift layout |
| Replaying the reveal on scroll-up | The content should feel settled, not alive |
| Hover effects that move neighboring elements | Layout thrash and accidental clicks |
| Motion that ignores `prefers-reduced-motion` | An accessibility failure |

---

## 8. If you use Framer Motion / Motion

The system does not require it. If the project already has `motion`, the same
effect is:

```tsx
import { motion, useReducedMotion } from "motion/react";

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

Keep the same numbers. A library does not improve the choreography; it only
changes who owns the observer.

Next: [`08-accessibility.md`](./08-accessibility.md).
