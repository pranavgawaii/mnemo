import { ArrowRight, Check } from "lucide-react";
import type { ReviewOutcome } from "@/lib/memory/scenarios";
import { currentStatement } from "@/lib/memory/changes";

export function ChangeFeedback({
  outcome,
  compact = false,
  expanded = false,
  onRecall,
}: {
  outcome: ReviewOutcome;
  compact?: boolean;
  expanded?: boolean;
  onRecall?: () => void;
}) {
  const id = expanded ? "change-feedback-expanded" : "change-feedback";
  const unchanged = outcome.kept === outcome.previous;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      className="rounded-xl border border-accent/20 bg-accent-soft/20 p-3 sm:p-4"
    >
      <h3 id={`${id}-title`} className="flex items-center gap-2 text-[14px] font-medium text-accent-ink">
        <Check aria-hidden="true" className="h-4 w-4" /> Review complete
      </h3>
      <p className="mt-1 text-[12px] text-muted">
        {unchanged ? "Existing fact kept." : "New fact kept."}
      </p>
      <dl aria-label="Current fact change" className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <div className="min-w-0">
          <dt className="text-[11px] text-muted">Before</dt>
          <dd className={`mt-1 break-words text-[13px] leading-[18px] text-muted ${compact ? "line-clamp-2" : ""}`} title={outcome.previous}>
            {currentStatement(outcome.previous) ?? outcome.previous}
          </dd>
        </div>
        <ArrowRight aria-hidden="true" className="mt-6 h-4 w-4 text-accent-ink" />
        <div className="min-w-0">
          <dt className="text-[11px] font-medium text-accent-ink">Current · active</dt>
          <dd className={`mt-1 break-words text-[13px] font-medium leading-[18px] text-ink ${compact ? "line-clamp-2" : ""}`} title={outcome.kept}>
            {currentStatement(outcome.kept) ?? outcome.kept}
          </dd>
        </div>
      </dl>
      {!compact && (
        <div className="mt-4 border-t border-accent/10 pt-3">
          <h4 className="text-[12px] font-medium text-muted">Before review · both active</h4>
          <ul className="mt-2 space-y-2 text-[13px] text-muted">
            <li className="break-words">{outcome.previous}</li>
            <li className="break-words">{outcome.incoming}</li>
          </ul>
          <p className="mt-3 text-[12px] font-medium text-accent-ink">After review · one active</p>
          <p className="mt-1 break-words text-[13px] text-ink">{outcome.kept}</p>
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted">Inactive history · excluded from recall</p>
      <p className={`mt-1 break-words text-[12px] leading-[18px] text-muted line-through decoration-muted/40 ${compact ? "line-clamp-1" : ""}`} title={outcome.archived}>
        {outcome.archived}
      </p>
      {onRecall && (
        <button type="button" onClick={onRecall}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-accent/20 bg-white px-3 text-[12px] font-medium text-accent-ink transition-colors hover:bg-accent-soft/40">
          Recall and compare
        </button>
      )}
    </section>
  );
}
