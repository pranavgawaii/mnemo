import type { PlaygroundContradiction } from "@/lib/memory/simulation";

export function ConflictCard({
  conflict,
  onResolve,
  compact = false,
}: {
  conflict: PlaygroundContradiction;
  onResolve: (id: string, winnerId: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[#FDE68A] bg-[#FFFCF4] ${compact ? "p-3 sm:p-4" : "p-4"}`}
    >
      <p className="mb-3 text-[12px] font-medium text-[#92400E]">
        Both facts are active until you choose.
      </p>
      <p
        className={`break-words ${compact ? "text-[13px] leading-[18px] line-clamp-2 sm:text-[14px] sm:leading-relaxed sm:line-clamp-3" : "text-[14px] leading-relaxed"} text-ink`}
      >
        <span className="mr-2 font-mono text-[10px] uppercase tracking-wider text-[#92400E]">
          New
        </span>
        {conflict.new_memory.content}
      </p>
      <p
        className={`mt-3 break-words ${compact ? "text-[13px] leading-[18px] line-clamp-2 sm:text-[14px] sm:leading-relaxed sm:line-clamp-3" : "text-[14px] leading-relaxed"} text-muted`}
      >
        <span className="mr-2 font-mono text-[10px] uppercase tracking-wider">
          Existing
        </span>
        {conflict.existing_memory.content}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onResolve(conflict.id, conflict.new_memory.id)}
          className="min-h-10 rounded-lg border border-[#FDE68A] bg-white px-3 text-[12px] text-[#92400E] transition-colors hover:bg-[#FEF3C7]"
        >
          Keep new
        </button>
        <button
          type="button"
          onClick={() => onResolve(conflict.id, conflict.existing_memory.id)}
          className="min-h-10 rounded-lg border border-line bg-white px-3 text-[12px] text-muted transition-colors hover:text-ink"
        >
          Keep existing
        </button>
      </div>
    </div>
  );
}
