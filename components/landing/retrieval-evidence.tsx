import { ArrowUpRight } from "lucide-react";
import report from "@/public/benchmark-results.json";

const LABELS: Record<string, string> = {
  cosine: "Raw cosine baseline",
  decay: "Decay + importance",
  hybrid: "Default keyword boost",
};

export function RetrievalEvidence() {
  return (
    <section
      id="evidence"
      className="relative scroll-mt-20 border-y border-line bg-white py-16 md:py-24"
    >
      <span
        id="principle"
        className="absolute top-0 scroll-mt-20"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-frame gap-10 px-6 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-[12px] font-medium text-accent-ink">
            Evidence, with context
          </p>
          <h2 className="mt-5 text-balance text-[32px] font-medium leading-[1.15] tracking-[-0.03em] text-ink md:text-[40px]">
            Results you can reproduce.
          </h2>
          <p className="mt-5 max-w-[440px] text-[14px] leading-[1.8] text-muted">
            Three retrieval policies. 60 memories. 50 queries. Raw cosine wins
            this local run; additional ranking signals did not improve it.
          </p>
          <a
            href="/docs/evaluation"
            className="mt-6 inline-flex items-center gap-2 text-[13px] font-medium text-accent-ink underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
          >
            Read the experiment{" "}
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
        <div>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">
                Local in-sample retrieval benchmark
              </caption>
              <thead className="bg-background">
                <tr>
                  <th className="px-5 py-3 font-medium text-muted">
                    Retrieval policy
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted">
                    Top-1 accuracy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...report.results]
                  .sort((a, b) => b.top1_accuracy - a.top1_accuracy)
                  .map((row) => (
                    <tr key={row.mode}>
                      <td
                        className={`px-5 py-4 ${row.mode === "cosine" ? "font-medium text-ink" : "text-muted"}`}
                      >
                        {LABELS[row.mode]}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[12px] tabular-nums text-ink">
                        {(row.top1_accuracy * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            A small in-sample comparison. It does not measure agent answer
            quality or production scale.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-[12px] text-muted">
            <span>Pretrained encoder</span>
            <span>Heuristic conflicts</span>
            <span>Single-tenant access</span>
          </div>
        </div>
      </div>
    </section>
  );
}
