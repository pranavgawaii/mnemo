export function Metric({
  label,
  value,
  display,
  accent = false,
}: {
  label: string;
  value: number;
  display: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-faint">
          {label}
        </span>
        <span
          className={`font-mono text-[10px] tabular-nums ${
            accent ? "text-accent-ink" : "text-ink"
          }`}
        >
          {display}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-hairline">
        <div
          className={`h-full rounded-full ${accent ? "bg-accent" : "bg-ink/25"}`}
          style={{ width: `${Math.max(3, Math.min(100, value * 100))}%` }}
        />
      </div>
    </div>
  );
}
