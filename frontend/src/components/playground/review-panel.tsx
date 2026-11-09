import { useState } from "react";
import { ArrowUpRight, GitCompareArrows } from "lucide-react";
import { ExpandedView } from "@/components/ui/expanded-view";
import { ChangeFeedback } from "./change-feedback";
import { ConflictCard } from "./conflict-card";
import type { WorkbenchModel } from "./use-workbench";

export function ReviewPanel({ model }: { model: WorkbenchModel }) {
  const [expanded, setExpanded] = useState(false);
  const conflict = model.openConflicts[0];
  return (
    <section
      id="review"
      aria-labelledby="review-title"
      className="flex h-[420px] min-w-0 scroll-mt-24 flex-col border-t border-line p-4 sm:h-[460px] sm:p-6 lg:h-[500px] lg:border-l"
    >
      <div className="shrink-0">
        <h2 id="review-title" className="text-[17px] font-medium text-ink">
          <span className="mr-2 text-[13px] text-accent-ink">3</span> Review a
          change
        </h2>
        <p className="mt-1 h-5 text-[12px] sm:h-10 sm:text-[13px] leading-5 text-muted">
          You choose which fact stays active.
        </p>
      </div>
      <div
        role="region"
        aria-label="Review details"
        className="mt-3 min-h-0 flex-1"
      >
        {model.reviewOutcome ? (
          <ChangeFeedback
            outcome={model.reviewOutcome}
            compact
            summaryOnly={model.reviewVerified}
            onRecall={
              !model.reviewVerified && !model.openConflicts.length
                ? model.verifyRecall
                : undefined
            }
          />
        ) : conflict ? (
          <>
            <p className="mb-3 text-[12px] text-muted">
              Showing 1 of {model.openConflicts.length} open{" "}
              {model.openConflicts.length === 1 ? "conflict" : "conflicts"}
            </p>
            <ConflictCard conflict={conflict} onResolve={model.keep} compact />
          </>
        ) : (
          <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-line bg-background/40 p-5">
            <GitCompareArrows
              aria-hidden="true"
              className="mb-4 h-7 w-7 text-accent-ink"
            />
            <p className="text-[15px] font-medium text-ink">
              No change waiting for review
            </p>
            <p className="mt-2 max-w-sm text-[13px] sm:mt-3 sm:text-[14px] leading-relaxed text-muted">
              Choose a scenario and store its suggested change. Both facts stay
              active until you decide.
            </p>
            <p className="mt-3 text-[11px] sm:mt-4 sm:text-[12px] leading-relaxed text-muted">
              Keeping one fact moves the other to inactive history. It remains
              inspectable here.
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setExpanded(true)}
        className="mt-4 inline-flex min-h-10 shrink-0 items-center justify-between gap-3 rounded-lg border border-line px-3 text-left text-[13px] text-muted transition-colors hover:text-accent-ink"
      >
        <span>
          Open review & history{" "}
          <span className="text-[12px]">
            ({model.inactive.length} inactive)
          </span>
        </span>
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
      </button>
      <ExpandedView
        open={expanded}
        onClose={() => setExpanded(false)}
        title="Review and history"
        description="Read complete facts, resolve pending conflicts and inspect inactive history."
      >
        <div className="mx-auto max-w-3xl space-y-5">
          {model.reviewOutcome && (
            <ChangeFeedback outcome={model.reviewOutcome} expanded />
          )}
          {model.openConflicts.map((item) => (
            <ConflictCard
              key={item.id}
              conflict={item}
              onResolve={model.keep}
            />
          ))}
          {!model.reviewOutcome && !model.openConflicts.length && (
            <p className="text-[14px] text-muted">
              No change waiting for review. Store a suggested change to compare
              both facts.
            </p>
          )}
          <section className="border-t border-line pt-5">
            <h3 className="text-[16px] font-medium text-ink">
              Inactive history ({model.inactive.length})
            </h3>
            <p className="mt-2 text-[13px] text-muted">
              These facts are excluded from recall.
            </p>
            <ul className="mt-4 space-y-3">
              {model.inactive.map((memory) => (
                <li key={memory.id}>
                  <button
                    type="button"
                    onClick={() => model.inspectMemory(memory.id)}
                    className="w-full break-words rounded-xl border border-line p-4 text-left text-[14px] leading-relaxed text-muted underline decoration-muted/40 underline-offset-4 transition-colors hover:border-accent/30"
                  >
                    {memory.content}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </ExpandedView>
    </section>
  );
}
