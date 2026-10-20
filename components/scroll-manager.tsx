"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isSamePageHash, scrollToHash } from "../lib/scroll";

/**
 * Makes anchor links land where they are supposed to.
 *
 * Three problems are solved here, all of which showed up as "the page scrolls
 * and stops somewhere else":
 *
 *  1. Intercept same-page hash clicks. Every nav/footer link is a plain `<a>`,
 *     so clicking "Features" while on the landing page triggered a full document
 *     reload and a native fragment jump, which re-ran the smooth scroll from
 *     the top and landed on a stale position. We now preventDefault, scroll with
 *     the navbar offset and push the hash, so it stays a smooth in-page move.
 *  2. Correct the position after a navigation that carried a hash (e.g.
 *     `/playground` → `/#features`). The browser's own jump happens before local
 *     fonts and scroll-reveal animations settle, so we wait for the target to
 *     stop moving and then apply the offset.
 *  3. Cover hash changes we did not intercept: back/forward between hashes, or
 *     a hash typed or pasted into the URL bar.
 */
export function ScrollManager() {
  const pathname = usePathname();

  // (1) Same-page hash links become a smooth, offset-corrected scroll.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;

      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;

      if (!isSamePageHash(href)) return;
      // No such element here → let the browser navigate normally.
      if (!scrollToHash(href)) return;

      event.preventDefault();
      const url = new URL(href, window.location.href);
      window.history.pushState(null, "", url.hash);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // (2) After a navigation (or a cold load) that carries a hash, re-apply the
  //     offset once the target has stopped moving *and* fonts have settled,
  //     `display: swap` swaps the local display face in after first paint, which
  //     shifts every section below it.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === "#") return;

    let raf = 0;
    let tries = 0;
    let lastTop: number | null = null;
    let stableFrames = 0;

    // A final correction once the display face has swapped in: it changes the
    // height of everything below it, so the position we computed at first paint
    // can go stale.
    if (document.fonts) {
      document.fonts.ready.then(
        () => scrollToHash(hash),
        () => {}
      );
    }

    const step = () => {
      const element = document.getElementById(
        decodeURIComponent(hash.replace(/^#/, ""))
      );

      if (element) {
        const top = Math.round(
          element.getBoundingClientRect().top + window.scrollY
        );
        stableFrames = lastTop !== null && Math.abs(top - lastTop) <= 1
          ? stableFrames + 1
          : 0;
        lastTop = top;

        if (stableFrames >= 3) {
          scrollToHash(hash);
          return;
        }
      }

      if (++tries < 90) {
        raf = requestAnimationFrame(step);
      } else {
        scrollToHash(hash);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  // (3) Hash changes we did not intercept (back/forward, edited URL).
  useEffect(() => {
    function onHashChange() {
      if (window.location.hash) scrollToHash(window.location.hash);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return null;
}
