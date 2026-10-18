import { DocsSection } from "./docs-section";

const RESULTS = [
  {
    ranking: "similarity × decay × importance",
    top1: "80.0%",
    top3: "94.0%",
    mrr: "0.875",
    primary: true,
  },
  {
    ranking: "raw cosine similarity (baseline)",
    top1: "78.0%",
    top3: "94.0%",
    mrr: "0.864",
    primary: false,
  },
];

const PROCEDURE = [
  "Seed a dedicated 'benchmark' namespace with the 60 memories from benchmark/dataset.json, backdating created_at from each row's age_days so decay is genuinely exercised.",
  "Run every one of the 50 hand-labelled queries through the real search path (app.services.memory_service.search) — same embedder, same pgvector query, same re-ranking.",
  "A query counts as correct at rank k if any of its gold memory ids appears in the top k. Several questions have more than one defensible answer, so gold lists can hold multiple ids.",
  "Report top-1, top-3 and MRR. The --no-decay mode re-ranks by raw cosine only, so decay's contribution is measured rather than asserted.",
];

export function Evaluation() {
  return (
    <DocsSection
      id="evaluation"
      index="08"
      title="Evaluation"
      intro="A retrieval benchmark ships with the repository and runs against the real search path. These are its numbers — 60 memories, 50 queries, plus a raw-cosine baseline for comparison."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-8 items-start">
        <div>
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
            <table className="w-full border-collapse text-[13px]">
              <caption className="sr-only">
                Top-1, top-3 and MRR for relevance ranking versus a raw-cosine
                baseline
              </caption>
              <thead>
                <tr className="bg-[#F7F7F5] text-left">
                  <th className="px-4 py-3 font-medium text-ink">Ranking</th>
                  <th className="px-4 py-3 font-medium text-ink">Top-1</th>
                  <th className="px-4 py-3 font-medium text-ink">Top-3</th>
                  <th className="px-4 py-3 font-medium text-ink">MRR</th>
                </tr>
              </thead>
              <tbody>
                {RESULTS.map((row) => (
                  <tr
                    key={row.ranking}
                    className={`border-t border-hairline ${row.primary ? "bg-accent-soft/40" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className={row.primary ? "text-ink font-medium" : "text-muted"}>
                        {row.ranking}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-ink">{row.top1}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-ink">{row.top3}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-ink">{row.mrr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-line px-4 py-4">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-faint">
                top-1 accuracy
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {RESULTS.map((row) => (
                  <div key={row.ranking} className="flex items-center gap-3">
                    <span className="w-[150px] shrink-0 truncate font-mono text-[10.5px] text-muted">
                      {row.primary ? "relevance-ranked" : "raw cosine"}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F3F4F6]">
                      <div
                        className={`h-full rounded-full ${row.primary ? "bg-accent" : "bg-[#9CA3AF]"}`}
                        style={{ width: row.top1 }}
                      />
                    </div>
                    <span className="w-[52px] shrink-0 text-right font-mono text-[11px] text-ink">
                      {row.top1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <h3 className="text-[16px] font-medium text-ink">How it is measured</h3>
          <ol className="flex flex-col gap-3">
            {PROCEDURE.map((step, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] leading-[1.7] text-muted">
                <span className="font-mono text-[11px] text-accent-ink pt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-5 shadow-soft">
          <h3 className="text-[15px] font-medium text-ink">What the benchmark caught</h3>
          <p className="mt-3 text-[13.5px] leading-[1.75] text-muted">
            The first scoring used a 30-day half-life with a 0.05 floor and a
            0.6–1.4 importance band. Together those spanned about 28×, far wider
            than the &lt;3× spread of cosine similarity — so decay didn&apos;t
            nudge the ranking, it dictated it, degenerating search into
            &ldquo;newest first&rdquo;. That configuration scored{" "}
            <span className="text-ink font-medium">36% top-3</span>. Widening the
            half-life to 180 days, raising the floor to 0.7 and narrowing
            importance to 0.9–1.1 brought it to{" "}
            <span className="text-ink font-medium">94%</span>.{" "}
            <span className="font-mono text-[12px]">tests/test_core.py</span> pins
            the invariant so it cannot regress.
          </p>
        </div>

        <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-6">
          <h3 className="text-[15px] font-medium text-[#92400E]">An honest caveat</h3>
          <p className="mt-3 text-[13.5px] leading-[1.75] text-[#92400E]">
            On this benchmark decay is worth about{" "}
            <span className="font-medium">+2 points of top-1</span> over raw cosine
            and nothing at top-3. Its value shows on the six recency-sensitive
            queries — where a fact was superseded — taking top-3 from 83% to 100%.
            The parameters were tuned against these same 50 queries, so treat the
            headline as an{" "}
            <span className="font-medium">in-sample</span> result. These numbers
            describe this dataset only and are not comparable to unrelated vendor
            benchmarks.
          </p>
        </div>
      </div>
    </DocsSection>
  );
}
