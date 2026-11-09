import { ExpandedView } from "@/components/ui/expanded-view";
import { recallMatches } from "./recall-matches";
import type { WorkbenchModel } from "./use-workbench";

export function MemoryInspector({ model }: { model: WorkbenchModel }) {
  const selected =
    model.store.memories.find((memory) => memory.id === model.selectedId) ??
    recallMatches(model.ranked)[0]?.memory;
  const row = model.rows.find((entry) => entry.memory.id === selected?.id);
  const rank =
    model.ranked.findIndex((entry) => entry.memory.id === selected?.id) + 1;
  return (
    <ExpandedView
      open={model.inspectorOpen}
      onClose={() => model.setInspectorOpen(false)}
      title="Memory inspector"
      description="Read the complete fact and inspect the signals behind its score."
    >
      <section
        role="region"
        aria-label="Memory inspector"
        className="mx-auto max-w-3xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] font-medium text-accent-ink">
            {selected?.is_active
              ? `Active · searchable · rank #${rank}`
              : "Inactive · history"}
          </p>
          <div className="flex items-center gap-3">
            <label htmlFor="wb-importance" className="text-[13px] text-muted">
              Importance
            </label>
            <select
              id="wb-importance"
              disabled={!selected?.is_active}
              value={selected?.importance ?? 3}
              onChange={(event) => {
                if (selected?.is_active)
                  model.setImportance(selected.id, Number(event.target.value));
              }}
              className="min-h-10 rounded-lg border border-line bg-white px-3 text-[14px] text-ink disabled:opacity-50"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-5 break-words rounded-xl border border-line bg-background/60 p-5 text-[16px] leading-relaxed text-ink">
          {selected?.content ?? "No fact selected."}
        </p>
        {row ? (
          <>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
              {[
                {
                  label: "Similarity",
                  value: row.similarity.toFixed(3),
                  note: "Local word/topic match",
                },
                {
                  label: "Decay",
                  value: row.decay.toFixed(3),
                  note: `${row.ageDays} days old`,
                },
                {
                  label: "Weight",
                  value: row.weight.toFixed(3),
                  note: `${selected?.importance}/5 importance`,
                },
              ].map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-xl border border-line p-3 sm:p-4"
                >
                  <p className="text-[12px] text-muted">{signal.label}</p>
                  <p className="mt-2 font-mono text-[20px] tabular-nums text-ink">
                    {signal.value}
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted">
                    {signal.note}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 break-words rounded-xl bg-accent-soft/40 p-4 font-mono text-[13px] leading-relaxed tabular-nums text-accent-ink">
              {row.similarity.toFixed(3)} similarity × {row.decay.toFixed(3)}{" "}
              decay × {row.weight.toFixed(3)} weight ={" "}
              {row.relevance.toFixed(3)}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              {model.mode === "similarity"
                ? "Similarity-only mode orders facts by the first signal. The base-score calculation is shown for comparison."
                : "Base relevance orders facts by similarity × decay × importance weight."}
            </p>
          </>
        ) : (
          <p className="mt-5 text-[14px] text-muted">
            Inactive facts are excluded from candidate selection and ranking.
          </p>
        )}
        <p className="mt-6 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
          Scores explain this browser example; they are not probabilities or
          live model measurements.
        </p>
      </section>
    </ExpandedView>
  );
}
