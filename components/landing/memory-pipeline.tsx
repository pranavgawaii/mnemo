import {
  ArrowRight,
  Database,
  ScanSearch,
  GitCompareArrows,
} from "lucide-react";

const STEPS = [
  {
    icon: Database,
    title: "Store the fact",
    text: "Send a confirmed fact. Mnemo keeps its text and local embedding together in PostgreSQL.",
    detail: "One database · local embeddings",
  },
  {
    icon: ScanSearch,
    title: "Retrieve the context",
    text: "Ask a question. Get matching facts and scores to pass to your agent as context.",
    detail: "Cosine candidates · explicit ranking policy",
  },
  {
    icon: GitCompareArrows,
    title: "Review the change",
    text: "Inspect a possible conflict and choose what stays active. The other fact remains in history.",
    detail: "Potential conflict · explicit resolution",
  },
];

export function MemoryPipeline() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 py-16 md:py-24">
      <span
        id="features"
        className="absolute top-0 scroll-mt-20"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-frame px-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <h2 className="max-w-[590px] text-balance text-[32px] font-medium leading-[1.15] tracking-[-0.03em] text-ink md:text-[40px]">
            Store a fact. Recall it.
            <br />
            Review what changes.
          </h2>
          <a
            href="/docs/concepts"
            className="inline-flex items-center gap-2 text-[13px] text-muted transition-colors hover:text-accent-ink"
          >
            Explore the architecture{" "}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, index) => (
            <div key={step.title} className="border-t border-line pt-6">
              <div className="flex items-center gap-3 text-accent-ink">
                <step.icon aria-hidden="true" className="h-4 w-4" />
                <span className="text-[12px] text-muted">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-[19px] font-medium tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="mt-3 text-[13.5px] leading-[1.8] text-muted">
                {step.text}
              </p>
              <p className="mt-5 text-[12px] text-muted">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
