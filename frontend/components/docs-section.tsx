/**
 * Shared section shell for the documentation page. A numbered, linked title,
 * then the section's own content. Sections are separated by a top hairline; the
 * first section inside a chapter drops it (see `.docs-chapter` in globals.css)
 * so nothing doubles up under the chapter rule.
 */
export function DocsSection({
  id,
  index,
  title,
  intro,
  children,
}: {
  id: string;
  index?: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="group/section scroll-mt-[100px] border-t border-line pt-10"
    >
      <div className="flex items-start gap-3">
        {index && (
          <span className="pt-[7px] font-mono text-[11px] tabular-nums text-faint">
            {index}
          </span>
        )}
        <div className="flex items-start gap-2.5">
          <h2 className="text-[24px] font-medium leading-[1.2] tracking-[-0.025em] text-ink md:text-[27px]">
            {title}
          </h2>
          <a
            href={`#${id}`}
            aria-label={`Link to ${title}`}
            className="mt-1 rounded p-0.5 text-faint opacity-0 transition hover:text-ink focus-visible:opacity-100 group-hover/section:opacity-100"
          >
            #
          </a>
        </div>
      </div>

      {intro && (
        <p className="mt-3 max-w-[700px] text-[15px] leading-[1.75] text-muted">
          {intro}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-5 text-[14px] leading-[1.75] text-muted">
        {children}
      </div>
    </section>
  );
}
