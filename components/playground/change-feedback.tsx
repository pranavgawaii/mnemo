import { Check } from "lucide-react";
import type { ReviewOutcome } from "@/lib/memory/scenarios";

export function ChangeFeedback({
  outcome,
  compact = false,
  expanded = false,
}: {
  outcome: ReviewOutcome;
  compact?: boolean;
  expanded?: boolean;
}) {
  const id = expanded ? "change-feedback-expanded" : "change-feedback";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      className="rounded-xl border border-accent/20 bg-accent-soft/20 p-3 sm:p-4"
    >
      <h3
        id={`${id}-title`}
        className="flex items-center gap-2 text-[14px] font-medium text-accent-ink"
      >
        <Check aria-hidden="true" className="h-4 w-4" /> Review complete
      </h3>
      <div
        className={`mt-3 grid gap-4 ${compact ? "grid-cols-2" : "sm:grid-cols-2"}`}
      >
        <div>
          <h4 className="text-[12px] font-medium text-muted">
            Before review · both active
          </h4>
          <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-muted">
            <li className={`break-words ${compact ? "line-clamp-2" : ""}`}>
              {outcome.previous}
            </li>
            <li className={`break-words ${compact ? "line-clamp-2" : ""}`}>
              {outcome.incoming}
            </li>
          </ul>
        </div>
        <div
          className={
            compact
              ? "border-l border-accent/10 pl-3"
              : "border-t border-accent/10 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"
          }
        >
          <h4 className="text-[12px] font-medium text-accent-ink">
            After review · one active
          </h4>
          <p
            className={`mt-2 break-words text-[13px] leading-relaxed text-ink ${compact ? "line-clamp-2" : ""}`}
          >
            {outcome.kept}
          </p>
          <p className="mt-3 text-[11px] text-muted">
            Moved to inactive history
          </p>
          <p
            className={`mt-1 break-words text-[13px] leading-relaxed text-muted line-through decoration-muted/40 ${compact ? "line-clamp-2" : ""}`}
          >
            {outcome.archived}
          </p>
        </div>
      </div>
      <p className="mt-3 border-t border-accent/10 pt-2 text-[12px] leading-relaxed text-muted">
        The kept fact stays searchable. The inactive fact is excluded from
        recall.
      </p>
    </section>
  );
}
