/** Guided inputs over the same six facts; selecting one never changes the store. */
export const MEMORY_SCENARIOS = [
  {
    id: "location",
    label: "Location",
    query: "Where does Pranav live?",
    change: "Pranav no longer lives in Bengaluru",
    hint: "Review a location that is no longer current.",
  },
  {
    id: "learning",
    label: "Learning",
    query: "What is Pranav learning?",
    change: "Pranav is no longer learning Rust on weekends",
    hint: "Update the goal a learning assistant remembers.",
  },
  {
    id: "routine",
    label: "Routine",
    query: "How often does Pranav run?",
    change: "Pranav no longer runs 5 kilometres three mornings a week",
    hint: "Review a routine that has stopped.",
  },
  {
    id: "preferences",
    label: "Preferences",
    query: "What food does Pranav like?",
    change: "Pranav's favourite cuisine is no longer Thai",
    hint: "Compare several matches as time and ranking change.",
  },
] as const;

export type MemoryScenario = (typeof MEMORY_SCENARIOS)[number];

export interface ReviewOutcome {
  previous: string;
  incoming: string;
  kept: string;
  archived: string;
}
