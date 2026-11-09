export type DemoAction = "start" | "move" | "resolve";
export type DemoPhase = "stored" | "flagged" | "resolved";
export interface DemoHit {
  id: string;
  content: string;
  currentStatement?: string | null;
  similarity: number;
  score: number;
}

export interface DemoAvailability {
  enabled: boolean;
  status: "available" | "unavailable" | "unconfigured";
  embedding?: "cold" | "warm";
  checkedAt?: string;
  reason?: "access" | "busy" | "unreachable";
}
export interface DemoRequest {
  method: string;
  path: string;
  status: number;
  durationMs: number;
}
export interface LiveDemoResult {
  token: string;
  phase: DemoPhase;
  hits: DemoHit[];
  requests: DemoRequest[];
  change?: string;
  reason?: string;
  previousActive?: boolean;
}
