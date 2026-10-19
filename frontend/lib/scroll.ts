/**
 * Anchor scrolling helpers, shared by the navbar, the footer and the
 * `ScrollManager` client component.
 *
 * The site has one fixed navbar of a known height, so every in-page jump has to
 * land the target the same distance below the top of the viewport.
 *
 * Rather than keep a second copy of that distance here, the JS reads each
 * target's own `scroll-margin-top` (Tailwind's `scroll-mt-*`). The CSS stays the
 * single source of truth, so the JS-assisted scroll and the browser's native
 * fragment jump always agree — a constant in here would silently disagree the
 * moment a component changed its `scroll-mt-*`.
 */

/** Fallback when a target declares no `scroll-margin-top`. */
export const NAV_OFFSET = 64;

/** The fragment id in an href — handles `#features` and `/#features` alike. */
function fragmentId(href: string): string | null {
  const index = href.indexOf("#");
  if (index === -1) return null;
  const raw = href.slice(index + 1);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The distance to leave above a target: its own `scroll-margin-top` when it sets
 * one, otherwise `NAV_OFFSET`. A computed `0px` means "no rule applied", which is
 * never what we want, so it falls back too.
 */
function offsetFor(element: Element): number {
  const margin = Number.parseFloat(
    window.getComputedStyle(element).scrollMarginTop
  );
  return Number.isFinite(margin) && margin > 0 ? margin : NAV_OFFSET;
}

/**
 * Scroll so `element`'s top edge sits `offsetFor(element)` px below the viewport
 * top.
 *
 * Deliberately computed and applied with `window.scrollTo` rather than
 * `scrollIntoView`: the landing page wraps its sections in a container with
 * `overflow: hidden`, which makes that container the nearest scroll container —
 * so `scrollIntoView` would try to scroll *it* (which never moves) instead of
 * the document, and the page would appear not to move at all.
 */
export function scrollToElement(element: Element, smooth = true): void {
  const top = Math.max(
    0,
    Math.round(
      element.getBoundingClientRect().top + window.scrollY - offsetFor(element)
    )
  );
  const behavior = smooth && !prefersReducedMotion() ? "smooth" : "auto";

  window.scrollTo({ top, behavior });
  if (behavior === "auto") return;

  // Safety net: some engines silently refuse animated scrolling when `html` and
  // `body` clip their overflow (`overflow-x: clip`, below). Rather than leave the
  // link dead, check that the scroll actually started and jump if it did not.
  const start = window.scrollY;
  window.setTimeout(() => {
    if (
      Math.abs(window.scrollY - start) < 1 &&
      Math.abs(window.scrollY - top) > 4
    ) {
      window.scrollTo({ top, behavior: "auto" });
    }
  }, 200);
}

/** Scroll to the fragment of `href` (`#id` or `/#id`) if it exists here. */
export function scrollToHash(href: string, smooth = true): boolean {
  const id = fragmentId(href);
  if (!id) return false;
  const element = document.getElementById(id);
  if (!element) return false;
  scrollToElement(element, smooth);
  return true;
}

/**
 * True when `href` points at a hash on the page we are already on — i.e. it can
 * be handled as an in-page scroll instead of a navigation.
 */
export function isSamePageHash(href: string): boolean {
  if (!href.startsWith("#") && !href.startsWith("/")) return false;
  try {
    const url = new URL(href, window.location.href);
    return (
      url.origin === window.location.origin &&
      url.pathname === window.location.pathname &&
      url.hash.length > 1
    );
  } catch {
    return false;
  }
}
