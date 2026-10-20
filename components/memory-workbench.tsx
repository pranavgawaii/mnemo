"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Play,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
} from "lucide-react";
import {
  DECAY_FLOOR,
  DECAY_HALF_LIFE_DAYS,
  decayFactor,
  importanceWeight,
  relevanceScore,
} from "../lib/mnemo";
import {
  EXAMPLE_QUERIES,
  addMemory,
  illustrativeSimilarity,
  initialPlaygroundState,
  resolveContradiction,
  type PlaygroundState,
} from "../lib/playground";
import { ConflictCard } from "./workbench/conflict-card";
import { Field } from "./workbench/field";
import { CENTER, IMPORTANCE_LABELS, TRACKS, stableHash } from "./workbench/layout";
import { Metric } from "./workbench/metric";
import type { LogEntry, Method, Mode, Row } from "./workbench/types";

/**
 * The playground workbench.
 *
 * One surface, everything live. A spatial field places every active memory
 * around the query: distance is the match, size is importance, fade is age. The
 * controls underneath and beside it all move that picture:
 *
 *   - typing a query re-scores every memory and the nodes glide to new orbits
 *   - the time slider ages the whole store, so decay reorders the list
 *   - the mode switch swaps raw similarity for the composite relevance score
 *   - storing a fact adds a node, and a negating one draws a conflict arc
 *   - resolving a conflict strikes the loser out of recall but keeps the row
 *
 * Every number comes from `lib/mnemo.ts`, the exact port of the backend. The
 * similarity stand-in is labelled where it matters. Nothing leaves the tab.
 */

const INITIAL_LOGS: LogEntry[] = [
  { id: 2, method: "POST", path: "/v1/memories/search", status: 200, detail: "5 hits" },
  { id: 1, method: "GET", path: "/v1/memories", status: 200, detail: "6 rows" },
];

const AGE_PRESETS = [
  { label: "now", value: 0 },
  { label: "+6m", value: 180 },
  { label: "+1y", value: 365 },
  { label: "+3y", value: 1080 },
] as const;

