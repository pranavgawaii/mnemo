import type { ReviewOutcome } from "@/lib/memory/scenarios";

export function RecallComparison({
  outcome,
  onInspect,
}: {
  outcome: ReviewOutcome;
  onInspect: (id: string) => void;
}) {
  const { recall } = outcome;
  function facts(items: typeof recall.before, before: boolean) {
    const List = before ? "ul" : "ol";
    return (
      <List className="mt-2 space-y-2">
        {items.map((fact) => (
          <li key={fact.id}>
            <button
              type="button"
              onClick={() => onInspect(fact.id)}
              aria-haspopup="dialog"
              aria-label={`Inspect ${before ? "before" : "after"} review fact: ${fact.content}`}
              className={`h-14 w-full rounded-lg border px-2.5 py-2 text-left text-[12px] leading-[18px] transition-colors hover:border-accent/30 ${before ? "border-line bg-background/40 text-muted" : "border-accent/20 bg-accent-soft/20 text-ink"}`}
            >
              <span className="break-words line-clamp-2">{fact.content}</span>
            </button>
          </li>
        ))}
        {!items.length && (
          <li className="py-2 text-[12px] text-muted">No matching facts.</li>
        )}
      </List>
    );
  }
  return (
    <div role="region" aria-label="Context before and after review">
      <p className="mb-2 text-[11px] leading-4 text-muted">
        Captured at review ·{" "}
        {recall.mode === "relevance" ? "base relevance" : "similarity only"} · +
        {recall.timeOffset} days
      </p>
      <div className="grid grid-cols-2 gap-3">
        <section aria-label="Before review context" className="min-w-0">
          <h3 className="text-[12px] font-medium text-muted">
            Before review{" "}
            <span className="font-mono">({recall.before.length})</span>
          </h3>
          {facts(recall.before, true)}
        </section>
        <section aria-label="After review context" className="min-w-0">
          <h3 className="text-[12px] font-medium text-accent-ink">
            After review{" "}
            <span className="font-mono">({recall.after.length})</span>
          </h3>
          {facts(recall.after, false)}
        </section>
      </div>
    </div>
  );
}
