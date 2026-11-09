"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DOC_PAGES } from "@/lib/docs";

export function DocsPagination() {
  const pathname = usePathname();
  const index = DOC_PAGES.findIndex((page) => page.href === pathname);
  if (index < 0) return null;
  const previous = DOC_PAGES[index - 1];
  const next = DOC_PAGES[index + 1];
  return (
    <nav
      aria-label="More documentation"
      className="mt-12 grid gap-3 border-t border-line pt-6 sm:grid-cols-2"
    >
      {previous ? (
        <Link
          href={previous.href}
          className="group rounded-xl border border-line bg-white p-4 transition-colors hover:border-accent/30"
        >
          <span className="text-[12px] text-muted">Previous</span>
          <span className="mt-2 flex items-center gap-2 text-[14px] font-medium text-ink">
            <ArrowLeft aria-hidden="true" className="h-4 w-4 text-muted" />
            {previous.title}
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group rounded-xl border border-line bg-white p-4 text-right transition-colors hover:border-accent/30"
        >
          <span className="text-[12px] text-muted">Next</span>
          <span className="mt-2 flex items-center justify-end gap-2 text-[14px] font-medium text-ink">
            {next.title}
            <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted" />
          </span>
        </Link>
      ) : (
        <Link
          href="/playground"
          className="rounded-xl border border-line bg-white p-4 text-right transition-colors hover:border-accent/30"
        >
          <span className="text-[12px] text-muted">Explore</span>
          <span className="mt-2 flex items-center justify-end gap-2 text-[14px] font-medium text-ink">
            Try the playground
            <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted" />
          </span>
        </Link>
      )}
    </nav>
  );
}
