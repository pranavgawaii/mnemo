"use client";

import { RotateCcw } from "lucide-react";
import { AdvancedControls } from "./advanced-controls";
import { MemoryComposer } from "./memory-composer";
import { RecallQuery } from "./recall-query";
import { RetrievalTrace } from "./retrieval-trace";
import { RetrievalControls } from "./retrieval-controls";
import { ResultPanels } from "./result-panels";
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#FCFCFB] px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-[12px] font-medium text-ink">
              Browser simulation
            </p>
            <p className="mt-1 text-[11px] text-muted sm:text-[12px]">
              {model.rows.length} active memories · {model.openConflicts.length}{" "}
              open {model.openConflicts.length === 1 ? "conflict" : "conflicts"}
            </p>
          </div>
          <button
            type="button"
            onClick={model.reset}
            aria-label="Reset demo"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-[11px] text-muted sm:text-[12px] transition-colors hover:bg-background hover:text-ink"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset demo</span>
          </button>
        </div>
        <div className="grid gap-2 p-3 sm:gap-5 sm:p-5 lg:grid-cols-2 lg:gap-10">
          <RecallQuery model={model} />
          <MemoryComposer model={model} />
        </div>
        <JourneyGuide model={model} />
        <ResultPanels model={model} />
        <RetrievalControls model={model} />
        <RankingFeedback model={model} />
        <RetrievalTrace key={model.resetVersion} model={model} />
      </div>
      <MemoryInspector model={model} />
      <AdvancedControls model={model} />
    </section>
  );
}
