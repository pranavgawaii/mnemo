/** Guided inputs over the same six facts; selecting one never changes the store. */
export const MEMORY_SCENARIOS = [
  {
    id: "relocation",
    label: "Move city",
    query: "Where does Pranav live?",
    change: "Pranav moved from Bengaluru to Pune",
    hint: "Match the old city, review the move and recall Pune.",
    kind: "review",
  },
  {
    id: "location",
    label: "Location",
    query: "Where does Pranav live?",
    change: "Pranav no longer lives in Bengaluru",
    hint: "Review a location that is no longer current.",
    kind: "review",
  },
  {
    id: "learning",
    label: "Learning",
    query: "What is Pranav learning?",
    change: "Pranav switched from learning Rust on weekends to learning Go on weekends",
    hint: "Replace a learning goal, keeping the original in history.",
    kind: "review",
  },
  {
    id: "routine",
    label: "Routine",
    query: "How often does Pranav run?",
    change: "Pranav changed running routine from 5 kilometres three mornings a week to 3 kilometres twice a week",
    hint: "Review a change in both distance and frequency.",
    kind: "review",
  },
  {
    id: "preferences",
    label: "Preferences",
    query: "What food does Pranav like?",
    change: "Pranav's favourite cuisine changed from Thai to Japanese",
    hint: "Change a preference without replacing dietary restrictions.",
    kind: "review",
  },
  {
    id: "travel-plan",
    label: "Travel plan",
    query: "Where does Pranav live?",
    change: "Pranav might move from Bengaluru to Pune next year",
    hint: "A possible future move is a note, not a confirmed new home.",
    kind: "uncertain",
  },
  {
    id: "new-detail",
    label: "New detail",
    query: "What food does Pranav like?",
    change: "Pranav likes Japanese food too",
    hint: "Another food preference can coexist with a favourite cuisine.",
    kind: "separate",
  },
] as const;

export type MemoryScenario = (typeof MEMORY_SCENARIOS)[number];

export interface ReviewOutcome {
  previous: string;
  incoming: string;
  kept: string;
  archived: string;
  recall: {
    query: string;
    mode: "relevance" | "similarity";
    timeOffset: number;
    before: { id: string; content: string }[];
    after: { id: string; content: string }[];
  };
}
