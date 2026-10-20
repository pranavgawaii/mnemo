"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";

interface TabListOptions {
  /** Number of tabs in the list. */
  count: number;
  /** Index of the currently selected tab. */
  active: number;
  /** Called with the index the user navigated to. */
  onChange: (index: number) => void;
}

/**
 * Keyboard behaviour for a WAI-ARIA tab list.
 *
 * Arrow keys move between tabs with wrap-around, Home/End jump to the ends, and
 * selection follows focus (the "automatic activation" pattern). ARIA also
 * requires a *roving tabindex*: only the active tab is in the tab order, so
 * pair this with `tabIndex={active === i ? 0 : -1}` on each tab and
 * `ref={register(i)}`.
 *
 * Both axes accept arrow keys on purpose: some of Mnemo's tab lists flip
 * orientation at a breakpoint (a row on mobile, a column on desktop), and this
 * keeps the controls usable either way.
 */
export function useTabList({ count, active, onChange }: TabListOptions) {
  const refs = useRef<(HTMLElement | null)[]>([]);

  const register = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      refs.current[index] = el;
    },
    [],
  );

  const select = useCallback(
    (index: number) => {
      onChange(index);
      refs.current[index]?.focus();
    },
    [onChange],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (count === 0) return;

      let next: number | null = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = (active + 1) % count;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = (active - 1 + count) % count;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = count - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      select(next);
    },
    [active, count, select],
  );

  return { register, onKeyDown };
}
