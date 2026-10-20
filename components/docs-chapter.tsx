import type { ReactNode } from "react";

/**
 * A chapter break between groups of docs sections. The heavy top rule and the
 * note keep the page from reading as one continuous run of identical sections.
 * There is deliberately no bottom padding: the section under it carries its own
 * hairline and spacing, so every section starts the same way.
 */
export function DocsChapter({
  label,
  note,
  children,
}: {
  label: string;
  note: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="docs-chapter mt-16 first:mt-0">
      <div className="border-t-2 border-ink pt-4">
        <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.2em] text-ink">
          {label}
        </h2>
        <p className="mt-2 max-w-[620px] text-[13.5px] leading-[1.7] text-muted">
          {note}
        </p>
      </div>
      {children}
    </div>
  );
}
