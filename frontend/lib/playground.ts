/**
 * The interactive playground's in-browser store.
 *
 * IMPORTANT: this is a **simulation**, not the live service. It exists because
 * the real API authenticates every request with a private `X-API-Key`, which a
 * public web page must never embed. Two things are worth separating:
 *
 *   - The ranking maths (`relevanceScore`) and the contradiction heuristic
 *     (`checkContradiction`) are exact ports of the backend (`lib/mnemo.ts`).
 *   - `illustrativeSimilarity` is NOT the embedding model. The live API embeds
 *     text with `all-MiniLM-L6-v2`; here we approximate "relatedness" with a
 *     lexical + topic score so the demo works without a network call. It is
 *     always labelled as illustrative in the UI.
 *
 * The seeded corpus is small and deliberately tag-annotated so the examples
 * behave sensibly. Real similarity values come from the API; run
 * `POST /v1/memories/search` against a live backend to see them.
 */

import {
  CONTRADICTION_CANDIDATES,
  SEARCH_OVERFETCH,
  checkContradiction,
  relevanceScore,
  type MemoryOut,
  type SearchHit,
} from "./mnemo";
export interface PlaygroundMemory extends MemoryOut {
  /** Age in days — fixed for seeded memories so rendering is deterministic. */
  age_days: number;
  /** Coarse topic tags used only by the illustrative similarity. */
  tags: string[];
}

