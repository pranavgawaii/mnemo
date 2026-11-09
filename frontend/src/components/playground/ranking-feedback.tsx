import { ArrowRight, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { DEMO_MATCH_THRESHOLD } from "./recall-matches";
import type { WorkbenchModel } from "./use-workbench";

export function RankingFeedback({ model }: { model: WorkbenchModel }) {
  const movements = model.rankChanges.filter(
    (row) => row.from !== row.to && row.similarity >= DEMO_MATCH_THRESHOLD,
  );
  const lead = movements.find((row) => row.to < row.from) ?? movements[0];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Ranking comparison"
      className="flex h-[156px] items-start gap-3 border-t border-accent/15 bg-accent-soft/20 px-5 py-4 sm:h-[116px] sm:px-6"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/15 bg-white text-accent-ink">
        {lead ? (
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        ) : (
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-accent-ink">
          {model.rankingUpdate
            ? lead
              ? "The order changed"
              : "Order unchanged for these facts"
            : "See why a fact ranks higher"}
        </p>
        <p className="mt-1 text-[14px] leading-5 text-ink line-clamp-2">
          {lead ? (
            <>
              <span className="sr-only">Moved from rank {lead.from} to rank {lead.to}: </span>
              <span aria-hidden="true" className="mr-2 inline-flex items-center gap-1 font-mono text-[12px] text-accent-ink">
                #{lead.from}{" "}
                <ArrowRight aria-hidden="true" className="h-3 w-3" /> #{lead.to}
              </span>
              {lead.content}
            </>
          ) : model.rankingUpdate ? (
            "Compare the scores below; a score change does not always change rank."
          ) : (
            "Try Preferences, then advance time or switch ranking mode."
          )}
        </p>
        <p className="mt-1 text-[12px] leading-[18px] text-muted line-clamp-3 sm:line-clamp-2">
          {model.rankingUpdate?.reason ??
            "Each adjustment compares against the previous setting. Select a fact to inspect its score."}
        </p>
      </div>
    </div>
  );
}
