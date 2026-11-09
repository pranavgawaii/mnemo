import { DocsSection } from "./docs-section";
import holdout from "@public/evaluation/retrieval-holdout.json";
import lifecycle from "@public/evaluation/lifecycle.json";
import conflicts from "@public/evaluation/conflicts.json";

function percent(value: number | null) {
  return value === null ? "Undefined" : `${(value * 100).toFixed(1)}%`;
}

export function EvaluationEvidence() {
  const misses = conflicts.results.filter(row => row.expected !== row.flagged);
  return (
    <DocsSection id="workflow-evidence" title="Separate questions, separate evidence"
      intro="Saved local runs below measure additional retrieval questions, reviewed state transitions and conflict flags. Their scores answer different questions; they should not be combined into one accuracy number.">
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label="Query-only holdout" className="min-w-0 rounded-xl border border-line bg-white p-5">
          <h3 className="text-[16px] font-medium text-ink">30 additional queries</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">New questions over the same 60 synthetic memories. The corpus and people are shared with the original benchmark.</p>
          <dl className="mt-4 space-y-3 border-y border-line py-4 text-[13px]">
            {holdout.results.map(row => (
              <div key={row.mode} className="flex justify-between gap-3">
                <dt>{({ cosine: "Raw cosine", decay: "Decay + importance", hybrid: "Keyword boost" } as Record<string, string>)[row.mode]}</dt>
                <dd className="shrink-0 font-mono tabular-nums">{percent(row.top1_accuracy)} top-1</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-muted">Different query difficulty prevents an improvement claim against the original 50-query run. No ranking weights were tuned by this runner.</p>
          <a href="/evaluation/retrieval-holdout.json" className="mt-3 inline-flex min-h-10 items-center text-[13px] text-accent-ink underline underline-offset-4">Download query holdout</a>
        </section>
        <section aria-label="Lifecycle regression results" className="min-w-0 rounded-xl border border-line bg-white p-5">
          <h3 className="text-[16px] font-medium text-ink">{lifecycle.passed}/{lifecycle.checks} lifecycle checks</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{lifecycle.scenarios} authored scenarios through the real API: changes, explicit review, keeping the original, a second move, source history and expiry.</p>
          <p className="mt-4 border-y border-line py-4 text-[13px] leading-relaxed text-ink">Context similarity threshold: <code>{lifecycle.min_similarity}</code>, deliberately accepting all similarities to isolate state transitions.</p>
          <p className="mt-3 text-[12px] leading-relaxed text-muted">Passing workflows establish these state transitions. They do not measure semantic conflict accuracy or generated answers.</p>
          <a href="/evaluation/lifecycle.json" className="mt-3 inline-flex min-h-10 items-center text-[13px] text-accent-ink underline underline-offset-4">Download lifecycle report</a>
        </section>
      </div>
      <section aria-label="Conflict challenge results" className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h3 className="text-[16px] font-medium text-ink">Conflict challenges, including the misses</h3>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">{conflicts.completed}/{conflicts.cases} authored pairs completed through real writes, embeddings and candidate selection. Half are labelled conflicts; half are compatible or unrelated facts. No independent annotation or held-out corpus is claimed.</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-y border-line py-4 sm:grid-cols-4">
          {[["Correct flags", conflicts.true_positive], ["False alarms", conflicts.false_positive], ["Missed conflicts", conflicts.false_negative], ["Correct non-flags", conflicts.true_negative]].map(([label, value]) => (
            <div key={label}><dt className="text-[12px] text-muted">{label}</dt><dd className="mt-1 font-mono text-[18px] tabular-nums text-ink">{value}</dd></div>
          ))}
        </dl>
        <p className="mt-4 text-[13px] leading-relaxed text-muted">Flag precision: {percent(conflicts.precision)} ({conflicts.true_positive} correct of {conflicts.true_positive + conflicts.false_positive} flags). Conflict recall: {percent(conflicts.recall)} ({conflicts.true_positive} of {conflicts.true_positive + conflicts.false_negative} labelled conflicts). Small authored sets can have high precision while missing important updates.</p>
        <details className="mt-4 border-t border-line pt-4">
          <summary className="cursor-pointer text-[13px] font-medium text-ink">Inspect {misses.length} incorrect predictions</summary>
          <ul className="mt-3 space-y-2 text-[13px] text-muted">
            {misses.map(row => <li key={row.case_id}><code className="break-all text-ink">{row.case_id}</code> — {row.flagged === null ? "request failed" : row.expected ? "conflict missed" : "false alarm"}</li>)}
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">Implicit moves, changed numeric values and employer paraphrases remain outside the narrow explicit-change rules. The detector flags candidates for review; it does not reliably understand every contradiction.</p>
        </details>
        <a href="/evaluation/conflicts.json" className="mt-3 inline-flex min-h-10 items-center text-[13px] text-accent-ink underline underline-offset-4">Download conflict challenge report</a>
      </section>
      <p className="text-[12px] leading-relaxed text-muted">Each downloadable report records its own measurement time and scope. Query and conflict reports include fixture hashes. These are saved runs, not live service status.</p>
    </DocsSection>
  );
}
