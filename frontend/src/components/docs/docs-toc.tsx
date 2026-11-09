"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { DOC_PAGES } from "@/lib/docs";
import { useActiveSection } from "@/hooks/use-active-section";

export function DocsToc() {
  const pathname = usePathname();
  const page = DOC_PAGES.find((page) => page.href === pathname) ?? DOC_PAGES[0];
  const ids = useMemo(() => page.sections.map((section) => section.id), [page]);
  const { active } = useActiveSection(ids);
  return (
    <aside className="min-w-0 lg:sticky lg:top-24">
      <nav aria-label="Documentation">
        <p className="mb-4 hidden text-[12px] font-medium text-muted lg:block">
          Documentation
        </p>
        <ul className="grid grid-cols-2 gap-2 border-b border-line pb-5 sm:grid-cols-4 lg:grid-cols-1 lg:gap-1 lg:border-0 lg:pb-0">
          {DOC_PAGES.map((item) => (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-[13px] transition-colors ${pathname === item.href ? "bg-accent-soft font-medium text-accent-ink" : "bg-white/65 text-muted hover:bg-white hover:text-ink lg:bg-transparent"}`}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav
        aria-label="On this page"
        className="mt-8 hidden border-t border-line pt-6 lg:block"
      >
        <p className="mb-3 px-3 text-[11px] text-faint">On this page</p>
        <ul className="space-y-1">
          {page.sections.map((section, index) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={active === index ? "location" : undefined}
                className={`block border-l px-3 py-1.5 text-[13px] transition-colors ${active === index ? "border-accent text-accent-ink" : "border-line text-muted hover:border-faint hover:text-ink"}`}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
