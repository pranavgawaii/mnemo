import { AnimatedSection } from "./animated-section";
import {
  ContradictionVisual,
  CosineVisual,
  DecayVisual,
  StoreVisual,
} from "./visuals";

type Step = {
  label: string;
  title: string;
  body: React.ReactNode;
  inOut: string;
  visual: React.ReactNode;
  reverse?: boolean;
};

const steps: Step[] = [
  {
    label: "Store",
    title: "Store what the agent learns.",
    body: (
      <>
        A fact goes in with a <Code>namespace</Code> and an optional{" "}
        <Code>importance</Code>. Mnemo embeds it in-process with{" "}
        <span className="text-ink">all-MiniLM-L6-v2</span> and writes the
        384-dimensional vector straight into Postgres. No embedding API key, no
        second store to keep in sync.
      </>
    ),
    inOut: "a sentence in → an embedded, addressable memory out",
    visual: <StoreVisual />,
  },
  {
    label: "Search",
    title: "Recall by meaning, not keywords.",
    body: (
      <>
        A question like <span className="text-ink">&ldquo;Where does Pranav live?&rdquo;</span>{" "}
        still lands on <span className="text-ink">&ldquo;Pranav lives in Bengaluru&rdquo;</span>{" "}
        — matched on meaning, not a substring. Vectors are L2-normalised so a dot
        product equals cosine similarity, matching pgvector&apos;s{" "}
        <Code>vector_cosine_ops</Code> index. Every query is filtered by namespace.
      </>
    ),
    inOut: "a question in → the nearest memories out",
    visual: <CosineVisual />,
    reverse: true,
  },
  {
    label: "Rank",
    title: "Fresh facts win ties. They never hijack relevance.",
    body: (
      <>
        Ranking is <Code>similarity × decay × importance</Code>, not raw vector
        distance. Decay is exponential with a 180-day half-life, floored at 0.7,
        and importance stays in a deliberately narrow 0.9–1.1 band — so recency
        reorders comparably-relevant memories without overriding a clearly better
        match.
      </>
    ),
    inOut: "candidates in → the most relevant memory out",
    visual: <DecayVisual />,
  },
  {
    label: "Review",
    title: "Conflicts are flagged, never silently overwritten.",
    body: (
      <>
        Detection is deterministic and two-stage: a cosine gate at 0.82 establishes
        that two memories are about the same thing, then a negation-marker check
        looks for a polarity flip on exactly one side. No LLM call. Resolution names
        a winner, and the loser is soft-deleted so the audit trail survives.
      </>
    ),
    inOut: "a conflicting write in → a flag for human review out",
    visual: <ContradictionVisual />,
    reverse: true,
  },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[12px] bg-black/[0.04] px-1.5 py-0.5 rounded text-ink">
      {children}
    </span>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative w-full scroll-mt-16 pt-12 md:pt-16 pb-16 md:pb-20"
    >
      <div className="max-w-frame mx-auto px-6">
        <AnimatedSection className="text-center mb-14">
          <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-muted">
            How it works
          </span>
          <h2 className="mt-6 text-[32px] md:text-[40px] font-medium leading-[1.2] text-ink text-balance">
            From a fact to a recall.
            <br />
            Nothing gets lost, nothing goes stale.
          </h2>
        </AnimatedSection>

        <div className="flex flex-col gap-16 md:gap-20">
          {steps.map((step) => (
            <AnimatedSection
              key={step.title}
              className={`flex flex-col ${
                step.reverse ? "md:flex-row-reverse" : "md:flex-row"
              } items-center gap-12 lg:gap-20`}
            >
              <div className="flex-1 md:px-10">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent-ink">
                  {step.label}
                </span>
                <h3 className="mt-3 text-[26px] md:text-[30px] font-medium leading-[1.2] tracking-[-0.02em] text-ink text-balance">
                  {step.title}
                </h3>
                <p className="mt-4 text-[14.5px] leading-[1.75] text-muted">
                  {step.body}
                </p>
                <p className="mt-5 border-t border-hairline pt-4 font-mono text-[11px] text-faint">
                  {step.inOut}
                </p>
              </div>
              <div className="flex-1 w-full max-w-[500px]">{step.visual}</div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
