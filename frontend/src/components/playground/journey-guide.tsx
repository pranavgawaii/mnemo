import { Check } from "lucide-react";
import type { JourneyStage, WorkbenchModel } from "./use-workbench";

const STEPS = ["Recall", "Store", "Review", "Recall again"];
const PHASE: Record<JourneyStage, number> = {
  recall: 0,
  store: 1,
  review: 2,
  verify: 3,
  complete: 4,
};

/** Guidance stays in one reserved frame; every input remains available. */
export function JourneyGuide({ model }: { model: WorkbenchModel }) {
  const phase = PHASE[model.journeyStage];
  const actionClass =
    "inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent-soft px-3 text-[12px] font-medium text-accent-ink transition-colors hover:bg-[#E0E4FF]";
  return (
    <section
      aria-label="Guided memory flow"
      className="border-t border-line bg-background/40 px-5 py-3 sm:px-6"
    >
      <ol
        aria-label="Memory flow progress"
        className="grid h-8 grid-cols-4 gap-2"
      >
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={phase === index ? "step" : undefined}
            className={`flex items-center gap-1.5 text-[11px] sm:gap-2 sm:text-[12px] ${index === phase ? "font-medium text-accent-ink" : index < phase ? "text-ink" : "text-muted"}`}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${index <= phase ? "border-accent/25 bg-accent-soft text-accent-ink" : "border-line bg-white"}`}
            >
              {index < phase ? (
                <Check aria-hidden="true" className="h-3 w-3" />
              ) : (
                index + 1
              )}
            </span>
            <span className="min-w-0 leading-4">{label}</span>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex h-[88px] items-center justify-between gap-3 sm:h-[52px] sm:gap-4">
        <p
          role="status"
          aria-label="Workbench status"
          aria-live="polite"
          className="min-w-0 break-words text-[13px] leading-[18px] text-accent-ink line-clamp-3 sm:line-clamp-2"
        >
          {model.notice ||
            "Search to recall Bengaluru, then store the suggested move to Pune. You can also enter your own facts."}
        </p>
        <div className="flex shrink-0 items-center justify-between gap-3">
          {model.journeyStage === "verify" && !model.reviewOutcome ? (
            <button type="button" onClick={model.verifyRecall} className={actionClass}>
              Recall again
            </button>
          ) : model.journeyStage === "complete" ? (
            <a href="#sample-scenarios" className={actionClass}>
              Try another scenario
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
