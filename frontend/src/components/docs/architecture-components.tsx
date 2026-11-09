import {
  Bot,
  Cpu,
  Database,
  Layers,
  Server,
  UserRound,
  Webhook,
  Workflow,
} from "lucide-react";
import { SystemMap } from "./system-map";

const PROCESS_NODES = [
  {
    icon: Server,
    title: "FastAPI",
    detail: "API key checks, scopes, validation and observability.",
  },
  {
    icon: Layers,
    title: "Memory service",
    detail: "Calls the encoder and database to store, rank and review facts.",
  },
  {
    icon: Cpu,
    title: "MiniLM encoder",
    detail: "Local · all-MiniLM-L6-v2 · 384 dimensions.",
  },
  {
    icon: Workflow,
    title: "Job worker",
    detail: "In-process thread. Polls persisted jobs and delivers webhooks.",
  },
];

export function ArchitectureComponents({
  compact = false,
  fit = false,
}: {
  compact?: boolean;
  fit?: boolean;
}) {
  return (
    <>
      <SystemMap fit={fit} />
      <div
        className={`architecture-mobile ${compact ? "space-y-2" : "space-y-4"}`}
      >
        <div className="rounded-lg border border-line bg-background/50 p-3">
          <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
            <UserRound
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-accent-ink"
            />
            User → your application
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            {compact
              ? "Facts and questions through REST / SDK."
              : "Your app supplies facts and questions through REST or the Python SDK."}
          </p>
          <p className="mt-2 flex items-center gap-2 text-[12px] text-muted">
            <Bot aria-hidden="true" className="h-4 w-4 shrink-0" />
            Your app calls its model.
          </p>
        </div>
        <p className="text-center text-[12px] text-accent-ink">
          ↓ JSON / HTTP · X-API-Key
        </p>
        <div className="rounded-xl border border-dashed border-accent/30 bg-background p-3">
          <p className="text-[12px] font-medium text-accent-ink">
            Mnemo · one Python API process
          </p>
          <div
            className={`mt-3 grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {PROCESS_NODES.map((node) => (
              <div
                key={node.title}
                className="rounded-lg border border-line bg-white p-3"
              >
                <node.icon
                  aria-hidden="true"
                  className="mb-2 h-5 w-5 text-accent-ink"
                />
                <p className="text-[13px] font-medium text-ink">{node.title}</p>
                {!compact && (
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {node.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-[12px] text-accent-ink">
          ↕ SQL + vectors · job polling
        </p>
        <div className="rounded-xl border border-accent/25 bg-accent-soft/40 p-3">
          <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
            <Database
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-accent-ink"
            />
            PostgreSQL + pgvector
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            Facts, vectors, conflicts and persisted jobs.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-line p-3">
          <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
            <Webhook
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-accent-ink"
            />
            Optional webhook receiver
          </p>
          {!compact && (
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              The worker delivers signed HTTP POST requests with bounded
              retries.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
