"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { DocsSection } from "./docs-section";
import {
  CONTRADICTION_SIM_THRESHOLD,
  NEGATION_MARKERS,
  checkContradiction,
} from "../lib/mnemo";

export function ContradictionExplainer() {
  const [existing, setExisting] = useState("Pranav lives in Bengaluru");
  const [incoming, setIncoming] = useState("Pranav no longer lives in Bengaluru");
  const [similarity, setSimilarity] = useState(0.93);

  const verdict = checkContradiction(incoming, existing, similarity);
  const gatePassed = similarity >= CONTRADICTION_SIM_THRESHOLD;

  return (
    <DocsSection
      id="contradiction-checker"
      index="13"
      title="Contradiction checker"
      intro={
        <>
          The stages below are the exact logic from{" "}
          <span className="font-mono text-[12px] text-ink">
            app/core/contradiction.py
          </span>
          , ported to the browser. Similarity would normally come from the vector
          search; set it manually here.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 items-start">
        <div>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="cx-existing" className="font-mono text-[10.5px] uppercase tracking-wider text-faint">
                existing memory
              </label>
              <input
                id="cx-existing"
                value={existing}
                onChange={(e) => setExisting(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-ink outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
              />
            </div>
            <div>
              <label htmlFor="cx-incoming" className="font-mono text-[10.5px] uppercase tracking-wider text-faint">
                incoming memory
              </label>
              <input
                id="cx-incoming"
                value={incoming}
                onChange={(e) => setIncoming(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-ink outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="cx-sim" className="font-mono text-[10.5px] uppercase tracking-wider text-faint">
                  cosine similarity
                </label>
                <span className="font-mono text-[11px] text-ink">
                  {similarity.toFixed(2)} · gate {CONTRADICTION_SIM_THRESHOLD}
                </span>
              </div>
              <input
                id="cx-sim"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={similarity}
                onChange={(e) => setSimilarity(Number(e.target.value))}
                className="mt-2 w-full accent-[#4F46E5]"
              />
            </div>
          </div>

          <div className="mt-6 border-t border-hairline pt-5">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-faint">
              negation markers
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {NEGATION_MARKERS.map((marker) => (
                <span
                  key={marker}
                  className="rounded-md border border-line bg-[#FCFCFB] px-2 py-0.5 font-mono text-[10.5px] text-muted"
                >
                  {marker}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-[#FCFCFB] p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium ${
                verdict.isContradiction
                  ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                  : "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
              }`}
            >
              {verdict.isContradiction ? (
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.2} />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
              )}
              {verdict.isContradiction ? "flagged" : "not flagged"}
            </span>
            <span className="font-mono text-[10.5px] text-faint">
              gate {gatePassed ? "passed" : "failed"}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <StageRow index="1" label="Similarity gate" ok={gatePassed}>
              {gatePassed
                ? `similarity ${similarity.toFixed(2)} ≥ ${CONTRADICTION_SIM_THRESHOLD}`
                : `similarity ${similarity.toFixed(2)} < ${CONTRADICTION_SIM_THRESHOLD} — stops here`}
            </StageRow>
            <StageRow index="2" label="Negation check" ok={verdict.isContradiction} muted={!gatePassed}>
              {gatePassed
                ? verdict.reason
                : "not reached — the gate already rejected this pair"}
            </StageRow>
          </div>

          <div className="mt-5 rounded-lg border border-line bg-white px-3.5 py-3">
            <p className="font-mono text-[10.5px] text-faint">verdict.reason</p>
            <p className="mt-1.5 font-mono text-[11px] leading-[1.7] text-ink">
              {verdict.reason}
            </p>
          </div>

          <div className="mt-5 border-t border-hairline pt-5">
            <p className="text-[12.5px] leading-[1.7] text-muted">
              A flag only means “these two look like opposites about the same
              subject”. Resolution is an explicit, human action:{" "}
              <span className="font-mono text-[11.5px] text-ink">
                POST /v1/contradictions/resolve
              </span>{" "}
              names the winner, and the loser is soft-deleted{" "}
              <span className="font-mono text-[11.5px] text-ink">
                (is_active = false)
              </span>{" "}
              so the audit trail survives. Nothing is ever hard-deleted.
            </p>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B45309]" strokeWidth={2} />
            <p className="text-[12px] leading-[1.7] text-[#92400E]">
              A flag does <strong>not</strong> establish which statement is true.
              The marker list is small and English-only, so paraphrased
              contradictions can be missed and unrelated statements that share one
              negation can be flagged. It is a high-precision default, not an
              oracle.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white p-5 md:p-6">
        <h3 className="text-[16px] font-medium text-ink">The resolution flow</h3>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-stretch">
          {[
            { t: "Flag", d: "Adding a memory compares it to its 5 nearest neighbours and writes a contradiction row with status: open." },
            { t: "Review", d: "GET /v1/contradictions lists open conflicts so a person can read both sides." },
            { t: "Resolve", d: "POST /v1/contradictions/resolve names the winner. The loser becomes is_active = false." },
            { t: "Audit", d: "Both rows and the contradiction itself remain in the database — resolved, never erased." },
          ].map((step, i, arr) => (
            <div key={step.t} className="flex flex-1 items-stretch gap-3">
              <div className="flex-1 rounded-xl border border-line bg-[#FCFCFB] px-4 py-4">
                <div className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-accent-ink">
                  {step.t}
                </div>
                <p className="mt-2 text-[12.5px] leading-[1.65] text-muted">{step.d}</p>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="hidden h-4 w-4 shrink-0 self-center text-[#D4D4D4] md:block" strokeWidth={1.8} />
              )}
            </div>
          ))}
        </div>
      </div>
    </DocsSection>
  );
}

function StageRow({
  index,
  label,
  ok,
  muted,
  children,
}: {
  index: string;
  label: string;
  ok: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-line bg-white px-3.5 py-3">
      <span className="font-mono text-[10.5px] text-faint pt-0.5">{index}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium text-ink">{label}</span>
          {!muted && (
            <span
              className={`font-mono text-[10px] ${ok ? "text-[#15803D]" : "text-[#B45309]"}`}
            >
              {ok ? "✓" : "stop"}
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-[10.5px] leading-[1.65] text-muted">
          {children}
        </p>
      </div>
    </div>
  );
}
