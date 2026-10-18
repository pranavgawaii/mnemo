"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Database,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { AnimatedSection } from "./animated-section";
import { DocsSection } from "./docs-section";
import {
  CONTRADICTION_SIM_THRESHOLD,
  EMBEDDING_MODEL,
  decayFactor,
  importanceWeight,
  type SearchHit,
} from "../lib/mnemo";
import {
  EXAMPLE_MEMORIES,
  EXAMPLE_QUERIES,
  addMemory,
  initialPlaygroundState,
  resolveContradiction,
  searchMemories,
  type PlaygroundContradiction,
  type PlaygroundMemory,
  type PlaygroundState,
} from "../lib/playground";

const IMPORTANCE_LABELS: Record<number, string> = {
  1: "low",
  2: "slight",
  3: "neutral",
  4: "high",
  5: "critical",
};

type Explanation = { tone: "note" | "warn" | "ok"; title: string; body: string };

export function MemoryPlayground() {
  const [store, setStore] = useState<PlaygroundState>(() => initialPlaygroundState());
  const [content, setContent] = useState("Pranav lives in Bengaluru");
  const [importance, setImportance] = useState(4);
  const [query, setQuery] = useState<string>(EXAMPLE_QUERIES[0]);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<PlaygroundMemory | null>(null);
  const [explanation, setExplanation] = useState<Explanation>({
    tone: "note",
    title: "Nothing has happened yet",
    body: "Add a memory or run a search. Everything below runs in your browser — see the note above.",
  });
  const [lastAction, setLastAction] = useState<"add" | "search" | null>(null);

  const openContradictions = store.contradictions.filter((c) => c.status === "open");
  const activeMemories = store.memories.filter((m) => m.is_active);
  const activeById = new Map(store.memories.map((m) => [m.id, m.is_active]));

  function handleAdd() {
    const text = content.trim();
    if (!text) return;
    const { state, memory, contradictions } = addMemory(store, text, importance);
    setStore(state);
    setLastCreated(memory);
    setLastAction("add");

    if (contradictions.length > 0) {
      const c = contradictions[0];
      setExplanation({
        tone: "warn",
        title: "A possible contradiction was flagged",
        body:
          `“${text}” is ${(c.similarity * 100).toFixed(0)}% similar to an existing memory ` +
          `(“${c.existing_memory.content}”), which is above the ${CONTRADICTION_SIM_THRESHOLD} gate, ` +
          `and exactly one side carries a negation marker. So Mnemo flagged a conflict instead of ` +
          `overwriting anything. It does not know which statement is true — a human decides.`,
      });
    } else {
      setExplanation({
        tone: "ok",
        title: "Memory stored, nothing flagged",
        body:
          `“${text}” was added with importance ${importance} (${IMPORTANCE_LABELS[importance]}). ` +
          `No active memory cleared the ${CONTRADICTION_SIM_THRESHOLD} similarity gate with an opposing ` +
          `polarity, so nothing was flagged. Note: a changed fact phrased without a negation marker ` +
          `(try “Pranav moved to Pune”) can slip past this heuristic — it looks for polarity flips, not ` +
          `for a different value.`,
      });
    }
  }

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    const results = searchMemories(store, q, 5);
    setHits(results);
    setLastQuery(q);
    setLastAction("search");
    const top = results[0];
    setExplanation({
      tone: "note",
      title: "Recall ranked by relevance, not raw similarity",
      body: top
        ? `“${q}” returned ${results.length} memories. The top hit is “${top.memory.content}” ` +
          `with relevance ${top.relevance_score.toFixed(3)} = similarity ${top.similarity.toFixed(3)} ` +
          `× decay ${decayFactor(top.age_days).toFixed(3)} × importance ${importanceWeight(top.memory.importance).toFixed(2)}. ` +
          `Similarity here is illustrative; the live API computes it with ${EMBEDDING_MODEL}.`
        : `“${q}” returned no memories yet — add one first.`,
    });
  }

  function handleResolve(contradiction: PlaygroundContradiction, winner: PlaygroundMemory) {
    const next = resolveContradiction(store, contradiction.id, winner.id);
    setStore(next);
    // Keep the visible results in sync with the soft-deleted loser.
    if (lastQuery) setHits(searchMemories(next, lastQuery, 5));
    const loser = winner.id === contradiction.new_memory.id
      ? contradiction.existing_memory
      : contradiction.new_memory;
    setExplanation({
      tone: "ok",
      title: "Resolved — the loser was soft-deleted",
      body:
        `Kept “${winner.content}”. “${loser.content}” is now is_active = false: it drops out of search ` +
        `and listings but its row remains, so the audit trail survives. Nothing is ever hard-deleted.`,
    });
  }

  function handleReset() {
    setStore(initialPlaygroundState());
    setHits(null);
    setLastQuery(null);
    setLastCreated(null);
    setLastAction(null);
    setContent("Pranav lives in Bengaluru");
    setImportance(4);
    setQuery(EXAMPLE_QUERIES[0]);
    setExplanation({
      tone: "note",
      title: "Playground reset",
      body: "Six sample memories, no contradictions. Add or search again.",
    });
  }

  return (
    <DocsSection
      id="playground"
      index="11"
      title="Memory playground"
      intro="Store a fact, search for it, watch the ranking, then try to contradict it. Add and search run against a simulated store in your browser."
    >
      <div className="flex flex-col gap-4">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-1.5 text-[12px] font-medium text-[#B45309]">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          Simulation — runs entirely in your browser, not the live API
        </div>
        <p className="max-w-[720px] text-[12.5px] leading-[1.7] text-faint">
          The live API authenticates every request with a private{" "}
          <span className="font-mono">X-API-Key</span>, which a public page must
          not embed, so this demo mirrors the request and response shapes and
          reuses the real ranking formula. Similarity is an illustrative score;
          the service itself matches on {EMBEDDING_MODEL} embeddings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------- Add ---------------- */}
        <AnimatedSection className="flex flex-col rounded-xl border border-line bg-[#FCFCFB] p-5 md:p-6">
          <div className="flex items-center gap-2.5">
            <Database className="h-4 w-4 text-accent-ink" strokeWidth={1.8} />
            <h3 className="text-[16px] font-medium text-ink">1 · Add a sample memory</h3>
          </div>

          <label htmlFor="pg-content" className="mt-5 text-[12px] font-medium text-muted">
            Memory content
          </label>
          <textarea
            id="pg-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="mt-2 w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLE_MEMORIES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setContent(example)}
                className="rounded-full border border-line bg-white px-3 py-1 font-mono text-[11px] text-muted hover:text-ink hover:border-faint/40 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <label htmlFor="pg-importance" className="text-[12px] font-medium text-muted">
              Importance
            </label>
            <span className="font-mono text-[11px] text-ink">
              {importance} / 5 · {IMPORTANCE_LABELS[importance]}
            </span>
          </div>
          <input
            id="pg-importance"
            type="range"
            min={1}
            max={5}
            step={1}
            value={importance}
            onChange={(e) => setImportance(Number(e.target.value))}
            className="mt-2 w-full accent-[#4F46E5]"
          />
          <p className="mt-1 font-mono text-[10.5px] text-faint">
            weight = {importanceWeight(importance).toFixed(2)} (band 0.90–1.10)
          </p>

          <button
            type="button"
            onClick={handleAdd}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-2.5 text-[13.5px] font-medium text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
          >
            Store memory
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </AnimatedSection>

        {/* ---------------- Search ---------------- */}
        <AnimatedSection delay={80} className="flex flex-col rounded-xl border border-line bg-[#FCFCFB] p-5 md:p-6">
          <div className="flex items-center gap-2.5">
            <Search className="h-4 w-4 text-accent-ink" strokeWidth={1.8} />
            <h3 className="text-[16px] font-medium text-ink">2 · Search for a memory</h3>
          </div>

          <label htmlFor="pg-query" className="mt-5 text-[12px] font-medium text-muted">
            Query
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="pg-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="shrink-0 rounded-lg border border-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-black/[0.03] transition-colors"
            >
              Search
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="rounded-full border border-line bg-white px-3 py-1 font-mono text-[11px] text-muted hover:text-ink hover:border-faint/40 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
                In memory
              </span>
              <span className="font-mono text-[11px] text-ink">
                {activeMemories.length} active
              </span>
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {activeMemories.map((m) => (
                <li key={m.id} className="flex items-baseline gap-2 text-[11.5px]">
                  <span className="font-mono text-[10px] text-faint">{m.importance}</span>
                  <span className="truncate text-muted">{m.content}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-faint">
                    {m.age_days}d
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </AnimatedSection>
      </div>

      {/* ---------------- Results ---------------- */}
      <AnimatedSection>
        <div className="rounded-xl border border-line bg-[#FCFCFB] p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-[16px] font-medium text-ink">3 · Recall results</h3>
            {lastQuery && (
              <span className="font-mono text-[11px] text-muted">
                query: “{lastQuery}”
              </span>
            )}
            <span className="ml-auto font-mono text-[10.5px] text-faint">
              similarity is illustrative
            </span>
          </div>

          {!hits ? (
            <p className="mt-4 text-[13px] text-muted">
              Run a search to see returned memories, their raw similarity, and the
              ranking breakdown.
            </p>
          ) : hits.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted">No memories matched.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {hits.map((hit, i) => {
                const decay = decayFactor(hit.age_days);
                const weight = importanceWeight(hit.memory.importance);
                const top = hits[0].relevance_score || 1;
                return (
                  <li
                    key={hit.memory.id}
                    className="rounded-xl border border-line bg-white px-4 py-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[11px] text-faint pt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] text-ink">{hit.memory.content}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] text-muted">
                          <span>sim {hit.similarity.toFixed(3)}</span>
                          <span>decay {decay.toFixed(3)}</span>
                          <span>importance ×{weight.toFixed(2)}</span>
                          <span>age {hit.age_days}d</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#F3F4F6]">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{
                                width: `${Math.min(100, (hit.relevance_score / top) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-ink">
                            {hit.relevance_score.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </AnimatedSection>

      {/* ---------------- Contradictions ---------------- */}
      {store.contradictions.length > 0 && (
        <AnimatedSection>
          <div className="rounded-xl border border-line bg-[#FCFCFB] p-5 md:p-6">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-[#B45309]" strokeWidth={1.8} />
              <h3 className="text-[16px] font-medium text-ink">
                4 · Flagged contradictions
              </h3>
              <span className="ml-auto font-mono text-[10.5px] text-faint">
                {openContradictions.length} open · {store.contradictions.length} total
              </span>
            </div>

            <ul className="mt-4 flex flex-col gap-3">
              {store.contradictions.map((c) => (
                <li key={c.id} className="rounded-xl border border-line bg-white px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        c.status === "open"
                          ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                          : "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          c.status === "open" ? "bg-[#F59E0B]" : "bg-[#22C55E]"
                        }`}
                      />
                      {c.status}
                    </span>
                    <span className="font-mono text-[10.5px] text-faint">
                      sim {c.similarity.toFixed(3)} ≥ gate {CONTRADICTION_SIM_THRESHOLD}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Side
                      label="existing"
                      text={c.existing_memory.content}
                      inactive={activeById.get(c.existing_memory.id) === false}
                    />
                    <Side
                      label="new"
                      text={c.new_memory.content}
                      inactive={activeById.get(c.new_memory.id) === false}
                    />
                  </div>

                  <p className="mt-3 font-mono text-[11px] leading-[1.7] text-muted">
                    {c.reason}
                  </p>

                  {c.status === "open" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolve(c, c.new_memory)}
                        className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-black/[0.03] transition-colors"
                      >
                        Keep new
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(c, c.existing_memory)}
                        className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-black/[0.03] transition-colors"
                      >
                        Keep existing
                      </button>
                      <span className="self-center font-mono text-[10.5px] text-faint">
                        loser → is_active = false
                      </span>
                    </div>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-[#15803D]">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      resolved · winner {c.resolved_winner_id?.slice(0, 8)}… · loser kept
                      in the audit trail
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </AnimatedSection>
      )}

      {/* ---------------- Plain-language explanation ---------------- */}
      <AnimatedSection>
        <div
          className={`rounded-xl border p-5 md:p-6 ${
            explanation.tone === "warn"
              ? "border-[#FDE68A] bg-[#FFFBEB]"
              : explanation.tone === "ok"
                ? "border-[#BBF7D0] bg-[#F0FDF4]"
                : "border-line bg-white"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0">
              {explanation.tone === "warn" ? (
                <AlertTriangle className="h-4 w-4 text-[#B45309]" strokeWidth={2} />
              ) : explanation.tone === "ok" ? (
                <Check className="h-4 w-4 text-[#15803D]" strokeWidth={2.5} />
              ) : (
                <Sparkles className="h-4 w-4 text-accent-ink" strokeWidth={2} />
              )}
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-ink">{explanation.title}</h3>
              <p className="mt-1.5 text-[13px] leading-[1.7] text-muted">
                {explanation.body}
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10.5px] text-faint">
          {lastAction ? `last action: ${lastAction}` : "no action yet"}
          {lastCreated ? ` · stored “${lastCreated.content}”` : ""}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-[12.5px] font-medium text-muted hover:text-ink transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
          Reset demo
        </button>
      </div>
    </DocsSection>
  );
}

function Side({
  label,
  text,
  inactive,
}: {
  label: string;
  text: string;
  inactive: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-[#FCFCFB] px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
          {label}
        </span>
        {inactive && (
          <span className="font-mono text-[9.5px] text-[#B45309]">soft-deleted</span>
        )}
      </div>
      <p className={`mt-1 text-[12.5px] leading-snug ${inactive ? "text-faint line-through" : "text-ink"}`}>
        {text}
      </p>
    </div>
  );
}
