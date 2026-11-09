"use client";

import { RotateCcw } from "lucide-react";
import { AdvancedControls } from "./advanced-controls";
import { ContextResults } from "./context-results";
import { MemoryComposer } from "./memory-composer";
import { RecallQuery } from "./recall-query";
import { RetrievalTrace } from "./retrieval-trace";
import { RetrievalControls } from "./retrieval-controls";
import { ReviewPanel } from "./review-panel";
import { RankingFeedback } from "./ranking-feedback";
import { MemoryInspector } from "./memory-inspector";
import { useWorkbench } from "./use-workbench";
import { JourneyGuide } from "./journey-guide";

export function MemoryWorkbench() {
  const model = useWorkbench();
  return (
    <section
      id="workbench"
      className="mx-auto w-full max-w-frame scroll-mt-24 px-4 pb-12 pt-4 sm:px-6"
    >
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#FCFCFB] px-5 py-4">
          <div>
            <p className="text-[12px] font-medium text-ink">
              Browser simulation{" "}
              <span className="font-normal text-muted">
                · no backend requests
              </span>
            </p>
            <p className="mt-1 text-[12px] text-muted">
              {model.rows.length} active memories · {model.openConflicts.length}{" "}
              open {model.openConflicts.length === 1 ? "conflict" : "conflicts"}
            </p>
          </div>
          <button
            type="button"
            onClick={model.reset}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-[12px] text-muted transition-colors hover:bg-background hover:text-ink"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            Reset demo
          </button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-2 lg:gap-10">
          <RecallQuery model={model} />
          <MemoryComposer model={model} />
        </div>
        <JourneyGuide model={model} />
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <ContextResults model={model} />
          <ReviewPanel model={model} />
        </div>
        <RetrievalControls model={model} />
        <RankingFeedback model={model} />
        <RetrievalTrace key={model.resetVersion} model={model} />
      </div>
      <MemoryInspector model={model} />
      <AdvancedControls model={model} />
    </section>
  );
}
