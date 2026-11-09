export function DocsHeading({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id="overview" className="scroll-mt-24 pb-2">
      <p className="mb-4 text-[12px] text-muted">Mnemo documentation</p>
      <h1 className="text-balance text-[34px] font-medium leading-[1.1] tracking-[-0.035em] text-ink sm:text-[42px]">
        {title}
      </h1>
      <p className="mt-4 max-w-[660px] text-[15px] leading-[1.8] text-muted">
        {children}
      </p>
    </div>
  );
}
