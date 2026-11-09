import type { Row } from "./types";

/** A display cutoff for the lexical demo, separate from the real search policy. */
export const DEMO_MATCH_THRESHOLD = 0.25;

export function recallMatches(ranked: Row[]) {
  return ranked
    .filter((row) => row.similarity >= DEMO_MATCH_THRESHOLD)
    .slice(0, 3);
}
