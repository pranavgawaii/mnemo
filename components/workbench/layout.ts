import type { Row } from "./types";

export const SIZE = 600;
export const CENTER = SIZE / 2;

/**
 * Three visible orbits. Rank picks the ring, so the strongest matches always
 * sit inside and every orbit stays populated, rather than collapsing onto the
 * rim when a single score dominates. Radius still reads as "match": inner is
 * best.
 */
export const TRACKS = [118, 180, 242] as const;

export const IMPORTANCE_LABELS = ["low", "slight", "neutral", "high", "critical"];

/**
 * The field's motion. Every orbit turns (alternating direction, different
 * speeds) and a slow sweep crosses the stage, so the picture reads as a live
 * orbit at rest. All of it stops under `prefers-reduced-motion`.
 */
export const FIELD_CSS = `
@keyframes wb-spin { to { transform: rotate(360deg); } }
@keyframes wb-spin-rev { to { transform: rotate(-360deg); } }
@keyframes wb-sweep { to { transform: rotate(360deg); } }
@keyframes wb-core {
  0%, 100% { opacity: .22; transform: scale(.97); }
  50% { opacity: .62; transform: scale(1.05); }
}
.wb-ring, .wb-ring-rev { transform-box: view-box; transform-origin: center; animation: wb-spin linear infinite; }
.wb-ring-rev { animation-name: wb-spin-rev; }
.wb-sweep { transform-origin: center; animation: wb-sweep 34s linear infinite; }
.wb-core { transform-box: view-box; transform-origin: center; animation: wb-core 6.5s ease-in-out infinite; }
.wb-label { display: none; }
@media (min-width: 640px) { .wb-label { display: inline; } }
@media (prefers-reduced-motion: reduce) {
  .wb-ring, .wb-ring-rev, .wb-sweep, .wb-core { animation: none; }
}
`;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Stable angle seed so a node does not teleport when the query changes. */
export function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash % 997);
}

/** Base node radius. Importance is size; the strongest match gets a nudge. */
export function nodeRadius(row: Row, rank: number): number {
  return 13 + row.memory.importance * 2.2 + (rank === 1 ? 3 : 0);
}
