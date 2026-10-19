"use client";

import { useState } from "react";
import { DocsSection } from "./docs-section";
import { useTabList } from "../lib/use-tabs";

type State = {
  key: string;
  label: string;
  title: string;
  body: string;
  facts: { k: string; v: string }[];
};

const STATES: State[] = [
  {
    key: "active",
    label: "Active",
    title: "Active",
    body: "Every memory lands here. It is embedded, stored, and immediately retrievable from its namespace.",
    facts: [
      { k: "is_active", v: "true" },
      { k: "Searchable", v: "yes" },
      { k: "Listed", v: "yes" },
    ],
  },
  {
    key: "flagged",
    label: "Flagged",
    title: "Flagged — contradiction open",
    body: "A new write cleared the 0.82 cosine gate and a negation marker appears on exactly one side. Mnemo records the pair as an open contradiction instead of deciding which statement is true. Both memories stay retrievable.",
    facts: [
      { k: "Gate", v: "cosine ≥ 0.82" },
      { k: "Test", v: "negation on one side" },
      { k: "Status", v: "open" },
    ],
  },
  {
    key: "resolved",
    label: "Resolved",
    title: "Resolved",
    body: "A person reads both sides and names the winner. The contradiction is closed and the winner is left untouched.",
    facts: [
      { k: "Action", v: "name the winner" },
      { k: "Status", v: "resolved" },
      { k: "Audit", v: "who won, and when" },
    ],
  },
  {
    key: "inactive",
    label: "Inactive",
    title: "Inactive — soft-deleted",
    body: "The loser is marked inactive. It disappears from lists and search but is never erased — it stays fetchable by id so the history is intact.",
    facts: [
      { k: "is_active", v: "false" },
      { k: "In search", v: "no" },
      { k: "By id", v: "still fetchable" },
    ],
  },
];

/**
 * Interactive memory lifecycle. Detection is deterministic and two-stage; the
 * diagram shows the four states a memory moves through.
 */
export function LifecycleExplorer() {
  const [active, setActive] = useState(0);
  const state = STATES[active];
  const { register, onKeyDown } = useTabList({
    count: STATES.length,
    active,
    onChange: setActive,
  });

  return (
    <DocsSection
      id="contradictions"
      index="04"
      title="Contradictions"
      intro="Mnemo never guesses which statement is true. It finds candidate conflicts with a deterministic, two-stage check — a similarity gate, then a negation-marker test — and hands the decision to a person."
    >
      <div className="rounded-xl border border-line bg-white p-4 md:p-5">
        <div
          role="tablist"
          aria-label="Memory states"
          onKeyDown={onKeyDown}
          className="flex flex-wrap items-center gap-1.5"
        >
          {STATES.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <button
                type="button"
                role="tab"
                id={`life-tab-${s.key}`}
                ref={register(i)}
                tabIndex={active === i ? 0 : -1}
                aria-selected={active === i}
                aria-controls="life-panel"
                onClick={() => setActive(i)}
                className={`rounded-lg border px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
                  active === i
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-[#FCFCFB] text-ink hover:border-faint/40"
                }`}
              >
                {s.label}
              </button>
              {i < STATES.length - 1 && (
                <span className="text-[#D4D4D4]" aria-hidden>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        id="life-panel"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={`life-tab-${state.key}`}
        className="rounded-xl border border-line bg-white p-6"
      >
        <h3 className="text-[16px] font-medium text-ink">{state.title}</h3>
        <p className="mt-2 max-w-[640px] text-[14px] leading-[1.75] text-muted">
          {state.body}
        </p>
        <dl className="mt-5 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          {state.facts.map((f) => (
            <div key={f.k} className="bg-white px-4 py-3">
              <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                {f.k}
              </dt>
              <dd className="mt-1 text-[12.5px] text-ink">{f.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-[13px] leading-[1.7] text-muted">
        The check is cheap and explainable — no model call by default, and a
        pluggable slot if you want an LLM verdict later. Try the exact logic in
        the contradiction checker below.
      </p>
    </DocsSection>
  );
}