export function MemoryWorkbench() {
  const [store, setStore] = useState<PlaygroundState>(() => initialPlaygroundState());
  const [query, setQuery] = useState<string>(EXAMPLE_QUERIES[0]);
  const [mode, setMode] = useState<Mode>("relevance");
  const [timeOffset, setTimeOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftImportance, setDraftImportance] = useState(3);
  const [pulseRank, setPulseRank] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [exploredSimilarity, setExploredSimilarity] = useState(false);
  const [agedThreeYears, setAgedThreeYears] = useState(false);

  const logSeq = useRef(INITIAL_LOGS.length + 1);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function pushLog(method: Method, path: string, status: number, detail: string) {
    const entry: LogEntry = { id: logSeq.current++, method, path, status, detail };
    setLogs((previous) => [entry, ...previous].slice(0, 5));
  }

  /* ----------------------------- scoring ----------------------------- */

  const rows = useMemo<Row[]>(() => {
    return store.memories
      .filter((memory) => memory.is_active)
      .map((memory) => {
        const similarity = illustrativeSimilarity(query, memory);
        const ageDays = memory.age_days + timeOffset;
        return {
          memory,
          similarity,
          ageDays,
          decay: decayFactor(ageDays),
          weight: importanceWeight(memory.importance),
          relevance: relevanceScore(similarity, ageDays, memory.importance),
        };
      });
  }, [store.memories, query, timeOffset]);

  const ranked = useMemo(() => {
    return [...rows].sort((a, b) =>
      mode === "relevance"
        ? b.relevance - a.relevance
        : b.similarity - a.similarity
    );
  }, [rows, mode]);

  const openConflicts = useMemo(
    () =>
      store.contradictions.filter(
        (row) =>
          row.status === "open" &&
          store.memories.some((m) => m.id === row.new_memory.id && m.is_active) &&
          store.memories.some((m) => m.id === row.existing_memory.id && m.is_active)
      ),
    [store]
  );

  const conflictedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of openConflicts) {
      ids.add(row.new_memory.id);
      ids.add(row.existing_memory.id);
    }
    return ids;
  }, [openConflicts]);

  const inactive = store.memories.filter((memory) => !memory.is_active);

  const topScore = ranked[0]
    ? mode === "relevance"
      ? ranked[0].relevance
      : ranked[0].similarity
    : 1;

  const quests = [
    { label: "Store a fact", done: store.memories.length > 6 },
    { label: "Open a conflict", done: store.contradictions.length > 0 },
    {
      label: "Settle one",
      done: store.contradictions.some((row) => row.status === "resolved"),
    },
    { label: "Age the store 3 years", done: agedThreeYears },
    { label: "Rank by raw similarity", done: exploredSimilarity },
  ];
  const questsDone = quests.filter((quest) => quest.done).length;

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const perRing = Math.max(1, Math.ceil(ranked.length / TRACKS.length));

    TRACKS.forEach((radius, ring) => {
      const from = ring * perRing;
      const slice =
        ring === TRACKS.length - 1
          ? ranked.slice(from)
          : ranked.slice(from, from + perRing);
      // Stable order within a ring so nodes do not jump when scores change.
      const ordered = [...slice].sort(
        (a, b) => stableHash(a.memory.id) - stableHash(b.memory.id)
      );
      const offset = -Math.PI / 2 + ring * 1.05;

      ordered.forEach((row, index) => {
        const angle =
          offset + (index / Math.max(1, ordered.length)) * Math.PI * 2;
        // One decimal keeps the server and the browser on the same string.
        // Trigonometry can differ in the last bits between the two runtimes,
        // which React reports as a hydration mismatch on the inline transform.
        map.set(row.memory.id, {
          x: Math.round((CENTER + Math.cos(angle) * radius) * 10) / 10,
          y: Math.round((CENTER + Math.sin(angle) * radius) * 10) / 10,
        });
      });
    });

    return map;
  }, [ranked]);

  const focus =
    rows.find((row) => row.memory.id === (hoverId ?? selectedId)) ?? ranked[0] ?? null;

  /* ----------------------------- actions ----------------------------- */

  function runRecall() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];

    if (ranked.length === 0) return;

    setScanning(true);
    const steps = Math.min(6, ranked.length);

    for (let index = 0; index < steps; index++) {
      timers.current.push(
        window.setTimeout(() => setPulseRank(index + 1), 120 + index * 190)
      );
    }

    timers.current.push(
      window.setTimeout(() => {
        setPulseRank(0);
        setScanning(false);
      }, 120 + steps * 190 + 520)
    );

    pushLog("POST", "/v1/memories/search", 200, `${ranked.length} scored`);
  }

  function handleStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    const result = addMemory(store, content, draftImportance);
    setStore(result.state);
    setDraft("");
    setSelectedId(result.memory.id);
    setHoverId(null);

    pushLog(
      "POST",
      "/v1/memories",
      201,
      result.contradictions.length > 0
        ? `${result.contradictions.length} conflict`
        : "stored"
    );
  }

  function keep(contradictionId: string, winnerId: string) {
    const conflict = store.contradictions.find((row) => row.id === contradictionId);
    const loserId = conflict
      ? conflict.new_memory.id === winnerId
        ? conflict.existing_memory.id
        : conflict.new_memory.id
      : null;

    setStore((previous) => resolveContradiction(previous, contradictionId, winnerId));
    if (loserId && selectedId === loserId) setSelectedId(null);
    setHoverId(null);
    pushLog("POST", "/v1/contradictions/resolve", 200, "soft-deleted loser");
  }

  function setImportance(memoryId: string, importance: number) {
    setStore((previous) => ({
      ...previous,
      memories: previous.memories.map((memory) =>
        memory.id === memoryId ? { ...memory, importance } : memory
      ),
    }));
  }

  function reset() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setStore(initialPlaygroundState());
    setQuery(EXAMPLE_QUERIES[0]);
    setMode("relevance");
    setTimeOffset(0);
    setSelectedId(null);
    setHoverId(null);
    setDraft("");
    setDraftImportance(3);
    setPulseRank(0);
    setScanning(false);
    setExploredSimilarity(false);
    setAgedThreeYears(false);
    logSeq.current = INITIAL_LOGS.length + 1;
    setLogs(INITIAL_LOGS);
  }

  /* ------------------------------ render ----------------------------- */

  return (
    <section
      id="workbench"
      className="mx-auto w-full max-w-frame scroll-mt-20 px-4 pb-20 pt-6 sm:px-6"
    >
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        {/* status bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-[#FCFCFB] px-4 py-3">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink">
            mnemo workbench
          </span>
          <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.14em] text-faint sm:inline">
            in-browser · no network
          </span>

          <div className="flex w-full items-center justify-between gap-3 font-mono text-[10px] text-faint sm:ml-auto sm:w-auto sm:justify-start">
            <span className="tabular-nums">{rows.length} active</span>
            <span className="h-3 w-px bg-line" />
            <span
              className={`tabular-nums ${
                openConflicts.length > 0 ? "text-[#B45309]" : ""
              }`}
            >
              {openConflicts.length} open
            </span>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1 text-[10.5px] text-muted transition-colors hover:text-ink"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.9} />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* -------------------------- left: field ------------------------- */}
          <div className="min-w-0">
            <div className="border-b border-line p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
                    strokeWidth={2}
                  />
                  <label htmlFor="wb-query" className="sr-only">
                    Recall query
                  </label>
                  <input
                    id="wb-query"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ask the store something..."
                    className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                  />
                </div>

                <button
                  type="button"
                  onClick={runRecall}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-ink"
                >
                  <Play className="h-3.5 w-3.5" strokeWidth={2} />
                  Run recall
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {EXAMPLE_QUERIES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setQuery(example)}
                    className={`rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                      query === example
                        ? "border-accent/45 bg-accent-soft text-accent-ink"
                        : "border-line bg-white text-muted hover:border-faint/40 hover:text-ink"
                    }`}
                  >
                    {example}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Pick a random query"
                  onClick={() =>
                    setQuery(
                      EXAMPLE_QUERIES[
                        Math.floor(Math.random() * EXAMPLE_QUERIES.length)
                      ]
                    )
                  }
                  className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-faint transition-colors hover:text-ink"
                >
                  <Shuffle className="h-3 w-3" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="relative p-4">
              <Field
                rows={rows}
                ranked={ranked}
                positions={positions}
                conflicts={openConflicts}
                query={query}
                selectedId={selectedId}
                hoverId={hoverId}
                pulseRank={pulseRank}
                scanning={scanning}
                onSelect={setSelectedId}
                onHover={setHoverId}
              />

              <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                <span>inner ring · best match</span>
                <span>size · importance</span>
                <span>fade · age</span>
                <span className="text-[#B45309]">arc · conflict</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line bg-[#FCFCFB] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                  rank by
                </span>
                <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
                  {(["relevance", "similarity"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={mode === option}
                      onClick={() => {
                        setMode(option);
                        if (option === "similarity") setExploredSimilarity(true);
                      }}
                      className={`rounded-md px-2 py-1 font-mono text-[10px] transition-colors ${
                        mode === option
                          ? "bg-accent-soft text-accent-ink"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex min-w-[220px] flex-1 items-center gap-2">
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                  age
                </span>
                <input
                  type="range"
                  min={0}
                  max={1080}
                  step={15}
                  value={timeOffset}
                  aria-label="Advance time for every memory, in days"
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setTimeOffset(value);
                    if (value >= 1080) setAgedThreeYears(true);
                  }}
                  className="h-1.5 w-full min-w-[80px] cursor-pointer appearance-none rounded-full bg-line accent-[#4F46E5]"
                />
                <span className="w-[52px] shrink-0 text-right font-mono text-[10.5px] tabular-nums text-ink">
                  +{timeOffset}d
                </span>
              </div>

              <div className="flex items-center gap-1">
                {AGE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={timeOffset === preset.value}
                    onClick={() => {
                      setTimeOffset(preset.value);
                      if (preset.value >= 1080) setAgedThreeYears(true);
                    }}
                    className={`rounded-md border px-1.5 py-1 font-mono text-[9.5px] transition-colors ${
                      timeOffset === preset.value
                        ? "border-accent/45 bg-accent-soft text-accent-ink"
                        : "border-line bg-white text-muted hover:text-ink"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ------------------------- right: recall ------------------------ */}
          <aside className="flex min-h-0 min-w-0 flex-col border-t border-line lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
                recall
              </span>
              <span className="font-mono text-[9px] text-faint">
                {mode === "relevance"
                  ? "sim × decay × importance"
                  : "raw similarity"}
              </span>
            </div>

            <ol className="min-h-0 flex-1 overflow-y-auto p-2 lg:max-h-[330px]">
              {ranked.map((row, index) => {
                const rank = index + 1;
                const selected = selectedId === row.memory.id;
                const pulsing = pulseRank === rank;
                const score = mode === "relevance" ? row.relevance : row.similarity;

                return (
                  <li key={row.memory.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.memory.id)}
                      onMouseEnter={() => setHoverId(row.memory.id)}
                      onMouseLeave={() => setHoverId(null)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        selected
                          ? "bg-accent-soft/70"
                          : pulsing
                            ? "bg-accent-soft/40"
                            : "hover:bg-[#F7F7F5]"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10px] tabular-nums transition-colors ${
                          selected || pulsing
                            ? "bg-accent text-white"
                            : "border border-line bg-white text-faint"
                        }`}
                      >
                        {rank}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">
                            {row.memory.content}
                          </span>
                          {conflictedIds.has(row.memory.id) && (
                            <AlertTriangle
                              className="h-3 w-3 shrink-0 text-[#B45309]"
                              strokeWidth={2}
                            />
                          )}
                        </span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-hairline">
                          <span
                            className={`block h-full rounded-full transition-[width] duration-500 ${
                              selected || pulsing ? "bg-accent" : "bg-ink/25"
                            }`}
                            style={{
                              width: `${Math.max(
                                4,
                                Math.min(
                                  100,
                                  Math.pow(score / (topScore || 1), 0.6) * 100
                                )
                              )}%`,
                            }}
                          />
                        </span>
                      </span>

                      <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-muted">
                        {score.toFixed(3)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {focus && (
              <div className="border-t border-line bg-white px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                    {selectedId ? "selected" : "top match"}
                  </span>
                  <span className="ml-auto font-mono text-[9.5px] tabular-nums text-faint">
                    age {focus.ageDays}d
                  </span>
                </div>

                <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-ink">
                  {focus.memory.content}
                </p>

                <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 sm:gap-2">
                  <Metric
                    label="sim"
                    value={focus.similarity}
                    display={focus.similarity.toFixed(2)}
                  />
                  <Metric
                    label="decay"
                    value={(focus.decay - DECAY_FLOOR) / (1 - DECAY_FLOOR)}
                    display={focus.decay.toFixed(2)}
                  />
                  <Metric
                    label="weight"
                    value={(focus.weight - 0.9) / 0.2}
                    display={`×${focus.weight.toFixed(2)}`}
                  />
                  <Metric
                    label="rel"
                    value={focus.relevance / (topScore || 1)}
                    display={focus.relevance.toFixed(2)}
                    accent
                  />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                      imp
                    </span>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={focus.memory.importance === value}
                        aria-label={`Set importance to ${value}, ${IMPORTANCE_LABELS[value - 1]}`}
                        onClick={() => setImportance(focus.memory.id, value)}
                        className={`h-5 w-5 rounded border font-mono text-[9.5px] tabular-nums transition-colors ${
                          focus.memory.importance === value
                            ? "border-accent bg-accent-soft font-medium text-accent-ink"
                            : "border-line bg-white text-muted hover:text-ink"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuery(focus.memory.content)}
                    className="inline-flex items-center gap-1 font-mono text-[9.5px] text-accent-ink transition-colors hover:text-ink"
                  >
                    use as query
                    <ArrowRight className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {openConflicts.length > 0 && (
              <div className="border-t border-[#FDE68A] bg-[#FFFBEB]/70 px-3 py-2.5">
                <div className="flex items-center gap-1.5 px-0.5">
                  <AlertTriangle className="h-3 w-3 text-[#B45309]" strokeWidth={2.2} />
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#B45309]">
                    conflict · pick a winner
                  </span>
                </div>

                <div className="mt-1.5 flex max-h-[168px] flex-col gap-1.5 overflow-y-auto">
                  {openConflicts.map((conflict) => (
                    <ConflictCard
                      key={conflict.id}
                      conflict={conflict}
                      onResolve={keep}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-line px-3.5 py-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                  quests
                </span>
                <span className="font-mono text-[9px] tabular-nums text-faint">
                  {questsDone}/{quests.length}
                </span>
              </div>

              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-hairline">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${(questsDone / quests.length) * 100}%` }}
                />
              </div>

              <ul className="mt-2 flex flex-col gap-1">
                {quests.map((quest) => (
                  <li
                    key={quest.label}
                    className={`flex items-center gap-2 text-[10.5px] ${
                      quest.done ? "text-faint line-through" : "text-muted"
                    }`}
                  >
                    <span
                      className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border ${
                        quest.done
                          ? "border-accent bg-accent text-white"
                          : "border-line bg-white"
                      }`}
                    >
                      {quest.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    </span>
                    {quest.label}
                  </li>
                ))}
              </ul>

              {questsDone === quests.length && (
                <p className="mt-1.5 font-mono text-[9px] text-accent-ink">
                  all clear · reset to run it again
                </p>
              )}
            </div>

            {inactive.length > 0 && (
              <div className="border-t border-line px-3.5 py-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                  soft-deleted · {inactive.length}
                </span>
                {inactive.map((memory) => (
                  <p
                    key={memory.id}
                    className="mt-0.5 truncate text-[10.5px] text-faint line-through"
                  >
                    {memory.content}
                  </p>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* --------------------------- composer --------------------------- */}
        <form
          onSubmit={handleStore}
          className="flex flex-col gap-2.5 border-t border-line bg-[#FCFCFB] px-4 py-3 sm:flex-row sm:items-center"
        >
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            <Plus className="h-3 w-3" strokeWidth={2} />
            store
          </span>

          <label htmlFor="wb-store" className="sr-only">
            New memory
          </label>
          <input
            id="wb-store"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Pranav moved to Pune"
            className="h-9 flex-1 rounded-lg border border-line bg-white px-3 text-[12.5px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          />

          <div className="flex items-center gap-1">
            <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
              imp
            </span>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={draftImportance === value}
                aria-label={`Importance ${value}, ${IMPORTANCE_LABELS[value - 1]}`}
                onClick={() => setDraftImportance(value)}
                className={`h-6 w-6 rounded border font-mono text-[10px] tabular-nums transition-colors ${
                  draftImportance === value
                    ? "border-accent bg-accent-soft font-medium text-accent-ink"
                    : "border-line bg-white text-muted hover:text-ink"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!draft.trim()}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 text-[12px] font-medium text-white transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:bg-[#ECECEE] disabled:text-faint"
          >
            Store memory
          </button>
        </form>

        {/* ----------------------------- wire ----------------------------- */}
        <div className="flex items-center gap-3 overflow-x-auto border-t border-line bg-[#FCFCFB] px-4 py-2 font-mono text-[10px] text-muted [mask-image:linear-gradient(to_right,#000_88%,transparent)] sm:[mask-image:none]">
          <span className="shrink-0 uppercase tracking-[0.16em] text-faint">
            wire
          </span>
          {logs.map((entry) => (
            <span key={entry.id} className="flex shrink-0 items-center gap-1.5">
              <span
                className={
                  entry.method === "GET" ? "text-[#1D4ED8]" : "text-[#047857]"
                }
              >
                {entry.method}
              </span>
              <span className="text-ink">{entry.path}</span>
              <span className={entry.status < 300 ? "text-[#15803D]" : "text-[#B45309]"}>
                {entry.status}
              </span>
              <span className="text-faint">{entry.detail}</span>
            </span>
          ))}
          <span className="ml-auto hidden shrink-0 text-faint lg:block">
            simulated
          </span>
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-faint">
        <span>scoring · exact backend port</span>
        <span>similarity · lexical stand-in</span>
        <span>half-life · {DECAY_HALF_LIFE_DAYS}d</span>
      </p>
    </section>
  );
}
