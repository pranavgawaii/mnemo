"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A short visual dwell at the page boundary, with no timed input lock. */
export function FooterArrival({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let frame = 0;

    function update() {
      frame = 0;
      if (!element) return;
      // One batched layout read; the writes affect transforms only.
      const top = element.getBoundingClientRect().top;
      const progress = Math.max(
        0,
        Math.min(1, (innerHeight - top) / (innerHeight * 0.55)),
      );
      const settled = reduced.matches ? 1 : 1 - Math.pow(1 - progress, 3);
      if (content.current)
        content.current.style.transform = `translate3d(0, ${30 * (1 - settled)}px, 0)`;
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    function onScroll() {
      if (visible) schedule();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    observer.observe(element);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <div
      ref={root}
      className="footer-arrival relative isolate overflow-clip bg-[linear-gradient(180deg,#F7F7F5_0%,#E8E8E2_100%)] pt-6 sm:pt-10 motion-reduce:pt-4"
    >
      <div
        ref={content}
        className="footer-arrival-content transition-transform duration-200 ease-out motion-reduce:transition-none"
      >
        {children}
      </div>
    </div>
  );
}
