import type { PlaygroundMemory } from "../../lib/playground";

export type Mode = "relevance" | "similarity";
export type Method = "GET" | "POST";

export interface Row {
  memory: PlaygroundMemory;
  similarity: number;
  ageDays: number;
  decay: number;
  weight: number;
  relevance: number;
}

export interface LogEntry {
  id: number;
  method: Method;
  path: string;
  status: number;
  detail: string;
}
