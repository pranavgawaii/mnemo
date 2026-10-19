"use client";

import type { CSSProperties } from "react";
import { decayFactor, importanceWeight, type SearchHit } from "../lib/mnemo";

/**
 * The recall map — the playground's spatial view of a search.
 *
 * The query sits at the core and the six best matches orbit it on three rings:
 * the nearer the ring, the more relevant the memory. Hover, focus or tap a node
 * to inspect it, and the readout underneath shows exactly how Mnemo scored it
 * (similarity × decay × importance) — the same formula the service runs.
 *
 * This is purely presentational. The console owns the store, the query and the
 * selection, and drives the map through `hits` and `focusId`, so the map and the
 * ranked list always describe the same result set.
 */

const RINGS = [
  { size: 52, dur: 44, dir: 1 },
  { size: 74, dur: 66, dir: -1 },
  { size: 96, dur: 94, dir: 1 },
] as const;

const PER_RING = [2, 2, 2];

function ringOf(index: number) {
  if (index < PER_RING[0]) return 0;
  if (index < PER_RING[0] + PER_RING[1]) return 1;
  return 2;
}

/** A rotation with its counter-rotation, so the node stays upright. */
function spin(dur: number, dir: number): CSSProperties {
  return {
    "--orbit-dur": `${dur}s`,
    animationDirection: dir > 0 ? "normal" : "reverse",
  } as CSSProperties;
}

function Metric({
  label,
  value,
  ratio,
  tone = "neutral",
}: {
  label: string;
  value: string;
  ratio: number;
  tone?: "neutral" | "accent";
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          {label}
        </span>
        <span
          className={`font-mono text-[12px] tabular-nums ${
            tone === "accent" ? "text-accent-ink" : "text-ink"
          }`}
        >
          {value}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            tone === "accent" ? "bg-accent" : "bg-ink/25"
          }`}
          style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }}
        />
      </div>
    </div>
  );
}

export function MemoryOrbit({
  hits,
  query,
  focusId,
  onFocusChange,
}: {
  hits: SearchHit[];
  query: string;
  focusId: string | null;
  onFocusChange: (id: string) => void;
}) {
  const shown = hits.slice(0, 6);
  const top = shown[0] ?? null;
  const focus = shown.find((h) => h.memory.id === focusId) ?? top;
  const maxScore = top?.relevance_score ?? 1;

  const buckets: SearchHit[][] = [[], [], []];
  shown.forEach((hit, index) => buckets[ringOf(index)].push(hit));

  if (shown.length === 0) {
    return (
      <div className="grid place-items-center py-12 text-center">
        <div className="grid h-40 w-40 place-items-center rounded-full border border-dashed border-line">
          <p className="max-w-[120px] text-[12px] leading-snug text-faint">
            Run a query to place memories on the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stage */}
      <div className="orbit-stage relative mx-auto aspect-square w-full max-w-[420px]">
        {RINGS.map((ring, ringIndex) => (
          <div
            key={ring.size}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-line"
            style={{ width: `${ring.size}%`, height: `${ring.size}%` }}
          >
            <div
              className="orbit-spin absolute inset-0"
              style={spin(ring.dur, ring.dir)}
            >
              {buckets[ringIndex].map((hit) => {
                const count = buckets[ringIndex].length;
                const i = buckets[ringIndex].indexOf(hit);
                const angle = (360 / Math.max(1, count)) * i + ringIndex * 58;
                const rad = (angle * Math.PI) / 180;
                const x = 50 + Math.cos(rad) * 50;
                const y = 50 + Math.sin(rad) * 50;
                const rank = shown.indexOf(hit) + 1;
                const isFocus = focus?.memory.id === hit.memory.id;
                const scale = 0.72 + 0.34 * (hit.relevance_score / maxScore);
                const size = (rank === 1 ? 40 : 30) * scale + 10;

                return (
                  <button
                    key={hit.memory.id}
                    type="button"
                    onMouseEnter={() => onFocusChange(hit.memory.id)}
                    onFocus={() => onFocusChange(hit.memory.id)}
                    onClick={() => onFocusChange(hit.memory.id)}
                    aria-pressed={isFocus}
                    aria-label={`Rank ${rank}: ${hit.memory.content}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
                    style={{ left: `${x.toFixed(3)}%`, top: `${y.toFixed(3)}%` }}
                  >
                    <span
                      className="orbit-upright block"
                      style={spin(ring.dur, -ring.dir)}
                    >
                      <span
                        className={`grid place-items-center rounded-full border font-mono tabular-nums transition-all duration-200 ${
                          isFocus
                            ? "border-accent bg-accent text-[12px] text-white"
                            : "border-line bg-white text-[11px] text-muted hover:border-ink/30 hover:text-ink"
                        }`}
                        style={{
                          width: `${size}px`,
                          height: `${size}px`,
                          boxShadow: isFocus
                            ? "0 0 0 6px rgba(79,70,229,0.12), 0 0 24px rgba(79,70,229,0.32)"
                            : undefined,
                        }}
                      >
                        {rank}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Core */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="grid h-[110px] w-[110px] place-items-center rounded-full border border-line bg-white px-3 text-center shadow-soft">
            <div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
                recall
              </div>
              <div className="mt-1 line-clamp-3 text-[11px] leading-tight text-ink">
                {query}
              </div>
            </div>
          </div>
          <span className="orbit-core-pulse pointer-events-none absolute inset-0 rounded-full border border-accent/40" />
        </div>
      </div>

      {/* Readout */}
      {focus && (
        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-medium text-white">
              {shown.indexOf(focus) + 1}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              selected match
            </span>
          </div>

          <p className="mt-3 text-[14.5px] leading-snug text-ink">
            &ldquo;{focus.memory.content}&rdquo;
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric
              label="similarity"
              value={focus.similarity.toFixed(2)}
              ratio={focus.similarity}
            />
            <Metric
              label="decay"
              value={`${decayFactor(focus.age_days).toFixed(2)} × ${focus.age_days}d`}
              ratio={(decayFactor(focus.age_days) - 0.7) / 0.3}
            />
            <Metric
              label="importance"
              value={importanceWeight(focus.memory.importance).toFixed(2)}
              ratio={(importanceWeight(focus.memory.importance) - 0.9) / 0.2}
            />
            <Metric
              label="relevance"
              value={focus.relevance_score.toFixed(3)}
              ratio={focus.relevance_score / maxScore}
              tone="accent"
            />
          </div>
        </div>
      )}
    </>
  );
}
