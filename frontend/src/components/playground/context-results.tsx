import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy, SearchX } from "lucide-react";
import type { WorkbenchModel } from "./use-workbench";
import { DEMO_MATCH_THRESHOLD, recallMatches } from "./recall-matches";
import { RecallComparison } from "./recall-comparison";

export function CopyContext({
  model,
  text = false,
}: {
  model: WorkbenchModel;
  text?: boolean;
}) {
  const context = recallMatches(model.ranked)
    .map((row) => row.memory.content)
    .join("\n");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setCopied(false);
    setError("");
  }, [context]);
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label="Copy recalled context"
        title="Copy recalled context"
        disabled={!context}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(context);
            setCopied(true);
            setError("");
          } catch {
            setError("Copy unavailable. Select a fact to read its full text.");
          }
        }}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white text-[13px] text-muted transition-colors hover:text-ink disabled:opacity-40 ${text ? "px-3" : "w-10"}`}
      >
        {copied ? (
          <Check aria-hidden="true" className="h-4 w-4 text-accent-ink" />
        ) : (
          <Copy aria-hidden="true" className="h-4 w-4" />
        )}
        {text && (copied ? "Copied" : "Copy context")}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Recalled context copied." : error}
      </span>
    </span>
  );
}

export function ContextResults({ model }: { model: WorkbenchModel }) {
  const matches = recallMatches(model.ranked);
  const [showCurrent, setShowCurrent] = useState(false);
  useEffect(() => setShowCurrent(false), [model.reviewOutcome]);
  const comparisonAvailable = Boolean(
    model.reviewOutcome && model.reviewVerified,
  );
  const comparing = comparisonAvailable && !showCurrent;
  const snapshot = model.reviewOutcome?.recall;
  const sameContext =
    snapshot &&
    snapshot.before.length === snapshot.after.length &&
    snapshot.before.every(
      (fact, index) => fact.id === snapshot.after[index].id,
    );
  return (
    <section
      aria-labelledby="context-title"
      className="flex h-[500px] min-w-0 flex-col border-t border-line p-5 sm:p-6"
    >
      <div className="flex h-11 shrink-0 items-start justify-between gap-3">
        <div>
          <h2
            id="context-title"
            tabIndex={-1}
            className="scroll-mt-24 text-[17px] font-medium text-ink"
          >
            Recalled context
          </h2>
          <p className="text-[12px] text-muted">
            {comparing && model.reviewOutcome ? (
              sameContext ? (
                "Returned context unchanged"
              ) : (
                `${model.reviewOutcome.recall.before.length} → ${model.reviewOutcome.recall.after.length} matches at review`
              )
            ) : (
              <>
                {matches.length}{" "}
                {matches.length === 1 ? "example match" : "example matches"} ·
                select to inspect
              </>
            )}
          </p>
        </div>
        <CopyContext model={model} />
      </div>
      <div className="mt-2 flex h-10 shrink-0 items-center gap-3">
        <p
          className="min-w-0 flex-1 break-words text-[13px] leading-5 text-muted line-clamp-2"
          title={model.activeQuery}
        >
          For “{model.activeQuery}”
        </p>
        {comparisonAvailable && (
          <button
            type="button"
            aria-pressed={comparing}
            aria-label={
              comparing ? "Show current context" : "Show review comparison"
            }
            onClick={() => setShowCurrent(!showCurrent)}
            className="h-9 shrink-0 rounded-lg border border-line px-2 text-[11px] text-accent-ink hover:bg-accent-soft/30"
          >
            {comparing ? "Current context" : "Before / after"}
          </button>
        )}
      </div>
      <div
        role="region"
        aria-label="Context matches"
        className="mt-3 h-[262px] shrink-0"
      >
        {comparing && model.reviewOutcome ? (
          <RecallComparison
            outcome={model.reviewOutcome}
            onInspect={model.inspectMemory}
          />
        ) : matches.length ? (
          <>
            <ol className="space-y-2">
              {matches.map((row, index) => {
                const movement = model.rankChanges.find(
                  (change) => change.id === row.memory.id,
                );
                return (
                  <li
                    key={row.memory.id}
                    className={`rounded-xl border transition-colors ${model.selectedId === row.memory.id ? "border-accent/30 bg-accent-soft/30" : "border-line bg-white"}`}
                  >
                    <button
                      type="button"
                      aria-label={`Inspect fact: ${row.memory.content}`}
                      aria-pressed={model.selectedId === row.memory.id}
                      aria-haspopup="dialog"
                      onClick={() => model.inspectMemory(row.memory.id)}
                      className="flex h-20 w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-accent-soft/30"
                    >
                      <span className="mt-0.5 font-mono text-[12px] text-muted">
                        0{index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-[14px] leading-5 line-clamp-2">
                          {row.memory.content}
                        </span>
                        <span className="mt-1 flex items-center gap-2 font-mono text-[12px] tabular-nums text-muted">
                          {(model.mode === "relevance"
                            ? row.relevance
                            : row.similarity
                          ).toFixed(3)}
                          {movement && movement.from !== movement.to && (
                            <span className="inline-flex items-center gap-1 text-accent-ink">
                              #{movement.from}
                              <ArrowRight
                                aria-hidden="true"
                                className="h-3 w-3"
                              />
                              #{movement.to}
                            </span>
                          )}
                        </span>
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="mt-1 h-4 w-4 shrink-0 text-muted"
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
            {matches.length < 3 && (
              <p className="mt-6 max-w-sm text-[13px] leading-relaxed text-muted">
                Only{" "}
                {matches.length === 1 ? "one fact clears" : "two facts clear"}{" "}
                the demo cutoff. Try Preferences to compare several matches.
              </p>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-line bg-background/40 p-5">
            <SearchX aria-hidden="true" className="h-6 w-6 text-muted" />
            <h3 className="mt-3 text-[14px] font-medium text-ink">
              No close match in these sample facts
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Try a scenario or store a fact about this topic, then search
              again.
            </p>
          </div>
        )}
      </div>
      <p className="mt-3 text-[12px] leading-[18px] text-muted">
        Demo: up to 3 lexical matches at similarity ≥{" "}
        {DEMO_MATCH_THRESHOLD.toFixed(2)}. API retrieval uses MiniLM and its own
        ranking policy.
      </p>
    </section>
  );
}
