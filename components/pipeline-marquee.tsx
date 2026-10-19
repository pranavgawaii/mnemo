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

/**
 * The recall path. The marquee itself is unchanged — the strip, its pill and
 * the scrolling stage names are exactly as before. What changed is the framing:
 * the whole section now sits on its own surface. A full-bleed band in
 * `hairline` wraps the strip *and* the caption underneath, so the two read as
 * one block instead of a strip with a line of copy floating below it on the
 * same background as the hero. The track is edge-masked so the looping stage
 * names dissolve in and out instead of being sliced mid-word against the pill.
 *
 * The band only carries a top border and no bottom margin: the section below it
 * already opens with its own top border on white, so the two meet flush. That
 * removes the dead strip of page background that used to sit between the
 * caption and the next section.
 */
export function PipelineMarquee() {
  return (
    <section
      aria-label="The recall path"
      className="mt-14 border-t border-line bg-hairline pb-6 md:mt-20"
    >
      <div className="py-8">
        <div className="mx-auto flex w-full max-w-frame flex-col items-center gap-8 overflow-hidden px-6 md:flex-row">
          <div className="relative z-10 shrink-0 rounded-[6px] border border-line bg-white/50 px-3 py-1.5 text-[12px] font-medium text-muted whitespace-nowrap uppercase tracking-widest">
            The recall path
          </div>

          {/* The inline pill eats the ticker's left edge, so above `md` the mask
              keeps a fully-hidden lead-in. Without it the tail of a stage name
              ("bed", "d") stayed legible right beside the pill instead of
              dissolving. Small screens stack the pill, so the edge there is the
              page gutter and a shorter fade is enough. */}
          <div className="relative min-w-0 w-full flex-1 overflow-hidden [-webkit-mask-image:linear-gradient(to_right,transparent,transparent_10px,black_60px,black_calc(100%_-_60px),transparent_calc(100%_-_10px),transparent)] [mask-image:linear-gradient(to_right,transparent,transparent_10px,black_60px,black_calc(100%_-_60px),transparent_calc(100%_-_10px),transparent)] md:[-webkit-mask-image:linear-gradient(to_right,transparent,transparent_28px,black_104px,black_calc(100%_-_104px),transparent_calc(100%_-_28px),transparent)] md:[mask-image:linear-gradient(to_right,transparent,transparent_28px,black_104px,black_calc(100%_-_104px),transparent_calc(100%_-_28px),transparent)]">
            <div className="flex w-max animate-marquee">
              <StageSet />
              <StageSet />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 px-6 text-center text-[13.5px] leading-relaxed text-muted text-balance">
        Every write and every search moves through the same six steps.
      </p>
    </section>
  );
}
