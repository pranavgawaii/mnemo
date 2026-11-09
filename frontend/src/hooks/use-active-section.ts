"use client";

import { useEffect, useState } from "react";

/** Track the last section to pass its anchor offset, in either scroll direction. */
export function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const elements = ids.flatMap((id, index) => {
      const element = document.getElementById(id);
      return element ? [{ element, index }] : [];
    });
    if (!elements.length) return;

    let positions: { top: number; index: number }[] = [];
    let frame = 0;
    let dirty = true;
    let disposed = false;

    function update() {
      frame = 0;
      if (dirty) {
        // Batch measurements after layout changes; scrolling only reads scrollY.
        const scrollY = window.scrollY;
        positions = elements.map(({ element, index }) => ({
          index,
          top: element.getBoundingClientRect().top + scrollY -
            (parseFloat(getComputedStyle(element).scrollMarginTop) || 0),
        }));
        dirty = false;
      }
      let next = 0;
      for (const position of positions) {
        if (position.top > window.scrollY + 2) break;
        next = position.index;
      }
      setActive(next);
    }

    function schedule() {
      if (!disposed && !frame) frame = requestAnimationFrame(update);
    }

    function measure() {
      dirty = true;
      schedule();
    }

    const observer = new ResizeObserver(measure);
    elements.forEach(({ element }) => observer.observe(element));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    void document.fonts.ready.then(measure);
    schedule();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
    };
  }, [ids]);

  return { active, setActive };
}
