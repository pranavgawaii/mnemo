"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMemoryStore } from "@/hooks/use-memory-store";
import {
  decayFactor,
  importanceWeight,
  relevanceScore,
} from "@/lib/memory/scoring";
import {
  EXAMPLE_QUERIES,
  illustrativeSimilarity,
} from "@/lib/memory/simulation";
import { CENTER, TRACKS, stableHash } from "./layout";
import {
  MEMORY_SCENARIOS,
  type MemoryScenario,
  type ReviewOutcome,
} from "@/lib/memory/scenarios";
import type { LogEntry, Method, Mode, Row } from "./types";
import { recallMatches } from "./recall-matches";
import { scrollToElement } from "@/lib/scroll";

export type JourneyStage =
  | "recall"
  | "store"
  | "review"
  | "verify"
  | "complete";

export const AGE_PRESETS = [
  { label: "Now", value: 0 },
  { label: "+30d", value: 30 },
  { label: "+90d", value: 90 },
  { label: "+1y", value: 365 },
] as const;

export function useWorkbench() {
  const {
    store,
    openContradictions: openConflicts,
    add,
    resolve,
    reset: resetStore,
    setImportance: setMemoryImportance,
  } = useMemoryStore();
  const [query, setQuery] = useState<string>(EXAMPLE_QUERIES[0]);
  const [activeQuery, setActiveQuery] = useState<string>(EXAMPLE_QUERIES[0]);
  const [mode, setRankingMode] = useState<Mode>("relevance");
  const [timeOffset, setAgeOffset] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  type Snapshot = { id: string; rank: number; score: number }[];
  const [rankingUpdate, setRankingUpdate] = useState<{
    before: Snapshot;
    reason: string;
  } | null>(null);
  const timeBaseline = useRef<{ before: Snapshot; time: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [scenario, setScenario] = useState<MemoryScenario>(MEMORY_SCENARIOS[0]);
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome | null>(
    null,
  );
  const [pulseRank, setPulseRank] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [traceRun, setTraceRun] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const [journeyStage, setJourneyStage] = useState<JourneyStage>("recall");
  const [reviewVerified, setReviewVerified] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logSeq = useRef(1);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  useEffect(() => {
    if (reviewOutcome)
      (
        document.querySelector<HTMLElement>(
          "dialog[open] #change-feedback-expanded",
        ) ?? document.getElementById("change-feedback")
      )?.focus({ preventScroll: true });
  }, [reviewOutcome]);

  function pushLog(method: Method, path: string, detail: string) {
    setLogs((previous) =>
      [{ id: logSeq.current++, method, path, detail }, ...previous].slice(0, 5),
    );
  }
  const rows = useMemo<Row[]>(
    () =>
      store.memories
        .filter((memory) => memory.is_active)
        .map((memory) => {
          const similarity = illustrativeSimilarity(activeQuery, memory);
          const ageDays = memory.age_days + timeOffset;
          return {
            memory,
            similarity,
            ageDays,
            decay: decayFactor(ageDays),
            weight: importanceWeight(memory.importance),
            relevance: relevanceScore(similarity, ageDays, memory.importance),
          };
        }),
    [store.memories, activeQuery, timeOffset],
  );
  const ranked = useMemo(
    () =>
      [...rows].sort((a, b) =>
        mode === "relevance"
          ? b.relevance - a.relevance
          : b.similarity - a.similarity,
      ),
    [rows, mode],
  );
  const inactive = store.memories.filter((memory) => !memory.is_active);
  const rankChanges = useMemo(() => {
    if (!rankingUpdate) return [];
    const before = new Map(rankingUpdate.before.map((row) => [row.id, row]));
    return ranked.flatMap((row, index) => {
      const previous = before.get(row.memory.id);
      return previous
        ? [
            {
              id: row.memory.id,
              content: row.memory.content,
              from: previous.rank,
              to: index + 1,
              previousScore: previous.score,
              score: mode === "relevance" ? row.relevance : row.similarity,
              similarity: row.similarity,
            },
          ]
        : [];
    });
  }, [rankingUpdate, ranked, mode]);
  function snapshot(): Snapshot {
    return ranked.map((row, index) => ({
      id: row.memory.id,
      rank: index + 1,
      score: mode === "relevance" ? row.relevance : row.similarity,
    }));
  }
  function setMode(next: Mode) {
    if (next === mode) return;
    setRankingUpdate({
      before: snapshot(),
      reason:
        next === "similarity"
          ? "Similarity only: age and importance no longer affect the order."
          : "Base relevance: age and importance now weight similarity.",
    });
    setRankingMode(next);
  }
  function beginTimeAdjustment() {
    timeBaseline.current = { before: snapshot(), time: timeOffset };
  }
  function endTimeAdjustment() {
    timeBaseline.current = null;
  }
  function setTimeOffset(next: number) {
    if (next === timeOffset) return;
    const baseline = timeBaseline.current;
    setRankingUpdate({
      before: baseline?.before ?? snapshot(),
      reason: `Time: +${baseline?.time ?? timeOffset} → +${next} days. Decay changed; similarity and importance stayed the same.`,
    });
    setAgeOffset(next);
  }
  function setImportance(id: string, importance: number) {
    const memory = store.memories.find((item) => item.id === id);
    if (!memory || memory.importance === importance) return;
    setRankingUpdate({
      before: snapshot(),
      reason: `Importance: ${memory.importance}/5 → ${importance}/5. Similarity and age stayed the same.`,
    });
    setMemoryImportance(id, importance);
  }
  function inspectMemory(id: string) {
    setSelectedId(id);
    setHoverId(null);
    setInspectorOpen(true);
  }
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
        (a, b) => stableHash(a.memory.id) - stableHash(b.memory.id),
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

  function runRecall(example?: string) {
    const nextQuery = (example ?? query).trim();
    if (!nextQuery) {
      setNotice("Enter a question to recall a memory.");
      return;
    }
    if (example !== undefined) setQuery(nextQuery);
    setActiveQuery(nextQuery);
    if (reviewOutcome && nextQuery !== reviewOutcome.recall.query) {
      setReviewOutcome(null);
    }
    const verifying = journeyStage === "verify" || journeyStage === "complete";
    setJourneyStage(
      openConflicts.length
        ? "review"
        : verifying && nextQuery === activeQuery
          ? "complete"
          : "store",
    );
    setReviewVerified(
      Boolean(
        !openConflicts.length &&
          reviewOutcome &&
          nextQuery === reviewOutcome.recall.query,
      ),
    );
    setRankingUpdate(null);
    timeBaseline.current = null;
    setSelectedId(null);
    setHoverId(null);
    setTraceRun((run) => run + 1);
    setNotice(
      verifying && !openConflicts.length && nextQuery === activeQuery
        ? reviewOutcome
          ? "Recall complete. Compare the captured context before and after review below."
          : "Recall complete. Inspect the returned context below."
        : `Recall scored ${rows.length} active memories.`,
    );
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setScanning(true);
      setPulseRank(1);
      timers.current.push(
        window.setTimeout(() => {
          setScanning(false);
          setPulseRank(0);
        }, 850),
      );
    }
    pushLog(
      "POST",
      "/v1/memories/search",
      `${rows.length} facts scored locally`,
    );
  }
  function handleStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) {
      setNotice("Enter a fact before storing it.");
      document.getElementById("wb-store")?.focus();
      return;
    }
    const result = add(draft.trim(), 3);
    setRankingUpdate(null);
    setReviewOutcome(null);
    setReviewVerified(false);
    setJourneyStage(
      result.contradictions.length || openConflicts.length
        ? "review"
        : "verify",
    );
    setNotice(
      `Stored a memory. ${result.contradictions.length} possible ${result.contradictions.length === 1 ? "conflict" : "conflicts"} flagged.`,
    );
    setDraft("");
    setSelectedId(result.memory.id);
    setHoverId(null);
    pushLog(
      "POST",
      "/v1/memories",
      `${result.contradictions.length} possible ${result.contradictions.length === 1 ? "conflict" : "conflicts"}`,
    );
  }
  function verifyRecall() {
    runRecall(activeQuery);
    const target = document.getElementById("context-title");
    if (target) {
      target.focus({ preventScroll: true });
      scrollToElement(target);
    }
  }
  function tryConflict() {
    setDraft(scenario.change);
    document.getElementById("wb-store")?.focus();
  }
  function chooseScenario(next: MemoryScenario) {
    setScenario(next);
    setReviewOutcome(null);
    setReviewVerified(false);
    setSelectedId(null);
    setHoverId(null);
    setDraft(next.change);
    runRecall(next.query);
    setReviewVerified(false);
    setJourneyStage("store");
    setNotice(
      `${next.label} scenario ready. Store the suggested change, then review both facts.`,
    );
  }
  function keep(contradictionId: string, winnerId: string) {
    const conflict = openConflicts.find((item) => item.id === contradictionId);
    if (!conflict) return;
    const candidates = [conflict.existing_memory, conflict.new_memory];
    const winner = candidates.find((memory) => memory.id === winnerId);
    const loser = candidates.find((memory) => memory.id !== winnerId);
    if (!winner || !loser) return;
    const resolved = resolve(contradictionId, winnerId);
    const activeIds = new Set(
      resolved.memories
        .filter((memory) => memory.is_active)
        .map((memory) => memory.id),
    );
    const context = (items: Row[]) =>
      recallMatches(items).map(({ memory }) => ({
        id: memory.id,
        content: memory.content,
      }));
    setRankingUpdate(null);
    setReviewOutcome({
      previous: conflict.existing_memory.content,
      incoming: conflict.new_memory.content,
      kept: winner.content,
      archived: loser.content,
      recall: {
        query: activeQuery,
        mode,
        timeOffset,
        before: context(ranked),
        after: context(ranked.filter((row) => activeIds.has(row.memory.id))),
      },
    });
    setReviewVerified(false);
    const pending = resolved.contradictions.some(
      (item) =>
        item.status === "open" &&
        activeIds.has(item.new_memory.id) &&
        activeIds.has(item.existing_memory.id),
    );
    setJourneyStage(pending ? "review" : "verify");
    setSelectedId(winnerId);
    setHoverId(null);
    setNotice(
      "Conflict resolved. The losing memory is inactive. Recall again to compare context.",
    );
    pushLog(
      "POST",
      "/v1/contradictions/resolve",
      "Explicit choice; losing fact inactive",
    );
  }
  function reset() {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    resetStore();
    setQuery(EXAMPLE_QUERIES[0]);
    setActiveQuery(EXAMPLE_QUERIES[0]);
    setRankingMode("relevance");
    setAgeOffset(0);
    setRankingUpdate(null);
    timeBaseline.current = null;
    setInspectorOpen(false);
    setSelectedId(null);
    setHoverId(null);
    setDraft("");
    setScenario(MEMORY_SCENARIOS[0]);
    setReviewOutcome(null);
    setReviewVerified(false);
    setJourneyStage("recall");
    setPulseRank(0);
    setScanning(false);
    setTraceRun(0);
    setResetVersion((version) => version + 1);
    setLogs([]);
    logSeq.current = 1;
    setNotice("Playground reset to six sample memories.");
  }
  return {
    store,
    query,
    setQuery,
    activeQuery,
    mode,
    setMode,
    timeOffset,
    setTimeOffset,
    beginTimeAdjustment,
    endTimeAdjustment,
    rankingUpdate,
    rankChanges,
    inspectorOpen,
    setInspectorOpen,
    inspectMemory,
    selectedId,
    setSelectedId,
    hoverId,
    setHoverId,
    draft,
    scenario,
    chooseScenario,
    reviewOutcome,
    setDraft,
    pulseRank,
    scanning,
    traceRun,
    resetVersion,
    notice,
    journeyStage,
    reviewVerified,
    logs,
    rows,
    ranked,
    openConflicts,
    inactive,
    positions,
    runRecall,
    verifyRecall,
    handleStore,
    tryConflict,
    keep,
    setImportance,
    reset,
  };
}
export type WorkbenchModel = ReturnType<typeof useWorkbench>;
