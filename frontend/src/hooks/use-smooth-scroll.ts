"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import { registerScrollDriver } from "@/lib/scroll";

/** Light wheel easing only; touch and reduced-motion users keep native scrolling. */
export function useSmoothScroll() {
  useEffect(() => {
    const enabled = window.matchMedia(
      "(pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let instance: Lenis | undefined;
    let detach: (() => void) | undefined;
    let disposed = false;
    let generation = 0;

    async function configure() {
      const current = ++generation;
      detach?.();
      instance?.destroy();
      detach = undefined;
      instance = undefined;
      if (!enabled.matches) return;
      const { default: SmoothScroll } = await import("lenis");
      if (disposed || current !== generation || !enabled.matches) return;
      const scroller = new SmoothScroll({
        autoRaf: true,
        lerp: 0.14,
        wheelMultiplier: 0.95,
        syncTouch: false,
        allowNestedScroll: true,
        anchors: false,
        stopInertiaOnNavigate: true,
        respectReducedMotion: true,
      });
      instance = scroller;
      detach = registerScrollDriver((top, smooth) =>
        scroller.scrollTo(top, { immediate: !smooth }),
      );
    }

    void configure();
    enabled.addEventListener("change", configure);
    return () => {
      disposed = true;
      generation++;
      enabled.removeEventListener("change", configure);
      detach?.();
      instance?.destroy();
    };
  }, []);
}
