/** Fixed synthetic examples shared by the UI and server-only API proxy. */
export const LIVE_SCENARIOS = {
  relocation: {
    label: "Move city",
    previous: "Demo user lives in Bengaluru",
    change: "Demo user moved from Bengaluru to Pune",
    question: "Where does Demo user live?",
    introduce: "Move from Bengaluru to Pune",
    keep: "Keep Pune and recall",
  },
  preference: {
    label: "Food preference",
    previous: "Demo user's favourite cuisine is Thai",
    change: "Demo user's favourite cuisine changed from Thai to Japanese",
    question: "What is Demo user's favourite cuisine?",
    introduce: "Change Thai to Japanese",
    keep: "Keep Japanese and recall",
  },
  learning: {
    label: "Learning goal",
    previous: "Demo user is learning Rust on weekends",
    change: "Demo user switched from learning Rust on weekends to learning Go on weekends",
    question: "What is Demo user learning?",
    introduce: "Switch Rust to Go",
    keep: "Keep Go and recall",
  },
  routine: {
    label: "Running routine",
    previous: "Demo user runs 5 kilometres three mornings a week",
    change: "Demo user changed running routine from 5 kilometres three mornings a week to 3 kilometres twice a week",
    question: "How often does Demo user run?",
    introduce: "Change distance and frequency",
    keep: "Keep new routine and recall",
  },
} as const;

export type DemoScenarioId = keyof typeof LIVE_SCENARIOS;
export function isDemoScenario(value: unknown): value is DemoScenarioId {
  return typeof value === "string" && Object.hasOwn(LIVE_SCENARIOS, value);
}
