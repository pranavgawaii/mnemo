"use client";

import { useState } from "react";
import { Check, Database, LoaderCircle, RotateCcw } from "lucide-react";
import { ExpandedView } from "@/components/ui/expanded-view";
import { LIVE_SCENARIOS, type DemoScenarioId } from "@/lib/api/demo-scenarios";
import { currentStatement } from "@/lib/memory/changes";
import type { useDemoAvailability } from "./use-demo-availability";
import type {
  DemoAction,
  DemoHit,
  DemoRequest,
  LiveDemoResult,
} from "@/lib/api/live-demo";

export function LiveApiDemo({ availabilityState }: { availabilityState: ReturnType<typeof useDemoAvailability> }) {
  const [scenarioId, setScenarioId] = useState<DemoScenarioId>("relocation");
  const scenario = LIVE_SCENARIOS[scenarioId];
  const { availability, setAvailability, checking, check } = availabilityState;
  const enabled = availability?.enabled;
  const online = availability?.status === "available";
  const [result, setResult] = useState<LiveDemoResult | null>(null);
  const [before, setBefore] = useState<DemoHit[]>([]);
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  async function run(action: DemoAction) {
    setBusy(true);
    setError("");
    let receivedResponse = false;
    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "start" ? { scenario: scenarioId } : {}),
          token: action === "start" ? undefined : result?.token,
        }),
        signal: AbortSignal.timeout(55_000),
      });
      receivedResponse = true;
      const data = await response.json();
      if (Array.isArray(data.requests))
        setRequests((previous) =>
          action === "start" ? data.requests : [...previous, ...data.requests],
        );
      if (!response.ok) {
        if ([401, 403, 429, 502, 503].includes(response.status)) setAvailability({
          enabled: true, status: "unavailable", checkedAt: new Date().toISOString(),
          reason: response.status === 429 ? "busy" : [401, 403].includes(response.status) ? "access" : "unreachable",
        });
        throw new Error(
          data.error || "The API request failed. Start a new run to retry.",
        );
      }
      setAvailability({ enabled: true, status: "available", embedding: "warm", checkedAt: new Date().toISOString() });
      setResult({
        ...data,
        reason:
          action === "start" ? data.reason : (data.reason ?? result?.reason),
      });
      if (action === "start") setBefore(data.hits);
    } catch (failure) {
      if (!receivedResponse) setAvailability({ enabled: true, status: "unavailable", reason: "unreachable", checkedAt: new Date().toISOString() });
      setError(
        failure instanceof Error && failure.name !== "TimeoutError"
          ? failure.message
          : "The API timed out. Check the service and start a new run.",
      );
    } finally {
      setBusy(false);
    }
  }
  const phase = result?.phase;
  const action: DemoAction = !result
    ? "start"
    : phase === "stored"
      ? "move"
      : phase === "flagged"
        ? "resolve"
        : "start";
  const actionLabel = {
    start: result ? "Start new run" : "Save and recall a fact",
    move: scenario.introduce,
    resolve: scenario.keep,
  }[action];
  function hits(items: DemoHit[], emptyMessage?: string) {
    return items.length ? (
      <ul className="mt-3 space-y-2">
        {items.map((hit) => (
          <li
            key={hit.id}
            className="rounded-lg border border-line bg-white p-2.5"
          >
            <p className="break-words text-[13px] leading-5 line-clamp-3" title={hit.content}>
              {hit.currentStatement ?? currentStatement(hit.content) ?? hit.content}
            </p>
            <p className="mt-2 font-mono text-[10px] tabular-nums text-muted">
              cosine {hit.similarity.toFixed(3)} · score {hit.score.toFixed(3)}
            </p>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        {emptyMessage ??
          (result
            ? "No matching facts returned."
            : "Start the run to see backend results.")}
      </p>
    );
  }
  return (
    <section
      id="live-api"
      aria-label="Live API demo"
      className="mx-auto max-w-frame px-4 pb-12 pt-4 sm:px-6"
    >
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div className="flex items-start justify-between gap-3 border-b border-line bg-background/50 p-4 sm:p-6">
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-medium">
              <Database
                aria-hidden="true"
                className="h-4 w-4 text-accent-ink"
              />{" "}
              Live API walkthrough
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-muted">
              Real writes, backend embeddings and database reads. No generated
              answers.
            </p>
          </div>
          <span role="status" aria-label="API availability" className="w-[88px] shrink-0 rounded-full border border-line bg-white px-2 py-1 text-center text-[10px] text-muted">
            {checking
              ? "Checking…"
              : online ? "API online" : enabled === false ? "Setup needed" : "API unavailable"}
          </span>
        </div>
        <div className="p-4 sm:min-h-[430px] sm:p-6">
          {enabled === false ? (
            <div className="max-w-xl">
              <h3 className="text-[17px] font-medium">
                Connect your local API
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                This mode runs on your computer with the API and PostgreSQL.
                The hosted website cannot reach your laptop’s localhost.
                No public backend hosting is required.
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-muted">
                <li>Start the API and database using the quickstart.</li>
                <li>Set these server-only variables in <code>frontend/.env.local</code>.</li>
                <li>Restart the local frontend and open <code>localhost:3005/playground</code>.</li>
              </ol>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-line bg-background p-3 text-[11px] leading-6">
                <code>
                  MNEMO_DEMO_API_URL=http://127.0.0.1:8000{"\n"}
                  MNEMO_DEMO_API_KEY=your-api-key
                </code>
              </pre>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                The key stays on the web server. This demo uses fixed sample
                facts in a separate namespace for each run.
              </p>
              <a
                href="/docs#live-api-setup"
                className="mt-5 inline-flex min-h-10 items-center text-[13px] text-accent-ink underline underline-offset-4"
              >
                Live demo setup
              </a>
              {error && (
                <p role="alert" className="mt-3 text-[13px] text-[#92400E]">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <>
              <label htmlFor="live-scenario" className="block text-[12px] font-medium text-ink">
                Choose a real API example
              </label>
              <select
                id="live-scenario"
                value={scenarioId}
                disabled={busy || checking}
                onChange={(event) => {
                  setScenarioId(event.target.value as DemoScenarioId);
                  setResult(null);
                  setBefore([]);
                  setRequests([]);
                  setError("");
                }}
                className="mb-4 mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-[16px] sm:max-w-xs sm:text-[13px] disabled:opacity-50"
              >
                {Object.entries(LIVE_SCENARIOS).map(([id, example]) => (
                  <option key={id} value={id}>{example.label}</option>
                ))}
              </select>
              <ol
                aria-label="Live API progress"
                className="grid grid-cols-3 gap-3 text-[11px] text-muted sm:text-[12px]"
              >
                {["Save & recall", "Flag change", "Review & recall"].map(
                  (label, index) => {
                    const completed =
                      result &&
                      ["stored", "flagged", "resolved"].indexOf(phase!) >=
                        index;
                    return (
                      <li
                        key={label}
                        className={`flex items-center gap-1.5 ${completed ? "text-accent-ink" : ""}`}
                      >
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line">
                          {completed ? (
                            <Check aria-hidden="true" className="h-3 w-3" />
                          ) : (
                            index + 1
                          )}
                        </span>
                        {label}
                      </li>
                    );
                  },
                )}
              </ol>
              <div
                role="status"
                aria-live="polite"
                aria-label="Live walkthrough status"
                className="mt-3 flex h-[84px] items-center rounded-lg border border-line bg-background/40 p-3 text-[12px] leading-5 text-muted sm:h-[64px]"
              >
                {error ? (
                  <span className="text-[#92400E]">{error}</span>
                ) : checking ? (
                  "Checking database access and demo-key permissions. No facts are written."
                ) : !online ? (
                  availability?.reason === "access" ? "The demo key needs read and write access. Fix its permissions, then check availability."
                    : availability?.reason === "busy" ? "The demo API is rate limited. Wait, then check availability again."
                    : "The backend could not be reached or is not ready. Check availability to retry. Your results are preserved."
                ) : busy ? (
                  "Waiting for the API. The first embedding request can take longer."
                ) : phase === "resolved" ? (
                  "The API confirmed the previous fact is inactive. Compare the actual context below."
                ) : phase === "flagged" ? (
                  "The API flagged the change. Both facts stay active until you choose which to keep."
                ) : phase === "stored" ? (
                  "The first fact was saved and retrieved through the API. Introduce the change next."
                ) : (
                  "Save the sample fact, introduce a change, then review it. Compare the actual retrieval results below."
                )}
              </div>
              <div className="mt-3 flex h-[88px] flex-wrap content-start items-center gap-2 sm:h-10">
                <button
                  type="button"
                  disabled={busy || !online || checking}
                  onClick={() => run(error ? "start" : action)}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink sm:w-auto px-3 text-[12px] font-medium text-white disabled:opacity-50"
                >
                  {busy && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                    />
                  )}
                  {error ? "Start new run" : actionLabel}
                </button>
                <button
                  type="button"
                  disabled={!requests.length || busy}
                  onClick={() => setExpanded(true)}
                  className="min-h-10 rounded-lg border border-line px-3 text-[12px] text-muted disabled:opacity-50"
                >
                  Inspect API requests
                </button>
                {result && (
                  <button
                    type="button"
                    aria-label="Reset live demo view"
                    disabled={busy}
                    onClick={() => {
                      setResult(null);
                      setBefore([]);
                      setRequests([]);
                      setError("");
                    }}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted disabled:opacity-50"
                  >
                    <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div
                className="mt-3 grid h-[256px] grid-cols-1 gap-3 sm:h-[172px] sm:grid-cols-2"
                aria-label="Live API results"
                role="region"
              >
                <section
                  className="min-w-0"
                  aria-label="Live context before change"
                >
                  <h3 className="text-[12px] font-medium text-muted">
                    Before change
                  </h3>
                  {hits(before)}
                </section>
                <section
                  className="min-w-0"
                  aria-label="Live context after review"
                >
                  <h3 className="text-[12px] font-medium text-accent-ink">
                    {phase === "flagged"
                      ? "Change awaiting review"
                      : "After review"}
                  </h3>
                  {phase === "flagged" ? (
                    <p className="mt-3 rounded-lg border border-[#FDE68A] bg-[#FFFCF4] p-3 text-[13px] leading-5">
                      {currentStatement(result?.change ?? "") ?? result?.change}
                    </p>
                  ) : (
                    hits(
                      phase === "resolved" ? result!.hits : [],
                      phase === "resolved"
                        ? undefined
                        : "Review the change to see the next recall.",
                    )
                  )}
                </section>
              </div>
              <div className="mt-2 flex h-[64px] items-center justify-between gap-2 border-t border-line pt-2 sm:h-12">
                <p className="text-[11px] leading-4 text-muted">
                  {checking ? "Checking the backend…" : online
                    ? `Checked ${availability?.checkedAt ? new Date(availability.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now"}. Database and key ready; encoder ${availability?.embedding === "cold" ? "starts on first use" : "warm"}.`
                    : "Availability is checked without saving sample facts."}
                </p>
                <button type="button" disabled={checking || busy} onClick={() => { setError(""); void check(); }} className="min-h-10 shrink-0 rounded-lg border border-line px-2 text-[11px] text-muted disabled:opacity-50">
                  Check availability
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted">
                Each run uses synthetic facts with a 15-minute expiry. Expiry
                removes search eligibility; rows can remain in database history.
              </p>
            </>
          )}
        </div>
      </div>
      <ExpandedView
        open={expanded}
        onClose={() => setExpanded(false)}
        title="Live API requests"
        description="Actual upstream calls and elapsed request times from this run, with no API credentials."
      >
        <p className="text-[13px] leading-relaxed text-muted">
          Durations include transport and backend work. They are observations
          from this run, not a benchmark.
        </p>
        <ol className="mt-4 space-y-3">
          {requests.map((entry, index) => (
            <li
              key={index}
              className="break-words rounded-lg border border-line p-3 font-mono text-[11px] leading-5"
            >
              {entry.method} {entry.path}
              <br />
              HTTP {entry.status} · {entry.durationMs} ms
            </li>
          ))}
        </ol>
        {result?.reason && (
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            Conflict reason: {result.reason}
          </p>
        )}
        {(before.length > 0 || result?.hits.length) && (
          <section aria-label="Stored source records" className="mt-5 border-t border-line pt-4">
            <h3 className="text-[14px] font-medium">Stored source records</h3>
            <p className="mt-2 text-[12px] text-muted">Current values are a display view. The complete source text is retained.</p>
            <ul className="mt-3 space-y-2 text-[13px] leading-6">
              {[...before, ...(result?.hits ?? [])].filter((hit, index, all) => all.findIndex(item => item.id === hit.id) === index).map(hit => <li key={hit.id} className="break-words rounded-lg border border-line p-3">{hit.content}</li>)}
            </ul>
          </section>
        )}
      </ExpandedView>
    </section>
  );
}
