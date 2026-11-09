"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Database,
  Layers,
  MessageSquare,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useTabList } from "@/hooks/use-tabs";
import { ExpandedView } from "@/components/ui/expanded-view";
import { CopyContext } from "./context-results";
import { DEMO_MATCH_THRESHOLD, recallMatches } from "./recall-matches";
import type { Row } from "./types";
import type { WorkbenchModel } from "./use-workbench";

const STAGES = [
  { label: "Query", icon: MessageSquare },
  { label: "Candidates", icon: Database },
  { label: "Rank", icon: SlidersHorizontal },
  { label: "Handoff", icon: Layers },
];

function FactButton({
  row,
  index,
  model,
  ranking = false,
}: {
  row: Row;
  index: number;
  model: WorkbenchModel;
  ranking?: boolean;
}) {
  const score = model.mode === "relevance" ? row.relevance : row.similarity;
  const movement = model.rankChanges.find(
    (change) => change.id === row.memory.id,
  );
  return (
    <button
      type="button"
      aria-label={`${ranking ? `Rank ${index + 1}` : "Active fact"}: ${row.memory.content}`}
      aria-pressed={model.selectedId === row.memory.id}
      aria-haspopup="dialog"
      onClick={() => model.inspectMemory(row.memory.id)}
      className={`w-full rounded-xl border p-4 text-left transition-colors hover:border-accent/40 ${model.selectedId === row.memory.id ? "border-accent/35 bg-accent-soft/40" : "border-line bg-white"}`}
    >
      <span className="flex items-start gap-3">
        <span className="mt-0.5 w-5 shrink-0 font-mono text-[13px] text-muted">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 break-words text-[14px] leading-relaxed">
          {row.memory.content}
        </span>
        <span className="shrink-0 font-mono text-[13px] tabular-nums text-accent-ink">
          {(ranking ? score : row.similarity).toFixed(3)}
        </span>
      </span>
      {ranking && (
        <span className="mt-3 ml-8 block">
          <span className="grid gap-1.5">
            <span className="block h-1 overflow-hidden rounded-full bg-hairline">
              <span
                className="block h-full bg-muted/40"
                style={{ width: `${Math.min(1, row.similarity) * 100}%` }}
              />
            </span>
            <span className="block h-1 overflow-hidden rounded-full bg-hairline">
              <span
                className="block h-full bg-accent/70"
                style={{ width: `${Math.min(1, row.relevance) * 100}%` }}
              />
            </span>
          </span>
          {movement && movement.from !== movement.to && (
            <span className="mt-2 inline-flex items-center gap-1 font-mono text-[12px] text-accent-ink">
              #{movement.from}
              <ArrowRight aria-hidden="true" className="h-3 w-3" />#
              {movement.to}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

export function RetrievalTrace({ model }: { model: WorkbenchModel }) {
  const id = useId();
  const [active, setActive] = useState(3);
  const [open, setOpen] = useState(false);
  const [replay, setReplay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const matches = recallMatches(model.ranked);
  const candidates = useMemo(
    () => [...model.rows].sort((a, b) => b.similarity - a.similarity),
    [model.rows],
  );
  function stop() {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setPlaying(false);
  }
  function choose(index: number) {
    stop();
    setActive(index);
  }
  function close() {
    stop();
    setOpen(false);
  }
  const tabs = useTabList({ count: STAGES.length, active, onChange: choose });
  useEffect(() => {
    stop();
    setActive(3);
  }, [model.traceRun]);
  useEffect(() => {
    if (replay === 0) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      setPlaying(false);
      setActive(3);
    };
    if (reduced.matches) finish();
    else {
      setActive(0);
      setPlaying(true);
      timers.current = [1, 2, 3].map((index) =>
        window.setTimeout(() => {
          setActive(index);
          if (index === 3) setPlaying(false);
        }, index * 1100),
      );
    }
    const onPreference = () => {
      if (reduced.matches) finish();
    };
    reduced.addEventListener("change", onPreference);
    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      reduced.removeEventListener("change", onPreference);
    };
  }, [replay]);
  return (
    <figure
      id="retrieval-trace"
      aria-label="Retrieval trace"
      className="scroll-mt-24 border-t border-line bg-background/40 px-5 py-5 sm:px-6"
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-medium text-ink">
            Inside this retrieval
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            <span>{model.rows.length} active facts</span> →{" "}
            <span>{matches.length} returned</span> · browser simulation
          </p>
        </div>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] text-ink transition-colors hover:border-accent/30"
        >
          Inspect retrieval{" "}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </figcaption>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STAGES.map((stage, index) => (
          <button
            key={stage.label}
            type="button"
            aria-label={`Inspect ${stage.label} stage`}
            aria-haspopup="dialog"
            onClick={() => {
              choose(index);
              setOpen(true);
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] text-muted transition-colors hover:border-accent/30 hover:text-accent-ink"
          >
            <stage.icon aria-hidden="true" className="h-4 w-4" />
            {stage.label}
          </button>
        ))}
      </div>
      <ExpandedView
        contentKey={active}
        open={open}
        onClose={close}
        title="Retrieval trace"
        description="Follow the submitted question through local scoring to the context your application would receive."
        toolbar={
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-muted">
                {model.rows.length} active facts · {matches.length} returned ·{" "}
                {model.mode === "relevance"
                  ? "base relevance"
                  : "similarity only"}
              </p>
              <button
                type="button"
                onClick={() =>
                  playing ? stop() : setReplay((value) => value + 1)
                }
                className="inline-flex min-h-10 w-[120px] items-center justify-center gap-2 rounded-lg border border-line bg-white text-[12px] text-muted hover:text-accent-ink"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                {playing ? "Stop replay" : "Replay trace"}
              </button>
            </div>
            <div
              role="tablist"
              aria-label="Retrieval stages"
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {STAGES.map((stage, index) => (
                <button
                  key={stage.label}
                  ref={tabs.register(index)}
                  type="button"
                  id={`${id}-tab-${index}`}
                  role="tab"
                  aria-selected={active === index}
                  aria-controls={`${id}-panel`}
                  tabIndex={active === index ? 0 : -1}
                  onKeyDown={tabs.onKeyDown}
                  onClick={() => choose(index)}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-[13px] transition-colors ${active === index ? "border-accent/30 bg-accent-soft text-accent-ink" : "border-line text-muted hover:text-ink"}`}
                >
                  <stage.icon aria-hidden="true" className="h-4 w-4" />
                  {stage.label}
                </button>
              ))}
            </div>
          </>
        }
      >
        <div
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${active}`}
          className="mx-auto max-w-3xl"
        >
          {active === 0 && (
            <div>
              <h3 className="text-[16px] font-medium text-ink">
                The submitted question
              </h3>
              <p className="mt-4 break-words rounded-xl bg-accent-soft/40 p-5 text-[18px] leading-relaxed text-accent-ink">
                {model.activeQuery}
              </p>
              <p className="mt-5 text-[14px] leading-relaxed text-muted">
                Search commits the question you typed. This browser compares
                words and topic tags across the sample facts. The API instead
                embeds text with MiniLM.
              </p>
            </div>
          )}
          {active === 1 && (
            <div>
              <p className="mb-5 text-[14px] leading-relaxed text-muted">
                All {candidates.length} active facts, sorted by illustrative
                similarity. Inactive history is excluded. Select a fact to
                inspect its evidence.
              </p>
              <div className="space-y-3">
                {candidates.map((row, index) => (
                  <FactButton
                    key={row.memory.id}
                    row={row}
                    index={index}
                    model={model}
                  />
                ))}
              </div>
            </div>
          )}
          {active === 2 && (
            <div>
              <p className="mb-5 text-[14px] leading-relaxed text-muted">
                Ordered by{" "}
                {model.mode === "relevance" ? "base score" : "similarity"}. Grey
                bars show similarity; indigo bars show the base score after
                decay and importance. Select a fact to change its importance.
              </p>
              <div className="space-y-3">
                {model.ranked.map((row, index) => (
                  <FactButton
                    key={row.memory.id}
                    row={row}
                    index={index}
                    model={model}
                    ranking
                  />
                ))}
              </div>
            </div>
          )}
          {active === 3 && (
            <div>
              <h3 className="text-[20px] font-medium text-ink">
                {matches.length
                  ? `${matches.length} ${matches.length === 1 ? "fact is" : "facts are"} ready for your application`
                  : "No context to hand off"}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">
                {matches.length
                  ? "The Recalled context list is the single source of returned facts. Your application would pass that text into its model before generating an answer."
                  : "Try a different question or store a related fact. This example does not invent a fact or generate an answer."}
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-line p-4">
                  <dt className="text-[13px] text-muted">Included</dt>
                  <dd className="mt-2 font-mono text-[24px] text-accent-ink">
                    {matches.length}
                  </dd>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <dt className="text-[13px] text-muted">Not returned</dt>
                  <dd className="mt-2 font-mono text-[24px] text-ink">
                    {model.rows.length - matches.length}
                  </dd>
                </div>
              </dl>
              <p className="my-5 text-[13px] leading-relaxed text-muted">
                Demo cutoff: similarity ≥ {DEMO_MATCH_THRESHOLD.toFixed(2)}, up
                to 3 facts. This display rule is separate from the API search
                policy. Copy context copies the returned facts as plain text.
              </p>
              <CopyContext model={model} text />
            </div>
          )}
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {playing
            ? `Replaying ${STAGES[active].label} stage.`
            : "Trace ready. Explore each stage or inspect a fact."}
        </p>
      </ExpandedView>
    </figure>
  );
}
