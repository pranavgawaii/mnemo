"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { HookSidebar } from "./ui/hook-sidebar";
import { DOC_NAV } from "../lib/site";

// One flat list: the rail is a single continuous line for the whole page, so
// the marker never resets between chapters.
const ITEMS = DOC_NAV.flatMap((group) =>
  group.items.map((item) => ({ label: item.label, href: `#${item.id}` })),
);
const IDS = DOC_NAV.flatMap((group) => group.items.map((item) => item.id));

// Tighter than the registry default so all of the contents fit a 204px column.
const RAIL_OVERRIDES =
  "[&_[data-slot=hook-sidebar-label]]:pb-2 [&_[data-slot=hook-sidebar-label]]:pl-0.5 [&_[data-slot=hook-sidebar-label]]:text-[10.5px] [&_[data-slot=hook-sidebar-label]]:tracking-[0.16em] [&_[data-slot=hook-sidebar-label]]:text-faint [&_[data-slot=hook-sidebar-item]]:py-1 [&_[data-slot=hook-sidebar-item]]:text-[12.5px]";

/**
 * Documentation contents. Desktop is the vendored `hook-sidebar` rail from
 * swamimalode07/rare-ui: one dashed indigo line down the left, with a corner
 * marker that slides to the section in view. A plain `IntersectionObserver`
 * drives it; the aside is `sticky`, which only works because `html, body` use
 * `overflow-x: clip` (see globals.css): `hidden` would create a scroll
 * container and break it. On mobile the same items become a horizontal chip row
 * pinned under the nav.
 */
export function DocsToc() {
  const [active, setActive] = useState(0);

  // Scroll-spy: the topmost visible section wins.
  useEffect(() => {
    const elements = IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (!top) return;
        const index = IDS.indexOf(top.target.id);
        if (index !== -1) setActive(index);
      },
      { rootMargin: "-92px 0px -55% 0px", threshold: [0, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const activeId = IDS[active];

  return (
    <>
      {/* Mobile: horizontal chips under the nav */}
      <nav
        aria-label="Sections"
        className="sticky top-16 z-30 -mx-6 mb-1 border-b border-line bg-background/90 px-6 py-2.5 backdrop-blur lg:hidden"
      >
        <ul className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ITEMS.map((item) => {
            const id = item.href.slice(1);
            const isActive = activeId === id;
            return (
              <li key={item.href} className="shrink-0">
                <a
                  href={item.href}
                  aria-current={isActive ? "true" : undefined}
                  className={`block whitespace-nowrap rounded-full border px-3 py-1 text-[12px] transition-colors ${
                    isActive
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white text-muted"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop: the Hook Sidebar rail */}
      <aside className="sticky top-[84px] hidden max-h-[calc(100vh-108px)] flex-col overflow-y-auto pb-4 lg:flex">
        <HookSidebar
          items={ITEMS}
          label="On this page"
          value={active}
          onChange={setActive}
          color="#4F46E5"
          dashed
          className={RAIL_OVERRIDES}
        />

        <a
          href="#overview"
          className="mt-4 inline-flex items-center gap-1.5 pl-5 text-[12px] text-faint transition-colors hover:text-ink"
        >
          <ArrowUp className="h-3 w-3" strokeWidth={2} />
          Back to top
        </a>
      </aside>
    </>
  );
}
