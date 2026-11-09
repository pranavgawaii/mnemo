"use client";

import { useEffect, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ContradictionExplainer } from "./contradiction-explainer";
import { RankingExplorer } from "./ranking-explorer";
import { Field } from "./field";
import type { WorkbenchModel } from "./use-workbench";

export function AdvancedControls({ model }: { model: WorkbenchModel }) {
  const advanced = useRef<HTMLDetailsElement>(null);
  const rankingTool = useRef<HTMLDetailsElement>(null);
  const conflictTool = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const revealTool = () => {
      const id = window.location.hash.slice(1);
      const tool =
        id === "ranking-calculator"
          ? rankingTool
          : id === "contradiction-checker"
            ? conflictTool
            : null;
      if (!tool) return;
      if (advanced.current) advanced.current.open = true;
      if (tool.current) tool.current.open = true;
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView(),
      );
    };
    revealTool();
    window.addEventListener("hashchange", revealTool);
    return () => window.removeEventListener("hashchange", revealTool);
  }, []);

  return (
    <details
      ref={advanced}
      className="group mt-5 rounded-2xl border border-line bg-white"
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <span>
          <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
            <SlidersHorizontal
              aria-hidden="true"
              className="h-4 w-4 text-accent-ink"
            />{" "}
            Explore the mechanics
          </span>
          <span className="mt-1 block text-[12px] text-muted">
            Memory map, calculators and local activity
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-lg text-muted group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="border-t border-line p-5 sm:p-6">
        <details className="mt-6 border-t border-line pt-4">
          <summary className="cursor-pointer text-[13px] font-medium text-ink">
            Memory map
          </summary>
          <div className="mx-auto mt-4 max-w-[640px]">
            <Field
              rows={model.rows}
              ranked={model.ranked}
              positions={model.positions}
              conflicts={model.openConflicts}
              query={model.activeQuery}
              selectedId={model.selectedId}
              hoverId={model.hoverId}
              pulseRank={model.pulseRank}
              scanning={model.scanning}
              onSelect={model.inspectMemory}
              onHover={model.setHoverId}
            />
            <p className="mt-2 text-center text-[11px] text-muted">
              Inner ring: best matches · Size: importance · Fade: age · Arc:
              possible conflict
            </p>
          </div>
        </details>
        <details ref={rankingTool} className="mt-5 border-t border-line pt-4">
          <summary className="cursor-pointer text-[13px] font-medium text-ink">
            Compare two base scores
          </summary>
          <RankingExplorer />
        </details>
        <details ref={conflictTool} className="mt-5 border-t border-line pt-4">
          <summary className="cursor-pointer text-[13px] font-medium text-ink">
            Test the conflict heuristic
          </summary>
          <ContradictionExplainer />
        </details>
        <details className="mt-5 border-t border-line pt-4">
          <summary className="cursor-pointer text-[13px] font-medium text-ink">
            Local activity
          </summary>
          <p className="mt-3 text-[12px] text-muted">
            Illustrative API shapes only. No requests are sent.
          </p>
          <ul className="mt-3 space-y-2 break-words font-mono text-[11px] text-muted">
            {model.logs.length ? (
              model.logs.map((entry) => (
                <li key={entry.id}>
                  {entry.method} {entry.path} · {entry.detail}
                </li>
              ))
            ) : (
              <li>Your next action will appear here.</li>
            )}
          </ul>
        </details>
      </div>
    </details>
  );
}
