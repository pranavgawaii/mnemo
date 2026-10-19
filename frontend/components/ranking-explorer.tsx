"use client";

import { useMemo, useState } from "react";
import { DocsSection } from "./docs-section";
import {
  DECAY_FLOOR,
  DECAY_HALF_LIFE_DAYS,
  decayFactor,
  importanceWeight,
} from "../lib/mnemo";

interface Params {
  similarity: number;
  ageDays: number;
  importance: number;
}

const PRESETS: { label: string; a: Params; b: Params; note: string }[] = [
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
    note: "A stronger semantic match wins even at age 1000 days with the lowest importance and a floored decay factor. This invariant is pinned by tests/test_core.py.",
  },
  {
    label: "The decay floor in effect",
    a: { similarity: 0.7, ageDays: 1000, importance: 3 },
    b: { similarity: 0.7, ageDays: 800, importance: 3 },
    note: "Both ages are past the point where decay hits its 0.7 floor, so both decay factors are identical (0.700) and the scores tie.",
  },
];

function score(p: Params): { decay: number; weight: number; relevance: number } {
  return {
    decay: decayFactor(p.ageDays),
    weight: importanceWeight(p.importance),
    relevance: p.similarity * decayFactor(p.ageDays) * importanceWeight(p.importance),
  };
}

function MemoryControls({
  name,
  params,
  onChange,
  accent,
}: {
  name: string;
  params: Params;
  onChange: (next: Params) => void;
  accent: string;
}) {
  const set = (patch: Partial<Params>) => onChange({ ...params, ...patch });
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        <h4 className="text-[13px] font-medium text-ink">{name}</h4>
      </div>

      <Field label="similarity" value={params.similarity.toFixed(2)}>
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
      </Field>

      <Field label="age" value={`${params.ageDays} d`}>
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
      </Field>

      <Field label="importance" value={`${params.importance} / 5`}>
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
      </Field>

      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-hairline pt-3 font-mono text-[10.5px]">
        <div>
          <div className="text-faint">decay</div>
          <div className="mt-0.5 text-ink">{score(params).decay.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-faint">weight</div>
          <div className="mt-0.5 text-ink">{score(params).weight.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-faint">relevance</div>
          <div className="mt-0.5 font-bold text-ink">
            {score(params).relevance.toFixed(3)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] text-faint">{label}</span>
        <span className="font-mono text-[11px] text-ink">{value}</span>
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
      className="w-full h-auto"
      role="img"
      aria-label={`Decay curve with a 180-day half-life floored at 0.7; the marker sits at ${ageDays} days`}
    >
      <line x1="24" y1="170" x2="424" y2="170" stroke="#E5E5E5" strokeWidth="1" />
      <line x1="24" y1="20" x2="24" y2="170" stroke="#E5E5E5" strokeWidth="1" />

      <line x1="24" y1="20" x2="424" y2="20" stroke="#F1F1EF" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="24" y1="132.5" x2="424" y2="132.5" stroke="#4F46E5" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

      <text x="28" y="16" fontSize="10.5" fontFamily="monospace" fill="#9CA3AF">1.0</text>
      <text x="382" y="128" fontSize="10.5" fontFamily="monospace" fill="#4F46E5">floor 0.7</text>

      <polyline points={points} fill="none" stroke="#0A0A0F" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      <line x1="156" y1="20" x2="156" y2="170" stroke="#E5E5E5" strokeWidth="1" strokeDasharray="3 3" />
      <text x="150" y="186" fontSize="10" fontFamily="monospace" fill="#9CA3AF" textAnchor="middle">180d</text>

      <line x1={markerX} y1={markerY} x2={markerX} y2="170" stroke="#4F46E5" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      <circle cx={markerX} cy={markerY} r="4" fill="#4F46E5" />
    </svg>
  );
}

export function RankingExplorer({
  index = "12",
}: {
  index?: string;
} = {}) {
  const [a, setA] = useState<Params>(PRESETS[0].a);
  const [b, setB] = useState<Params>(PRESETS[0].b);
  const [note, setNote] = useState(PRESETS[0].note);

  const sa = score(a);
  const sb = score(b);
  const winner = sa.relevance === sb.relevance ? "tie" : sa.relevance > sb.relevance ? "A" : "B";

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setA(preset.a);
    setB(preset.b);
    setNote(preset.note);
  }

  return (
    <DocsSection
      id="ranking-calculator"
      index={index}
      title="Ranking calculator"
      intro="Search does not order by vector distance. Each candidate is scored by the function below, evaluated in Python, then sorted. Move the sliders to see why a memory won."
    >
      <div className="overflow-x-auto rounded-xl border border-line bg-[#FCFCFB] px-4 py-3 font-mono text-[11.5px] text-ink">
        relevance = similarity × max({DECAY_FLOOR}, 0.5^(age / {DECAY_HALF_LIFE_DAYS})) × (1 + (importance − 3) × 0.05)
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 items-start">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-full border border-line bg-white px-3 py-1.5 font-mono text-[10.5px] text-muted hover:text-ink hover:border-faint/40 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <MemoryControls name="Memory A" params={a} onChange={setA} accent="bg-accent" />
          <MemoryControls name="Memory B" params={b} onChange={setB} accent="bg-[#9CA3AF]" />

          <div className="rounded-xl border border-line bg-white px-4 py-3.5">
            <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
              <span className="text-faint">ranking</span>
              <span className="text-right font-bold text-ink">
                {winner === "tie"
                  ? "A = B (tie)"
                  : `${winner} ranks first — ${(winner === "A" ? sa.relevance : sb.relevance).toFixed(3)} vs ${(winner === "A" ? sb.relevance : sa.relevance).toFixed(3)}`}
              </span>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-[1.65] text-muted">{note}</p>
          </div>

          <p className="font-mono text-[10.5px] leading-[1.7] text-faint">
            The calculator evaluates the exact function in{" "}
            <span className="text-muted">app/core/decay.py</span>. None of these
            numbers come from a search — real results also show the raw cosine
            similarity and age returned by the API.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-white p-5 shadow-soft">
          <h3 className="text-[14px] font-medium text-ink">Decay of Memory A</h3>
          <p className="mt-1 font-mono text-[11px] text-faint">
            age {a.ageDays} d → decay {sa.decay.toFixed(3)}
          </p>
          <div className="mt-4">
            <DecayCurve ageDays={a.ageDays} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-hairline pt-5 text-[12px]">
            <div>
              <div className="font-mono text-[10.5px] text-faint">half-life</div>
              <div className="mt-1 text-ink">{DECAY_HALF_LIFE_DAYS} days</div>
            </div>
            <div>
              <div className="font-mono text-[10.5px] text-faint">floor</div>
              <div className="mt-1 text-ink">{DECAY_FLOOR} (penalty capped at 30%)</div>
            </div>
            <div>
              <div className="font-mono text-[10.5px] text-faint">importance band</div>
              <div className="mt-1 text-ink">0.90 – 1.10</div>
            </div>
            <div>
              <div className="font-mono text-[10.5px] text-faint">clamped?</div>
              <div className="mt-1 text-ink">no — relevance may exceed similarity</div>
            </div>
          </div>
        </div>
      </div>
    </DocsSection>
  );
}
