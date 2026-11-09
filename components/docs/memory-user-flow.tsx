import {
  ArrowRight,
  Bot,
  Database,
  GitCompareArrows,
  ScanSearch,
  UserRound,
  type LucideIcon,
} from "lucide-react";

const FLOWS: {
  label: string;
  note: string;
  steps: { icon: LucideIcon; title: string; detail: string }[];
}[] = [
  {
    label: "Remember",
    note: "A confirmed fact",
    steps: [
      {
        icon: UserRound,
        title: "Your app supplies a fact",
        detail: "The user confirms what to remember.",
      },
      {
        icon: Database,
        title: "Mnemo stores it",
        detail: "Encode locally; save text and vector.",
      },
      {
        icon: GitCompareArrows,
        title: "Check for a possible conflict",
        detail: "Flag nearby opposing facts for review.",
      },
    ],
  },
  {
    label: "Recall",
    note: "A later conversation",
    steps: [
      {
        icon: UserRound,
        title: "The user asks a question",
        detail: "Your app searches the same namespace.",
      },
      {
        icon: ScanSearch,
        title: "Mnemo returns context",
        detail: "Vector candidates → ranking → facts and scores.",
      },
      {
        icon: Bot,
        title: "Your model answers",
        detail: "Your app passes context to its model.",
      },
    ],
  },
  {
    label: "Review",
    note: "When facts disagree",
    steps: [
      {
        icon: GitCompareArrows,
        title: "Both facts remain active",
        detail: "A flag does not silently choose a winner.",
      },
      {
        icon: UserRound,
        title: "You choose what stays",
        detail: "An explicit resolution names the winner.",
      },
      {
        icon: Database,
        title: "Keep the history",
        detail: "The losing row becomes inactive, not erased.",
      },
    ],
  },
];

export function MemoryUserFlow({ compact = false }: { compact?: boolean }) {
  if (compact)
    return (
      <div className="space-y-3">
        {FLOWS.map((flow) => (
          <section
            key={flow.label}
            aria-label={`${flow.label} flow`}
            className="rounded-xl border border-line bg-background/40 p-3"
          >
            <h3 className="text-[15px] font-medium text-accent-ink">
              {flow.label}
            </h3>
            <p className="mt-1 text-[12px] text-muted">{flow.note}</p>
            <ol className="mt-3 space-y-2">
              {flow.steps.map((step) => (
                <li
                  key={step.title}
                  className="flex items-start gap-2 text-[13px] leading-5 text-ink"
                >
                  <step.icon
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink"
                  />
                  {step.title}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    );
  return (
    <div className="space-y-7 py-2">
      {FLOWS.map((flow) => (
        <section key={flow.label} aria-label={`${flow.label} flow`}>
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-[14px] font-medium text-accent-ink">
              {flow.label}
            </h3>
            <span className="text-[12px] text-muted">{flow.note}</span>
          </div>
          <ol className="grid gap-3 md:grid-cols-3 md:gap-7">
            {flow.steps.map((step, index) => (
              <li
                key={step.title}
                className="relative min-w-0 rounded-lg border border-line bg-background/50 p-4"
              >
                <step.icon
                  aria-hidden="true"
                  className="mb-3 h-5 w-5 text-accent-ink"
                />
                <p className="text-[13px] font-medium text-ink">{step.title}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  {step.detail}
                </p>
                {index < 2 && (
                  <ArrowRight
                    aria-hidden="true"
                    className="absolute -bottom-[15px] left-1/2 z-10 h-4 w-4 -translate-x-1/2 rotate-90 bg-white text-accent/60 md:-right-[22px] md:bottom-auto md:left-auto md:top-1/2 md:translate-x-0 md:rotate-0"
                  />
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
