import { AnimatedSection } from "./animated-section";

/**
 * The reference design closes with a single pull-quote. Mnemo has no customer
 * quotes, so this states the project's actual design principle instead of
 * inventing an attribution. Kept on the page background so the landing stays a
 * single light theme; the emphasis comes from scale and rules, not colour.
 */
export function PrincipleQuote() {
  return (
    <section id="principle" className="w-full scroll-mt-16">
      <AnimatedSection className="max-w-[1000px] mx-auto px-6 pt-12 md:pt-16 pb-16 md:pb-20 flex flex-col items-center text-center">
        <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-muted">
          Design principle
        </span>
        <p className="mt-6 text-[22px] md:text-[30px] font-medium leading-[1.45] tracking-[-0.01em] text-ink max-w-[860px] text-balance">
          Memory that forgets is memory you can trust. Mnemo ranks by relevance,
          not recency — and when two memories disagree, it flags the conflict
          instead of quietly picking a winner.
        </p>
      </AnimatedSection>
    </section>
  );
}
