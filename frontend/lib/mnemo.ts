/**
 * Browser-side mirror of Mnemo's pure logic.
 *
 * These constants and functions are deliberate **ports** of the backend, so the
 * interactive demos on this page use the same formula, thresholds and reason
 * strings as the running service. They are not a second implementation with
 * its own opinions — keep them in sync with:
 *
 *   - `app/core/config.py`        (defaults / thresholds)
 *   - `app/core/decay.py`         (decay + importance + relevance)
 *   - `app/core/contradiction.py` (similarity gate + negation heuristic)
 *
 * Anything that cannot be derived from the repository is not here.
 */

// --------------------------------------------------------------------------- //
// Configuration (app/core/config.py)
// --------------------------------------------------------------------------- //
export const EMBEDDING_MODEL = "all-MiniLM-L6-v2";
export const EMBEDDING_DIM = 384;

export const DECAY_HALF_LIFE_DAYS = 180;
export const DECAY_FLOOR = 0.7;
export const CONTRADICTION_SIM_THRESHOLD = 0.82;

/** How many nearest neighbours are inspected when adding a memory. */
export const CONTRADICTION_CANDIDATES = 5;
/** How many neighbours are pulled before re-ranking in search. */
export const SEARCH_OVERFETCH = 4;

export const SEARCH_LIMIT_DEFAULT = 10;
export const SEARCH_LIMIT_MAX = 100;
export const LIST_LIMIT_DEFAULT = 20;
export const LIST_LIMIT_MAX = 100;

// --------------------------------------------------------------------------- //
// Scoring (app/core/decay.py)
// --------------------------------------------------------------------------- //

/** Exponential decay factor for a memory of `ageDays`, floored at `floor`. */
export function decayFactor(
  ageDays: number,
  halfLifeDays: number = DECAY_HALF_LIFE_DAYS,
  floor: number = DECAY_FLOOR
): number {
  if (halfLifeDays <= 0) throw new Error("half_life_days must be positive");
  const age = Math.max(0, ageDays);
  return Math.max(floor, Math.pow(0.5, age / halfLifeDays));
}

/** Map a 1-5 importance rating to a multiplicative weight (0.90 - 1.10). */
export function importanceWeight(importance: number): number {
  const clamped = Math.max(1, Math.min(5, Math.round(importance)));
  return 1 + (clamped - 3) * 0.05;
}

/**
 * Composite relevance: `similarity * decay(age) * importance`.
 * Not clamped to `[0, 1]` — importance can push it slightly above similarity.
 */
export function relevanceScore(
  similarity: number,
  ageDays: number,
  importance: number,
  halfLifeDays: number = DECAY_HALF_LIFE_DAYS
): number {
  return (
    similarity * decayFactor(ageDays, halfLifeDays) * importanceWeight(importance)
  );
}

// --------------------------------------------------------------------------- //
// Contradiction detection (app/core/contradiction.py)
// --------------------------------------------------------------------------- //

/**
 * Words/phrases that flip a statement's polarity. Kept deliberately small and
 * high-precision in the backend; the same list is used here.
 */
export const NEGATION_MARKERS = [
  "no longer",
  "not",
  "never",
  "n't",
  "isn't",
  "wasn't",
  "doesn't",
  "didn't",
  "stopped",
  "quit",
  "left",
  "former",
  "formerly",
  "ex-",
  "used to",
  "no more",
  "ceased",
  "resigned",
  "cancelled",
  "canceled",
] as const;

/** Set of negation markers present in `text` (case-insensitive substring scan). */
export function negationMarkers(text: string): Set<string> {
  const lowered = text.toLowerCase();
  const found = new Set<string>();
  for (const marker of NEGATION_MARKERS) {
    if (lowered.includes(marker)) found.add(marker);
  }
  return found;
}

/** Meaningful lowercased tokens, dropping negation markers and short words. */
export function contentWords(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[a-z0-9']+|no longer|used to|no more/g) ?? [];
  return new Set(
    tokens.filter(
      (t) => !(NEGATION_MARKERS as readonly string[]).includes(t) && t.length > 2
    )
  );
}

export interface ContradictionVerdict {
  isContradiction: boolean;
  similarity: number;
  reason: string;
}

/**
 * Decide whether `newContent` contradicts `existingContent`.
 *
 * Stage 1 is a similarity gate; stage 2 is the negation-marker heuristic. The
 * backend also has an optional `llm_check` slot that runs between the two, but
 * it is unused by default and therefore not simulated here.
 */
export function checkContradiction(
  newContent: string,
  existingContent: string,
  similarity: number,
  simThreshold: number = CONTRADICTION_SIM_THRESHOLD
): ContradictionVerdict {
  if (similarity < simThreshold) {
    return {
      isContradiction: false,
      similarity,
      reason: `Similarity ${similarity.toFixed(2)} below gate ${simThreshold.toFixed(2)}.`,
    };
  }

  const newNeg = negationMarkers(newContent);
  const oldNeg = negationMarkers(existingContent);
  const onlyOneSide = new Set(
    [...newNeg].filter((m) => !oldNeg.has(m)).concat([...oldNeg].filter((m) => !newNeg.has(m)))
  );

  if (onlyOneSide.size === 0) {
    return {
      isContradiction: false,
      similarity,
      reason: "High similarity but no polarity difference detected.",
    };
  }

  const shared = [...contentWords(newContent)].filter((t) =>
    contentWords(existingContent).has(t)
  );
  if (shared.length === 0) {
    return {
      isContradiction: false,
      similarity,
      reason: "Polarity differs but no shared subject matter.",
    };
  }

  const markers = [...onlyOneSide].sort().join(", ");
  return {
    isContradiction: true,
    similarity,
    reason:
      `Similar content (sim=${similarity.toFixed(2)}) with opposing polarity; ` +
      `negation marker(s) on one side only: ${markers}.`,
  };
}

// --------------------------------------------------------------------------- //
// API shapes (app/models/schemas.py)
// --------------------------------------------------------------------------- //
export interface MemoryOut {
  id: string;
  namespace: string;
  content: string;
  importance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContradictionOut {
  id: string;
  namespace: string;
  similarity: number;
  reason: string;
  status: string;
  new_memory: MemoryOut;
  existing_memory: MemoryOut;
  resolved_winner_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface SearchHit {
  memory: MemoryOut;
  similarity: number;
  relevance_score: number;
  age_days: number;
}
