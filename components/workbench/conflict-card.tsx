import type { PlaygroundContradiction } from "../../lib/playground";

export function ConflictCard({
  conflict,
  onResolve,
}: {
  conflict: PlaygroundContradiction;
  onResolve: (id: string, winnerId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-[#FDE68A] bg-white p-2">
      <p className="truncate text-[11px] text-ink">
        <span className="mr-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#B45309]">
          new
        </span>
        {conflict.new_memory.content}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted">
        <span className="mr-1 font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
          old
        </span>
        {conflict.existing_memory.content}
      </p>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] text-faint">
          sim {conflict.similarity.toFixed(2)}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onResolve(conflict.id, conflict.new_memory.id)}
            className="rounded border border-[#FDE68A] bg-[#FFFBEB] px-1.5 py-0.5 font-mono text-[9px] text-[#B45309] transition-colors hover:bg-[#FEF3C7]"
          >
            keep new
          </button>
          <button
            type="button"
            onClick={() => onResolve(conflict.id, conflict.existing_memory.id)}
            className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[9px] text-muted transition-colors hover:text-ink"
          >
            keep old
          </button>
        </div>
      </div>
    </div>
  );
}
