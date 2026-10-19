"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Database,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useTabList } from "../lib/use-tabs";
import { MemoryOrbit } from "./memory-orbit";
import {
  CONTRADICTION_SIM_THRESHOLD,
  DECAY_FLOOR,
  DECAY_HALF_LIFE_DAYS,
  checkContradiction,
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

/**
 * The playground console.
 *
 * A single workspace that stands in for the running service: a memory store and
 * a composer on the left, three tool panes on the right (recall, ranking,
 * conflicts), and a plain-language readout along the bottom that explains what
 * just happened. State is shared across all of it, so adding a conflicting fact
 * moves you to the Conflicts pane and resolving one strikes the loser out of the
 * store, live.
 *
 * Everything is computed from `lib/mnemo.ts` and `lib/playground.ts` — the same
 * formula, gate and reason strings the backend runs. Similarity alone is the
 * labelled lexical approximation; the live API embeds with all-MiniLM-L6-v2.
 */

const IMPORTANCE_LABELS: Record<number, string> = {
  1: "low",
  2: "slight",
  3: "neutral",
  4: "high",
  5: "critical",
};

const TABS = ["Recall", "Ranking", "Conflicts"] as const;
type TabIndex = 0 | 1 | 2;

type Explanation = { tone: "note" | "warn" | "ok"; title: string; body: string };

const INITIAL_EXPLANATION: Explanation = {
  tone: "note",
  title: "Six memories are loaded",
  body: "Run a query, store a new fact, or move the ranking sliders. Nothing leaves this tab — the console reuses Mnemo's real scoring maths, with similarity stood in by a lexical approximation.",
};

export function MemoryConsole() {
  const [store, setStore] = useState<PlaygroundState>(() => initialPlaygroundState());
  const [content, setContent] = useState("Pranav lives in Bengaluru");
  const [importance, setImportance] = useState(4);
  const [query, setQuery] = useState<string>(EXAMPLE_QUERIES[0]);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [tab, setTab] = useState<TabIndex>(0);
  const [explanation, setExplanation] = useState<Explanation>(INITIAL_EXPLANATION);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const activeMemories = store.memories.filter((m) => m.is_active);
  const activeById = new Map(store.memories.map((m) => [m.id, m.is_active]));
  const openConflicts = store.contradictions.filter((c) => c.status === "open");

  const { register, onKeyDown } = useTabList({
    count: TABS.length,
    active: tab,
    onChange: (index) => setTab(index as TabIndex),
  });

  function handleAdd(text: string, imp: number) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { state, memory, contradictions } = addMemory(store, trimmed, imp);
    setStore(state);
    setLastAction(`stored “${trimmed}”`);
    setFocusId(memory.id);

    // Keep an open result set honest: the new memory may belong in it.
    if (lastQuery) setHits(searchMemories(state, lastQuery, 5));

    if (contradictions.length > 0) {
      const c = contradictions[0];
      setTab(2);
      setExplanation({
        tone: "warn",
        title: "A contradiction was flagged",
        body:
          `“${trimmed}” is ${(c.similarity * 100).toFixed(0)}% similar to “${c.existing_memory.content}”, ` +
          `above the ${CONTRADICTION_SIM_THRESHOLD} gate, with a negation marker on one side only. Mnemo flagged it ` +
          `instead of overwriting. It does not know which statement is true — that is your call, in the Conflicts pane.`,
      });
    } else {
      setExplanation({
        tone: "ok",
        title: "Stored, nothing flagged",
        body:
          `“${trimmed}” was written with importance ${imp} (${IMPORTANCE_LABELS[imp]}). Nothing cleared both the ` +
          `${CONTRADICTION_SIM_THRESHOLD} similarity gate and a polarity flip. A changed fact phrased without a ` +
          `negation marker — try “Pranav moved to Pune” — can still slip past this heuristic.`,
      });
    }
  }

  function handleSearch(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const results = searchMemories(store, trimmed, 5);
    setHits(results);
    setLastQuery(trimmed);
    setLastAction(`searched “${trimmed}”`);
    setFocusId(results[0]?.memory.id ?? null);
    setTab(0);

    const top = results[0];
    setExplanation({
      tone: "note",
      title: "Ranked by relevance, not raw similarity",
      body: top
        ? `“${trimmed}” returned ${results.length} active memories. The top hit is “${top.memory.content}” at ` +
          `relevance ${top.relevance_score.toFixed(3)} = similarity ${top.similarity.toFixed(3)} × decay ` +
          `${decayFactor(top.age_days).toFixed(3)} × importance ${importanceWeight(top.memory.importance).toFixed(2)}.`
        : `“${trimmed}” matched nothing — the store is empty or every memory is soft-deleted.`,
    });
  }

  function handleNeighbours(memory: PlaygroundMemory) {
    setQuery(memory.content);
    handleSearch(memory.content);
    setExplanation({
      tone: "note",
      title: "Neighbours of the memory you picked",
      body:
        `Recall ranks the whole store against “${memory.content}”. The memory itself is the natural top hit; the ` +
        `rest are its nearest neighbours, ordered by relevance.`,
    });
  }

  function handleResolve(contradiction: PlaygroundContradiction, winner: PlaygroundMemory) {
    const next = resolveContradiction(store, contradiction.id, winner.id);
    setStore(next);
    if (lastQuery) setHits(searchMemories(next, lastQuery, 5));
    const loser =
      winner.id === contradiction.new_memory.id
        ? contradiction.existing_memory
        : contradiction.new_memory;
    setLastAction(`resolved — kept “${winner.content}”`);
    setExplanation({
      tone: "ok",
      title: "Resolved — the loser was soft-deleted",
      body:
        `Kept “${winner.content}”. “${loser.content}” is now is_active = false, so it drops out of recall and ` +
        `listings while its row stays in the table. Nothing is ever hard-deleted; the audit trail survives.`,
    });
  }

  function handleReset() {
    setStore(initialPlaygroundState());
    setContent("Pranav lives in Bengaluru");
    setImportance(4);
    setQuery(EXAMPLE_QUERIES[0]);
    setHits(null);
    setLastQuery(null);
    setFocusId(null);
    setView("list");
    setTab(0);
    setLastAction(null);
    setExplanation(INITIAL_EXPLANATION);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
      {/* ------------------------------- toolbar ------------------------------- */}
      <div className="flex items-center gap-3 border-b border-line bg-[#FCFCFB] px-4 py-3 sm:px-5">
        <span className="grid h-6 w-6 place-items-center rounded-md border border-line bg-white text-accent-ink">
          <Database className="h-3.5 w-3.5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink">
            mnemo · memory console
          </p>
          <p className="mt-0.5 truncate font-mono text-[10.5px] text-faint">
            namespace playground · {activeMemories.length} active ·{" "}
            {openConflicts.length} open
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink hover:bg-black/[0.03]"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(272px,308px)_minmax(0,1fr)]">
        {/* -------------------------------- rail -------------------------------- */}
        <div className="border-b border-line bg-[#FCFCFB] lg:border-b-0 lg:border-r">
          <div className="border-b border-line p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-accent-ink" strokeWidth={2} />
              <h2 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
                Store a memory
              </h2>
            </div>

            <label htmlFor="mc-content" className="sr-only">
              Memory content
            </label>
            <textarea
              id="mc-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  handleAdd(content, importance);
                }
              }}
              rows={2}
              placeholder="A fact an agent should remember…"
              className="mt-3 w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] leading-snug text-ink outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {EXAMPLE_MEMORIES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setContent(example)}
                  className="max-w-full truncate rounded-full border border-line bg-white px-2.5 py-1 font-mono text-[10.5px] text-muted transition-colors hover:border-faint/40 hover:text-ink"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                importance
              </span>
              <span className="font-mono text-[10.5px] text-ink">
                {importance} / 5 · {IMPORTANCE_LABELS[importance]}
              </span>
            </div>
            <div className="mt-2 flex gap-1" role="group" aria-label="Importance, 1 to 5">
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = importance === n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setImportance(n)}
                    className={`h-8 flex-1 rounded-md border font-mono text-[12px] tabular-nums transition-colors ${
                      selected
                        ? "border-accent bg-accent-soft font-medium text-accent-ink"
                        : "border-line bg-white text-muted hover:text-ink"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-faint">
              weight ×{importanceWeight(importance).toFixed(2)} · band 0.90–1.10
            </p>

            <button
              type="button"
              onClick={() => handleAdd(content, importance)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-2.5 text-[13px] font-medium text-[#FAFAFA] shadow-[0_1px_2px_rgba(10,10,15,0.10),inset_0_1px_0_rgba(255,255,255,0.10)] transition-colors hover:bg-[#27272A]"
            >
              Store memory
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          {/* store list */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
                Memory store
              </h2>
              <span className="font-mono text-[10.5px] text-faint">
                {activeMemories.length}/{store.memories.length}
              </span>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
              Select a memory to recall its neighbours.
            </p>

            <ul className="mt-3 flex flex-col gap-1.5 lg:max-h-[300px] lg:overflow-y-auto lg:pr-1">
              {store.memories.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => handleNeighbours(m)}
                    className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                      focusId === m.id
                        ? "border-accent/45 bg-accent-soft/60"
                        : "border-transparent hover:border-line hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          m.is_active ? "bg-accent" : "bg-faint/50"
                        }`}
                      />
                      <span
                        className={`min-w-0 flex-1 text-[12px] leading-snug ${
                          m.is_active ? "text-ink" : "text-faint line-through"
                        }`}
                      >
                        {m.content}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 pl-3.5">
                      <Pips value={m.importance} muted={!m.is_active} />
                      <span className="font-mono text-[10px] text-faint">
                        imp {m.importance}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-faint">
                        {m.age_days}d
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* -------------------------------- panes -------------------------------- */}
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center border-b border-line pr-2 sm:pr-3">
            <div
              role="tablist"
              aria-label="Playground tools"
              onKeyDown={onKeyDown}
              className="flex gap-1 px-2 sm:px-3"
            >
              {TABS.map((label, i) => {
                const selected = tab === i;
                return (
                  <button
                    key={label}
                    ref={register(i)}
                    id={`mc-tab-${i}`}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls={`mc-panel-${i}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(i as TabIndex)}
                    className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors ${
                      selected
                        ? "border-accent text-ink"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {label}
                    {i === 0 && hits && (
                      <span className="rounded-full bg-accent-soft px-1.5 py-px font-mono text-[10px] tabular-nums text-accent-ink">
                        {hits.length}
                      </span>
                    )}
                    {i === 2 && openConflicts.length > 0 && (
                      <span className="rounded-full bg-[#FFFBEB] px-1.5 py-px font-mono text-[10px] tabular-nums text-[#B45309]">
                        {openConflicts.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {tab === 0 && (
              <div className="ml-auto flex items-center">
                <ViewToggle view={view} onChange={setView} />
              </div>
            )}
          </div>

          {/* ------------------------------ recall ------------------------------ */}
          <Panel index={0} tab={tab}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
                  strokeWidth={2}
                />
                <label htmlFor="mc-query" className="sr-only">
                  Recall query
                </label>
                <input
                  id="mc-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch(query);
                  }}
                  className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-[13px] text-ink outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearch(query)}
                className="shrink-0 rounded-lg bg-[#18181B] px-4 py-2.5 text-[13px] font-medium text-[#FAFAFA] transition-colors hover:bg-[#27272A]"
              >
                Recall
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleSearch(example)}
                  className="rounded-full border border-line bg-white px-2.5 py-1 font-mono text-[10.5px] text-muted transition-colors hover:border-faint/40 hover:text-ink"
                >
                  {example}
                </button>
              ))}
            </div>

            {view === "map" && hits ? (
              <div className="mt-6">
                <MemoryOrbit
                  hits={hits}
                  query={lastQuery ?? query}
                  focusId={focusId}
                  onFocusChange={setFocusId}
                />
              </div>
            ) : (
              <RecallList hits={hits} focusId={focusId} onFocus={setFocusId} />
            )}
          </Panel>

          {/* ------------------------------ ranking ----------------------------- */}
          <Panel index={1} tab={tab}>
            <RankingPane />
          </Panel>

          {/* ----------------------------- conflicts ---------------------------- */}
          <Panel index={2} tab={tab}>
            <ConflictsPane
              contradictions={store.contradictions}
              activeById={activeById}
              onResolve={handleResolve}
              onTryExample={() => handleAdd(EXAMPLE_MEMORIES[1], 4)}
            />
          </Panel>
        </div>
      </div>

      {/* -------------------------------- readout -------------------------------- */}
      <div
        className={`flex items-start gap-3 border-t border-line px-4 py-3.5 sm:px-5 ${
          explanation.tone === "warn"
            ? "bg-[#FFFBEB]"
            : explanation.tone === "ok"
              ? "bg-[#F0FDF4]"
              : "bg-[#FCFCFB]"
        }`}
      >
        <span className="mt-0.5 shrink-0">
          {explanation.tone === "warn" ? (
            <TriangleAlert className="h-4 w-4 text-[#B45309]" strokeWidth={2} />
          ) : explanation.tone === "ok" ? (
            <Check className="h-4 w-4 text-[#15803D]" strokeWidth={2.5} />
          ) : (
            <Sparkles className="h-4 w-4 text-accent-ink" strokeWidth={2} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-ink">{explanation.title}</p>
          <p className="mt-1 text-[12.5px] leading-[1.65] text-muted">
            {explanation.body}
          </p>
        </div>
        {lastAction && (
          <p className="hidden shrink-0 pt-0.5 font-mono text-[10.5px] text-faint lg:block">
            {lastAction}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Pieces                                                                    */
/* ------------------------------------------------------------------------ */

function Panel({
  index,
  tab,
  children,
}: {
  index: TabIndex;
  tab: TabIndex;
  children: React.ReactNode;
}) {
  const selected = tab === index;
  return (
    <div
      role="tabpanel"
      id={`mc-panel-${index}`}
      aria-labelledby={`mc-tab-${index}`}
      tabIndex={0}
      hidden={!selected}
      className="min-w-0 flex-1 p-4 focus-visible:outline-none sm:p-5"
    >
      {children}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "list" | "map";
  onChange: (view: "list" | "map") => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-line bg-white p-0.5">
      {(["list", "map"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={`rounded-[6px] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${
            view === v ? "bg-ink text-white" : "text-muted hover:text-ink"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function Pips({ value, muted }: { value: number; muted?: boolean }) {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-2.5 w-[3px] rounded-full ${
            n <= value ? (muted ? "bg-faint/40" : "bg-accent/70") : "bg-line"
          }`}
        />
      ))}
    </span>
  );
}

function RecallList({
  hits,
  focusId,
  onFocus,
}: {
  hits: SearchHit[] | null;
  focusId: string | null;
  onFocus: (id: string) => void;
}) {
  if (!hits) {
    return (
      <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-line py-14 text-center">
        <Search className="h-5 w-5 text-faint" strokeWidth={1.6} />
        <p className="mt-3 max-w-[320px] text-[13px] leading-relaxed text-muted">
          Run a query to see what recall returns, with the raw similarity and the
          full ranking breakdown for each hit.
        </p>
      </div>
    );
  }

  if (hits.length === 0) {
    return (
      <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-line py-14 text-center">
        <p className="text-[13px] text-muted">
          No active memories matched that query.
        </p>
      </div>
    );
  }

  const top = hits[0].relevance_score || 1;

  return (
    <ul className="mt-5 flex flex-col gap-2.5">
      {hits.map((hit, i) => {
        const decay = decayFactor(hit.age_days);
        const weight = importanceWeight(hit.memory.importance);
        const selected = focusId === hit.memory.id;
        return (
          <li key={hit.memory.id}>
            <button
              type="button"
              onMouseEnter={() => onFocus(hit.memory.id)}
              onFocus={() => onFocus(hit.memory.id)}
              onClick={() => onFocus(hit.memory.id)}
              className={`w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${
                selected ? "border-accent/45 bg-accent-soft/40" : "border-line bg-white hover:bg-[#FCFCFB]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-[11px] tabular-nums text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-snug text-ink">
                    {hit.memory.content}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[10.5px] text-muted">
                    <span>sim {hit.similarity.toFixed(3)}</span>
                    <span>decay {decay.toFixed(3)}</span>
                    <span>importance ×{weight.toFixed(2)}</span>
                    <span>age {hit.age_days}d</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-300"
                        style={{
                          width: `${Math.min(100, (hit.relevance_score / top) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-[11px] font-semibold tabular-nums text-ink">
                      {hit.relevance_score.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------- ranking -------------------------------- */

interface RankParams {
  similarity: number;
  ageDays: number;
  importance: number;
}

const RANK_PRESETS: { label: string; a: RankParams; b: RankParams; note: string }[] = [
  {
    label: "Recency breaks a near-tie",
    a: { similarity: 0.85, ageDays: 400, importance: 5 },
    b: { similarity: 0.8, ageDays: 0, importance: 1 },
    note: "The fresher memory edges ahead because the two similarities are close. Decay reorders comparable matches — it does not decide alone.",
  },
  {
    label: "A clearly better match still wins",
    a: { similarity: 0.85, ageDays: 1000, importance: 1 },
    b: { similarity: 0.45, ageDays: 0, importance: 5 },
    note: "A stronger semantic match wins even at age 1000 days with the lowest importance and a floored decay factor. This invariant is pinned by backend/tests/test_core.py.",
  },
  {
    label: "The decay floor in effect",
    a: { similarity: 0.7, ageDays: 1000, importance: 3 },
    b: { similarity: 0.7, ageDays: 800, importance: 3 },
    note: "Both ages are past the point where decay hits its 0.7 floor, so both decay factors are identical (0.700) and the scores tie.",
  },
];

function rankScore(p: RankParams) {
  return {
    decay: decayFactor(p.ageDays),
    weight: importanceWeight(p.importance),
    relevance: p.similarity * decayFactor(p.ageDays) * importanceWeight(p.importance),
  };
}

function RankingPane() {
  const [a, setA] = useState<RankParams>(RANK_PRESETS[0].a);
  const [b, setB] = useState<RankParams>(RANK_PRESETS[0].b);
  const [note, setNote] = useState(RANK_PRESETS[0].note);

  const sa = rankScore(a);
  const sb = rankScore(b);
  const winner = sa.relevance === sb.relevance ? "tie" : sa.relevance > sb.relevance ? "A" : "B";

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-x-auto rounded-lg border border-line bg-[#FCFCFB] px-3.5 py-2.5 font-mono text-[11.5px] text-ink">
        relevance = similarity × max({DECAY_FLOOR}, 0.5^(age / {DECAY_HALF_LIFE_DAYS})) ×
        (1 + (importance − 3) × 0.05)
      </div>

      <div className="flex flex-wrap gap-1.5">
        {RANK_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setA(preset.a);
              setB(preset.b);
              setNote(preset.note);
            }}
            className="rounded-full border border-line bg-white px-2.5 py-1 font-mono text-[10.5px] text-muted transition-colors hover:border-faint/40 hover:text-ink"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <RankControls name="Memory A" params={a} onChange={setA} accent="bg-accent" />
          <RankControls
            name="Memory B"
            params={b}
            onChange={setB}
            accent="bg-faint/50"
          />

          <div className="rounded-xl border border-line bg-white px-4 py-3.5">
            <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
              <span className="text-faint">ranks first</span>
              <span className="text-right font-semibold text-ink">
                {winner === "tie"
                  ? "A = B (tie)"
                  : `${winner} — ${(winner === "A" ? sa.relevance : sb.relevance).toFixed(3)} vs ${(
                      winner === "A" ? sb.relevance : sa.relevance
                    ).toFixed(3)}`}
              </span>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-[1.65] text-muted">{note}</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4">
          <h3 className="text-[13.5px] font-medium text-ink">Decay of Memory A</h3>
          <p className="mt-1 font-mono text-[10.5px] text-faint">
            age {a.ageDays} d → decay {sa.decay.toFixed(3)}
          </p>
          <div className="mt-3">
            <DecayCurve ageDays={a.ageDays} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-hairline pt-4 text-[12px]">
            <Spec label="half-life" value={`${DECAY_HALF_LIFE_DAYS} days`} />
            <Spec label="floor" value={`${DECAY_FLOOR} · penalty capped at 30%`} />
            <Spec label="importance band" value="0.90 – 1.10" />
            <Spec label="clamped?" value="no — relevance may exceed similarity" />
          </div>
        </div>
      </div>

      <p className="font-mono text-[10.5px] leading-[1.7] text-faint">
        The same function lives in backend/app/core/decay.py. None of these numbers came
        from a search; a real result also carries the raw cosine similarity and
        age returned by the API.
      </p>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
        {label}
      </div>
      <div className="mt-1 leading-snug text-ink">{value}</div>
    </div>
  );
}

function RankControls({
  name,
  params,
  onChange,
  accent,
}: {
  name: string;
  params: RankParams;
  onChange: (next: RankParams) => void;
  accent: string;
}) {
  const set = (patch: Partial<RankParams>) => onChange({ ...params, ...patch });
  return (
    <div className="rounded-xl border border-line bg-[#FCFCFB] px-4 py-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        <h4 className="text-[13px] font-medium text-ink">{name}</h4>
      </div>

      <SliderRow label="similarity" value={params.similarity.toFixed(2)}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={params.similarity}
          onChange={(e) => set({ similarity: Number(e.target.value) })}
          className="w-full accent-[#4F46E5]"
          aria-label={`${name} similarity`}
        />
      </SliderRow>

      <SliderRow label="age" value={`${params.ageDays} d`}>
        <input
          type="range"
          min={0}
          max={1000}
          step={5}
          value={Math.min(1000, params.ageDays)}
          onChange={(e) => set({ ageDays: Number(e.target.value) })}
          className="w-full accent-[#4F46E5]"
          aria-label={`${name} age in days`}
        />
      </SliderRow>

      <SliderRow label="importance" value={`${params.importance} / 5`}>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={params.importance}
          onChange={(e) => set({ importance: Number(e.target.value) })}
          className="w-full accent-[#4F46E5]"
          aria-label={`${name} importance`}
        />
      </SliderRow>

      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-hairline pt-3 font-mono text-[10.5px]">
        <div>
          <div className="text-faint">decay</div>
          <div className="mt-0.5 tabular-nums text-ink">
            {rankScore(params).decay.toFixed(3)}
          </div>
        </div>
        <div>
          <div className="text-faint">weight</div>
          <div className="mt-0.5 tabular-nums text-ink">
            {rankScore(params).weight.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-faint">relevance</div>
          <div className="mt-0.5 font-semibold tabular-nums text-ink">
            {rankScore(params).relevance.toFixed(3)}
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
          {label}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-ink">{value}</span>
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function DecayCurve({ ageDays }: { ageDays: number }) {
  const { points, markerX, markerY } = useMemo(() => {
    const maxAge = 1000;
    const pts: string[] = [];
    for (let age = 0; age <= maxAge; age += 10) {
      const x = 24 + (age / maxAge) * (424 - 24);
      const y = 20 + (1 - decayFactor(age)) * (170 - 20);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const clamped = Math.min(maxAge, ageDays);
    const x = 24 + (clamped / maxAge) * (424 - 24);
    const y = 20 + (1 - decayFactor(ageDays)) * (170 - 20);
    return { points: pts.join(" "), markerX: x, markerY: y };
  }, [ageDays]);

  return (
    <svg
      viewBox="0 0 440 200"
      className="h-auto w-full"
      role="img"
      aria-label={`Decay curve with a 180-day half-life floored at 0.7; the marker sits at ${ageDays} days`}
    >
      <line x1="24" y1="170" x2="424" y2="170" stroke="#E5E5E5" strokeWidth="1" />
      <line x1="24" y1="20" x2="24" y2="170" stroke="#E5E5E5" strokeWidth="1" />
      <line x1="24" y1="20" x2="424" y2="20" stroke="#F1F1EF" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="24" y1="132.5" x2="424" y2="132.5" stroke="#4F46E5" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <text x="28" y="16" fontSize="10.5" fontFamily="monospace" fill="#9CA3AF">1.0</text>
      <text x="378" y="128" fontSize="10.5" fontFamily="monospace" fill="#4F46E5">floor 0.7</text>
      <polyline points={points} fill="none" stroke="#0A0A0F" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="156" y1="20" x2="156" y2="170" stroke="#E5E5E5" strokeWidth="1" strokeDasharray="3 3" />
      <text x="150" y="186" fontSize="10" fontFamily="monospace" fill="#9CA3AF" textAnchor="middle">180d</text>
      <line x1={markerX} y1={markerY} x2={markerX} y2="170" stroke="#4F46E5" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      <circle cx={markerX} cy={markerY} r="4" fill="#4F46E5" />
    </svg>
  );
}

/* ------------------------------ conflicts ------------------------------- */

function ConflictsPane({
  contradictions,
  activeById,
  onResolve,
  onTryExample,
}: {
  contradictions: PlaygroundContradiction[];
  activeById: Map<string, boolean>;
  onResolve: (contradiction: PlaygroundContradiction, winner: PlaygroundMemory) => void;
  onTryExample: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {contradictions.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line py-12 text-center">
          <ShieldCheck className="h-5 w-5 text-faint" strokeWidth={1.6} />
          <p className="mt-3 max-w-[360px] text-[13px] leading-relaxed text-muted">
            No conflicts yet. Store a fact that negates an existing one — the
            console will flag it here rather than overwrite anything.
          </p>
          <button
            type="button"
            onClick={onTryExample}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-black/[0.03]"
          >
            Try: “Pranav no longer lives in Bengaluru”
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {contradictions.map((c) => {
            const open = c.status === "open";
            return (
              <li key={c.id} className="rounded-xl border border-line bg-white px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      open
                        ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                        : "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        open ? "bg-[#F59E0B]" : "bg-[#22C55E]"
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

                {open ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onResolve(c, c.new_memory)}
                      className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-black/[0.03]"
                    >
                      Keep new
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolve(c, c.existing_memory)}
                      className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-black/[0.03]"
                    >
                      Keep existing
                    </button>
                    <span className="font-mono text-[10.5px] text-faint">
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
            );
          })}
        </ul>
      )}

      <HeuristicChecker />
    </div>
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
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
          {label}
        </span>
        {inactive && (
          <span className="font-mono text-[10px] text-[#B45309]">soft-deleted</span>
        )}
      </div>
      <p
        className={`mt-1 text-[12.5px] leading-snug ${
          inactive ? "text-faint line-through" : "text-ink"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

function HeuristicChecker() {
  const [existing, setExisting] = useState("Pranav lives in Bengaluru");
  const [incoming, setIncoming] = useState("Pranav no longer lives in Bengaluru");
  const [similarity, setSimilarity] = useState(0.93);

  const verdict = checkContradiction(incoming, existing, similarity);
  const gatePassed = similarity >= CONTRADICTION_SIM_THRESHOLD;

  return (
    <div className="rounded-xl border border-line bg-[#FCFCFB] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
          Test the heuristic
        </h3>
        <span className="font-mono text-[10.5px] text-faint">
          backend/app/core/contradiction.py, in the browser
        </span>
      </div>

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="mc-existing"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint"
            >
              existing memory
            </label>
            <input
              id="mc-existing"
              value={existing}
              onChange={(e) => setExisting(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] text-ink outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </div>
          <div>
            <label
              htmlFor="mc-incoming"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint"
            >
              incoming memory
            </label>
            <input
              id="mc-incoming"
              value={incoming}
              onChange={(e) => setIncoming(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] text-ink outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="mc-sim"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint"
              >
                cosine similarity
              </label>
              <span className="font-mono text-[11px] tabular-nums text-ink">
                {similarity.toFixed(2)} · gate {CONTRADICTION_SIM_THRESHOLD}
              </span>
            </div>
            <input
              id="mc-sim"
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

        <div className="rounded-xl border border-line bg-white p-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium ${
              verdict.isContradiction
                ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                : "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
            }`}
          >
            {verdict.isContradiction ? (
              <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2.2} />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
            )}
            {verdict.isContradiction ? "flagged" : "not flagged"}
          </span>

          <div className="mt-4 flex flex-col gap-2.5">
            <Stage
              index="1"
              label="Similarity gate"
              state={gatePassed ? "pass" : "stop"}
              body={
                gatePassed
                  ? `similarity ${similarity.toFixed(2)} ≥ ${CONTRADICTION_SIM_THRESHOLD}`
                  : `similarity ${similarity.toFixed(2)} < ${CONTRADICTION_SIM_THRESHOLD} — stops here`
              }
            />
            <Stage
              index="2"
              label="Negation check"
              state={!gatePassed ? "muted" : verdict.isContradiction ? "pass" : "stop"}
              body={
                gatePassed
                  ? verdict.reason
                  : "not reached — the gate already rejected this pair"
              }
            />
          </div>

          <p className="mt-4 border-t border-hairline pt-3.5 text-[11.5px] leading-[1.7] text-faint">
            A flag only says two memories look like opposites about one subject. It
            does not establish which is true, and the marker list is small and
            English-only — the default is high-precision, not an oracle.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stage({
  index,
  label,
  state,
  body,
}: {
  index: string;
  label: string;
  state: "pass" | "stop" | "muted";
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-line bg-[#FCFCFB] px-3.5 py-2.5">
      <span className="pt-0.5 font-mono text-[10.5px] text-faint">{index}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium text-ink">{label}</span>
          {state !== "muted" && (
            <span
              className={`font-mono text-[10px] ${
                state === "pass" ? "text-[#15803D]" : "text-[#B45309]"
              }`}
            >
              {state === "pass" ? "✓" : "stop"}
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-[10.5px] leading-[1.65] text-muted">
          {body}
        </p>
      </div>
    </div>
  );
}
