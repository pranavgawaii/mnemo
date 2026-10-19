import { ArrowDown, ArrowRight } from "lucide-react";
import { AnimatedSection } from "./animated-section";
import { MemoryWindow } from "./memory-window";
import { HeroOrbit } from "./hero-orbit";
import { PRIMARY_CTA, SECONDARY_CTA } from "../lib/site";

const stack = [
  "Postgres + pgvector",
  "384-d local embeddings",
  "all-MiniLM-L6-v2",
  "No managed vector DB",
];

export function Hero() {
  return (
    <section id="top" className="relative w-full pt-28 sm:pt-32 lg:pt-36 pb-14">
      <HeroOrbit />
      <div className="relative z-10 max-w-frame mx-auto px-6">
        <div className="flex flex-col lg:flex-row justify-between items-center mb-12 gap-10">
          {/* LEFT: headline */}
          <AnimatedSection delay={100} className="flex-1 w-full text-center lg:text-left">
            <h1 className="text-[40px] sm:text-[52px] lg:text-[60px] xl:text-[66px] font-medium leading-[1.05] tracking-[-0.035em] text-ink">
              Give your AI agents a
              <br className="hidden sm:block" />{" "}
              <span
                className="italic font-normal tracking-normal text-[112%]"
                style={{ fontFamily: "var(--font-redaction), serif" }}
              >
                memory
              </span>{" "}
              that lasts.
            </h1>
          </AnimatedSection>

          {/* RIGHT: copy + CTAs */}
          <div className="flex flex-col items-center lg:items-end gap-7 shrink-0 w-full lg:w-auto">
            <AnimatedSection delay={200}>
              <p className="text-[15px] sm:text-[16px] text-muted leading-[1.65] text-center lg:text-right max-w-[400px] mx-auto lg:mx-0">
                Mnemo stores what an agent learns and hands back the context
                that still matters. Fresh facts rise, stale ones fade, and
                conflicts are flagged instead of silently overwritten.
              </p>
            </AnimatedSection>

            <AnimatedSection
              delay={300}
              className="flex flex-wrap items-center justify-center lg:justify-end gap-3 w-full"
            >
              <a
                href={SECONDARY_CTA.href}
                className="inline-flex items-center gap-2 bg-white border border-line text-ink rounded-[8px] px-5 py-2.5 text-[14px] font-medium hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 shadow-sm"
              >
                <ArrowDown className="w-4 h-4" strokeWidth={1.8} />
                {SECONDARY_CTA.label}
              </a>
              <a
                href={PRIMARY_CTA.href}
                target={PRIMARY_CTA.external ? "_blank" : undefined}
                rel={PRIMARY_CTA.external ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 bg-[#18181B] text-[#FAFAFA] rounded-[8px] px-5 py-2.5 text-[14px] font-medium hover:bg-[#27272A] hover:-translate-y-[1px] hover:shadow-md transition-all shadow-[0_4px_14px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-white/10"
              >
                {PRIMARY_CTA.label}
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </a>
            </AnimatedSection>
          </div>
        </div>
      </div>

      {/* PRODUCT WINDOW — scaled from the top-left so it bleeds toward the
          right edge, matching the reference composition. */}
      <AnimatedSection
        delay={400}
        className="relative z-10 w-full mt-10 mb-20 md:mb-40 max-w-frame mx-auto px-6 overflow-visible"
      >
        <div className="w-full shrink-0 transform md:scale-[1.15] md:origin-top-left relative">
          <MemoryWindow />
        </div>
      </AnimatedSection>

      {/* Stack strip */}
      <AnimatedSection delay={460} className="relative z-10 max-w-frame mx-auto px-6">
        <div className="flex flex-col items-center gap-3.5 lg:items-start">
          <ul className="flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
            {stack.map((item) => (
              <li
                key={item}
                className="rounded-[6px] border border-line bg-white px-2.5 py-[5px] text-[12px] font-medium leading-none tracking-[-0.005em] text-ink/75 shadow-[0_1px_1.5px_rgba(10,10,15,0.04)]"
              >
                {item}
              </li>
            ))}
          </ul>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
            Illustrative product view
          </span>
        </div>
      </AnimatedSection>
    </section>
  );
}
