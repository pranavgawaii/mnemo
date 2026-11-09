import { ArrowDownToLine } from "lucide-react";
import { DocsSection } from "@/components/docs/docs-section";
import report from "@public/benchmark-results.json";

const measuredAt = new Intl.DateTimeFormat("en", {
  dateStyle: "long",
  timeZone: "Asia/Kolkata",
}).format(new Date(report.measured_at));
const LABELS: Record<string, { name: string; detail: string }> = {
  cosine: { name: "Raw cosine", detail: "Baseline · similarity only" },
  decay: { name: "Decay + importance", detail: "Base relevance scoring" },
  hybrid: { name: "Keyword boost", detail: "Default retrieval policy" },
};
const RESULTS = [...report.results]
  .sort((a, b) => b.top1_accuracy - a.top1_accuracy)
  .map((row) => ({
    ...LABELS[row.mode],
    top1: `${(row.top1_accuracy * 100).toFixed(1)}%`,
    top3: `${(row.topk_accuracy * 100).toFixed(1)}%`,
    mrr: row.mrr.toFixed(3),
    primary: row.mode === "cosine",
  }));
const PROCEDURE = [
  [
    "Seed the corpus",
    "Load 60 memories into a dedicated benchmark namespace. Backdate each created_at from its age_days so the experiment exercises decay.",
  ],
  [
    "Use the real search path",
    "Run 50 hand-labelled queries through the same encoder, pgvector candidate selection and Python ranking used by the API.",
  ],
  [
    "Compare three policies",
    "Evaluate raw cosine, base relevance and the default keyword boost on the same queries and gold memory IDs.",
  ],
  [
    "Report every outcome",
    "Top-1 and top-3 count a query as correct when a gold memory appears in the first one or three hits. MRR measures the first correct hit’s reciprocal rank.",
  ],
];

export function Evaluation() {
  return (
    <DocsSection
      id="evaluation"
      title="Evaluation"
      intro="One saved local run: 60 memories, 50 queries and three retrieval policies. Raw cosine wins this comparison. The results below preserve that outcome."
    >
      <div aria-label="Retrieval benchmark" role="region" className="min-w-0">
        <div className="hidden rounded-xl border border-line bg-white sm:block">
          <table className="w-full table-fixed text-left text-[14px]">
            <caption className="sr-only">
              Local retrieval benchmark: top-1, top-3 and mean reciprocal rank
            </caption>
            <colgroup>
              <col className="w-[46%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th scope="col" className="px-5 py-4 font-medium">
                  Retrieval policy
                </th>
                <th scope="col" className="px-2 py-4 text-right font-medium">
                  Top-1
                </th>
                <th scope="col" className="px-2 py-4 text-right font-medium">
                  Top-3
                </th>
                <th
                  scope="col"
                  className="py-4 pl-2 pr-5 text-right font-medium"
                >
                  <abbr title="Mean reciprocal rank" className="no-underline">
                    MRR
                  </abbr>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {RESULTS.map((row) => (
                <tr
                  key={row.name}
                  className={row.primary ? "bg-accent-soft/45" : ""}
                >
                  <th scope="row" className="px-5 py-5 font-normal">
                    <span
                      className={`block ${row.primary ? "font-medium text-ink" : "text-ink"}`}
                    >
                      {row.name}
                    </span>
                    <span className="mt-1 block text-[12px] text-muted">
                      {row.detail}
                    </span>
                  </th>
                  <td className="px-2 py-5 text-right font-mono text-[13px] tabular-nums text-ink">
                    {row.top1}
                  </td>
                  <td className="px-2 py-5 text-right font-mono text-[13px] tabular-nums text-ink">
                    {row.top3}
                  </td>
                  <td className="py-5 pl-2 pr-5 text-right font-mono text-[13px] tabular-nums text-ink">
                    {row.mrr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 sm:hidden">
          {RESULTS.map((row) => (
            <div
              key={row.name}
              className={`rounded-xl border p-4 ${row.primary ? "border-accent/20 bg-accent-soft/45" : "border-line bg-white"}`}
            >
              <h3 className="text-[15px] font-medium text-ink">{row.name}</h3>
              <p className="mt-1 text-[12px] text-muted">{row.detail}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-ink/10 pt-4">
                {[
                  ["Top-1", row.top1],
                  ["Top-3", row.top3],
                  ["MRR", row.mrr],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[12px] text-muted">{label}</dt>
                    <dd className="mt-1 font-mono text-[15px] tabular-nums text-ink">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[12px] text-muted">
        Top-1 / top-3: accuracy at rank 1 / 3. MRR: mean reciprocal rank.
        Measured {measuredAt} (India time).
      </p>
      <div className="border-y border-line py-6">
        <h3 className="text-[17px] font-medium text-ink">
          How the comparison works
        </h3>
        <ol className="mt-5 grid gap-6 sm:grid-cols-2">
          {PROCEDURE.map(([title, body], index) => (
            <li key={title} className="flex gap-3">
              <span className="pt-0.5 font-mono text-[12px] text-accent-ink">
                0{index + 1}
              </span>
              <div>
                <h4 className="text-[14px] font-medium text-ink">{title}</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h3 className="text-[16px] font-medium text-ink">
          What the results establish
        </h3>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          Raw cosine outperformed both additional ranking policies on this run.
          This dataset provides no demonstrated retrieval improvement from
          decay, importance or keyword boosting. Tune on development data, then
          evaluate unseen cases before making a quality claim.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          This small, in-sample comparison does not measure agent answer
          quality, conflict accuracy, tenant isolation or performance at scale.
        </p>
        <a
          href="/benchmark-results.json"
          className="mt-5 inline-flex min-h-10 items-center gap-2 text-[13px] font-medium text-accent-ink underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
        >
          <ArrowDownToLine aria-hidden="true" className="h-4 w-4" /> Download
          results and environment details
        </a>
      </div>
    </DocsSection>
  );
}