export interface PlaygroundContradiction {
  id: string;
  namespace: string;
  similarity: number;
  reason: string;
  status: string;
  new_memory: PlaygroundMemory;
  existing_memory: PlaygroundMemory;
  resolved_winner_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface PlaygroundState {
  memories: PlaygroundMemory[];
  contradictions: PlaygroundContradiction[];
}

// --------------------------------------------------------------------------- //
// Topic inference — illustrative only, powers `illustrativeSimilarity`.
// --------------------------------------------------------------------------- //
const TOPIC_RULES: Record<string, string[]> = {
  location: [
    "live", "lives", "living", "location", "where", "city", "home", "address",
    "neighbourhood", "neighborhood", "moved", "relocate", "bengaluru",
    "bangalore", "delhi", "pune", "apartment",
  ],
  dairy: ["milk", "dairy", "lactose", "cheese", "cream", "ice", "yoghurt", "yogurt"],
  nuts: ["peanut", "nuts", "nut"],
  allergy: ["allergy", "allergic", "intolerant"],
  diet: [
    "eat", "food", "diet", "cuisine", "meal", "dessert", "curry", "thai",
    "restaurant", "coffee", "taste", "favourite", "favorite",
  ],
  health: [
    "health", "doctor", "physio", "supplement", "sleep", "injur", "knee",
    "vitamin", "hospital", "medical",
  ],
  coding: [
    "code", "coding", "programming", "language", "learn", "learning", "editor",
    "rust", "python", "neovim", "framework", "software", "developer", "build",
  ],
  exercise: [
    "run", "running", "exercise", "workout", "gym", "fitness", "swim", "training",
    "coach", "sport",
  ],
};

export function inferTopics(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  const topics = new Set<string>();
  for (const [topic, keywords] of Object.entries(TOPIC_RULES)) {
    if (words.some((w) => keywords.some((k) => w.includes(k)))) topics.add(topic);
  }
  return topics;
}

function normalize(text: string): string {
  return " " + text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ") + " ";
}

function ngrams(text: string, n: number): Map<string, number> {
  const grams = new Map<string, number>();
  for (let i = 0; i + n <= text.length; i++) {
    const g = text.slice(i, i + n);
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  return grams;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [k, v] of a) dot += v * (b.get(k) ?? 0);
  let na = 0;
  for (const v of a.values()) na += v * v;
  let nb = 0;
  for (const v of b.values()) nb += v * v;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function tokenDice(a: string, b: string): number {
  const setA = new Set(normalize(a).trim().split(" ").filter((t) => t.length > 2));
  const setB = new Set(normalize(b).trim().split(" ").filter((t) => t.length > 2));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared++;
  return (2 * shared) / (setA.size + setB.size);
}

function lexicalSimilarity(a: string, b: string): number {
  return (
    0.6 * cosine(ngrams(normalize(a), 3), ngrams(normalize(b), 3)) +
    0.4 * tokenDice(a, b)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * ILLUSTRATIVE similarity, in `[0, 1]`. Blends surface lexical overlap with
 * shared topic tags. This is **not** the `all-MiniLM-L6-v2` embedding the live
 * API uses — it is a stand-in so the demo runs entirely in the browser.
 */
export function illustrativeSimilarity(
  query: string,
  memory: Pick<PlaygroundMemory, "content" | "tags">
): number {
  const lexical = lexicalSimilarity(query, memory.content);
  const queryTopics = inferTopics(query);
  if (queryTopics.size === 0) return clamp(lexical, 0.02, 0.97);

  let hits = 0;
  for (const topic of queryTopics) if (memory.tags.includes(topic)) hits++;
  const topicScore = hits / queryTopics.size;
  return clamp(0.35 * lexical + 0.65 * topicScore, 0.02, 0.97);
}

// --------------------------------------------------------------------------- //
// Seeded corpus
// --------------------------------------------------------------------------- //
function seedMemory(
  id: string,
  content: string,
  importance: number,
  ageDays: number,
  tags: string[]
): PlaygroundMemory {
  return {
    id,
    namespace: "playground",
    content,
    importance,
    is_active: true,
    created_at: `seed:${ageDays}d`,
    updated_at: `seed:${ageDays}d`,
    age_days: ageDays,
    tags,
  };
}

export function initialPlaygroundState(): PlaygroundState {
  return {
    memories: [
      seedMemory("m1", "Pranav lives in Bengaluru", 4, 260, ["location"]),
      seedMemory(
        "m2",
        "Pranav is lactose intolerant and avoids milk-based desserts",
        4,
        380,
        ["dairy", "allergy", "diet", "health"]
      ),
      seedMemory(
        "m3",
        "Pranav is allergic to peanuts",
        5,
        400,
        ["nuts", "allergy", "diet", "health"]
      ),
      seedMemory("m4", "Pranav is learning Rust on weekends", 2, 45, ["coding"]),
      seedMemory("m5", "Pranav runs 5 kilometres three mornings a week", 3, 110, ["exercise"]),
      seedMemory("m6", "Pranav's favourite cuisine is Thai", 2, 290, ["diet"]),
    ],
    contradictions: [],
  };
}

export const EXAMPLE_QUERIES = [
  "Where does Pranav live?",
  "Can he eat ice cream?",
  "What is Pranav learning?",
  "How often does he run?",
] as const;

export const EXAMPLE_MEMORIES = [
  "Pranav lives in Bengaluru",
  "Pranav no longer lives in Bengaluru",
  "Pranav moved to Pune",
] as const;

// --------------------------------------------------------------------------- //
// Operations — mirror `app/services/memory_service.py`
// --------------------------------------------------------------------------- //
function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sim-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function addMemory(
  state: PlaygroundState,
  content: string,
  importance: number
): { state: PlaygroundState; memory: PlaygroundMemory; contradictions: PlaygroundContradiction[] } {
  const memory: PlaygroundMemory = {
    id: makeId(),
    namespace: "playground",
    content,
    importance: Math.max(1, Math.min(5, Math.round(importance))),
    is_active: true,
    created_at: nowIso(),
    updated_at: nowIso(),
    age_days: 0,
    tags: [...inferTopics(content)],
  };

  // Compare against the nearest active neighbours by similarity, exactly like
  // `_flag_contradictions` (which over-fetches `_CONTRADICTION_CANDIDATES`).
  const ranked = state.memories
    .filter((m) => m.is_active)
    .map((m) => ({ m, sim: illustrativeSimilarity(content, m) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, CONTRADICTION_CANDIDATES);

  const contradictions: PlaygroundContradiction[] = [];
  for (const { m, sim } of ranked) {
    const verdict = checkContradiction(content, m.content, sim);
    if (verdict.isContradiction) {
      contradictions.push({
        id: makeId(),
        namespace: "playground",
        similarity: verdict.similarity,
        reason: verdict.reason,
        status: "open",
        new_memory: memory,
        existing_memory: m,
        resolved_winner_id: null,
        created_at: nowIso(),
        resolved_at: null,
      });
    }
  }

  return {
    state: {
      memories: [...state.memories, memory],
      contradictions: [...state.contradictions, ...contradictions],
    },
    memory,
    contradictions,
  };
}

export function searchMemories(
  state: PlaygroundState,
  query: string,
  limit: number
): SearchHit[] {
  // Over-fetch by raw similarity, then re-rank by relevance — the same shape as
  // `memory_service.search`.
  const scored = state.memories
    .filter((m) => m.is_active)
    .map((m) => ({ memory: m, similarity: illustrativeSimilarity(query, m) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(1, limit) * SEARCH_OVERFETCH)
    .map(({ memory, similarity }) => ({
      memory,
      similarity,
      relevance_score: relevanceScore(similarity, memory.age_days, memory.importance),
      age_days: memory.age_days,
    }));

  scored.sort((a, b) => b.relevance_score - a.relevance_score);
  return scored.slice(0, Math.max(1, limit));
}

export function resolveContradiction(
  state: PlaygroundState,
  contradictionId: string,
  winnerMemoryId: string
): PlaygroundState {
  const contradiction = state.contradictions.find((c) => c.id === contradictionId);
  if (!contradiction || contradiction.status !== "open") return state;

  const valid = [contradiction.new_memory.id, contradiction.existing_memory.id];
  if (!valid.includes(winnerMemoryId)) return state;

  const loserId = valid.find((id) => id !== winnerMemoryId);
  return {
    memories: state.memories.map((m) =>
      m.id === loserId ? { ...m, is_active: false, updated_at: nowIso() } : m
    ),
    contradictions: state.contradictions.map((c) =>
      c.id === contradictionId
        ? {
            ...c,
            status: "resolved",
            resolved_winner_id: winnerMemoryId,
            resolved_at: nowIso(),
          }
        : c
    ),
  };
}
