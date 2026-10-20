/**
 * Shared section shell for the documentation page. A numbered, linked title,
 * then the section's own content.
 *
 * Every section carries its own top hairline, including the first one under a
 * chapter rule: a boundary you can see is what tells you where a section
 * starts, and it is the only thing anchoring the heading after the contents
 * jump you down the page. `mt-10` puts the rule halfway between the two
 * sections (`pt-10` spaces it from the heading below), so the rule never sits
 * against the previous section's last block.
 *
 * The scroll offset clears exactly the chrome that covers the top of the
 * viewport: the fixed bar plus its rule and the progress bar under it (66px) on
 * desktop, and the pinned chip row that sits below them (113px) on narrow
 * screens. Landing that shallow means a jump shows the section's rule and
 * heading and nothing sliced in half above them.
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
      className="group/section mt-10 scroll-mt-[120px] border-t border-line pt-10 lg:scroll-mt-[66px]"
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
