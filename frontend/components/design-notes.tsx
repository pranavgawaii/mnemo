import { AnimatedSection } from "./animated-section";

/**
 * Closing statement + decision ledger.
 *
 * Mnemo has no customer quotes, so this states the project's actual design
 * principle and then shows the four bounds that implement it. The ledger is a
 * deliberate contrast to the alternating rows above: flat surfaces, hairline
 * rules and monospaced values, with no blur or gradient washes.
 */
const decisions = [
  {
    value: "180 d",
    label: "A long half-life, so relevance decides",
    why: "Decay is real but gentle. Shorten the window and ranking stops being about relevance at all — search degenerates into “newest first”.",
  },
  {
    value: "floor 0.70",
    label: "The recency penalty is capped at 30%",
    why: "An old memory can fade, but it can never bury a clearly better semantic match. The floor is high on purpose.",
  },
  {
    value: "0.9 – 1.1",
    label: "Importance only breaks ties",
    why: "A ±10% band. Wide enough to separate two comparably-relevant memories, far too narrow to outrank similarity.",
  },
  {
    value: "gate 0.82",
    label: "Conflicts are flagged, not resolved",
    why: "A similarity gate plus a negation check, with no LLM call. A human names the winner, and the loser keeps its row.",
  },
];

export function DesignNotes() {
  return (
    <section
      id="principle"
      className="w-full scroll-mt-[108px] pt-24 md:pt-32 pb-4"
    >
      <div className="max-w-frame mx-auto px-6">
        <div className="grid md:grid-cols-[1fr_1.15fr] gap-14 md:gap-20 items-start">
          <AnimatedSection>
            <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-muted">
              Design principle
            </span>
            <p className="mt-7 text-[24px] md:text-[31px] font-medium leading-[1.32] tracking-[-0.02em] text-ink text-balance">
              Memory that forgets is memory you can{" "}
              <span
                className="italic font-normal tracking-normal"
                style={{ fontFamily: "var(--font-redaction), serif" }}
              >
                trust
              </span>
              .
            </p>
            <p className="mt-6 text-[15px] leading-[1.75] text-muted max-w-[440px]">
              Mnemo ranks by relevance, not recency — and when two memories
              disagree it flags the conflict rather than quietly picking a
              winner. Every figure beside this is a deliberate bound, chosen
              against a measurement.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={140} className="w-full">
            <div className="border-t border-line">
              {decisions.map((decision) => (
                <div
                  key={decision.value}
                  className="grid grid-cols-[88px_1fr] sm:grid-cols-[110px_1fr] gap-5 sm:gap-8 border-b border-line py-6"
                >
                  <div className="font-mono text-[11.5px] text-accent-ink pt-[3px]">
                    {decision.value}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-medium text-ink leading-snug">
                      {decision.label}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-[1.65] text-muted">
                      {decision.why}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
