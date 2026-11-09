import { AGE_PRESETS, type WorkbenchModel } from "./use-workbench";

export function RetrievalControls({ model }: { model: WorkbenchModel }) {
  return (
    <section
      aria-label="Retrieval controls"
      className="grid gap-5 border-t border-line bg-background/50 px-5 py-4 sm:px-6 lg:grid-cols-2 lg:gap-10"
    >
      <div>
        <h2 className="text-[14px] font-medium text-ink">Ranking mode</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["relevance", "similarity"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={model.mode === mode}
              onClick={() => model.setMode(mode)}
              className={`min-h-10 rounded-lg border px-3 text-[12px] transition-colors ${model.mode === mode ? "border-accent/30 bg-accent-soft text-accent-ink" : "border-line bg-white text-muted hover:border-accent/25"}`}
            >
              {mode === "relevance" ? "Base relevance" : "Similarity only"}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          Base = similarity × decay × importance. Keyword blending and MMR are
          excluded.
        </p>
      </div>
      <div>
        <label
          htmlFor="wb-age"
          className="flex items-center justify-between gap-3 text-[14px] font-medium text-ink"
        >
          Advance all memories{" "}
          <span className="font-mono text-[12px] tabular-nums">
            +{model.timeOffset} days
          </span>
        </label>
        <input
          id="wb-age"
          type="range"
          min={0}
          max={365}
          step={1}
          value={model.timeOffset}
          onPointerDown={model.beginTimeAdjustment}
          onPointerUp={model.endTimeAdjustment}
          onPointerCancel={model.endTimeAdjustment}
          onBlur={model.endTimeAdjustment}
          onKeyDown={(event) => {
            if (!event.repeat) model.beginTimeAdjustment();
          }}
          onKeyUp={model.endTimeAdjustment}
          onChange={(event) => model.setTimeOffset(Number(event.target.value))}
          className="mt-4 w-full accent-[#4F46E5]"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {AGE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={model.timeOffset === preset.value}
              onClick={() => model.setTimeOffset(preset.value)}
              className={`min-h-8 rounded-md border px-2.5 text-[11px] transition-colors ${model.timeOffset === preset.value ? "border-accent/30 bg-accent-soft text-accent-ink" : "border-line bg-white text-muted hover:border-accent/25"}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
