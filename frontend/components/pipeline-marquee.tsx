const stages = [
  { label: "Store", tone: "ink" as const },
  { label: "Embed", tone: "ink" as const },
  { label: "Vector scan", tone: "ink" as const },
  { label: "Re-rank", tone: "accent" as const },
  { label: "Recall", tone: "success" as const },
  { label: "Flag", tone: "ink" as const },
];

const toneClass: Record<(typeof stages)[number]["tone"], string> = {
  ink: "text-ink",
  accent: "text-accent",
  success: "text-[#16A34A]",
};

function StageSet() {
  return (
    <div className="flex items-center gap-16 md:gap-24 whitespace-nowrap px-8 md:px-12">
      {stages.map((stage) => (
        <div
          key={stage.label}
          className={`shrink-0 tracking-tight text-[28px] ${toneClass[stage.tone]} ${
            stage.tone === "ink" ? "" : "font-medium"
          }`}
        >
          {stage.label}
        </div>
      ))}
    </div>
  );
}

export function PipelineMarquee() {
  return (
    <div className="max-w-frame mx-auto px-6 mt-20 md:mt-28 mb-12">
      <div className="flex flex-col md:flex-row items-center border-t border-b border-line py-8 gap-8 w-full overflow-hidden">
        <div className="border border-line rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-muted whitespace-nowrap bg-white/50 shrink-0 uppercase tracking-widest z-10 relative">
          The recall path
        </div>

        <div className="flex-1 w-full min-w-0 overflow-hidden relative">
          <div className="flex w-max animate-marquee">
            <StageSet />
            <StageSet />
          </div>
        </div>
      </div>
    </div>
  );
}
