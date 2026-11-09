import type { WorkbenchModel } from "./use-workbench";

export function MemoryComposer({ model }: { model: WorkbenchModel }) {
  return (
    <div>
      <h2 className="text-[16px] font-medium text-ink">
        <span className="mr-2 text-[12px] text-accent-ink">2</span> Store a fact
      </h2>
      <form onSubmit={model.handleStore} className="mt-4 flex gap-2">
        <label htmlFor="wb-store" className="sr-only">
          New memory
        </label>
        <input
          id="wb-store"
          name="memory"
          autoComplete="off"
          required
          maxLength={1000}
          value={model.draft}
          onChange={(event) => model.setDraft(event.target.value)}
          placeholder={`${model.scenario.change}…`}
          className="h-11 min-w-0 flex-1 scroll-mt-24 rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-faint focus:border-accent"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-lg border border-accent/20 bg-accent-soft px-3.5 text-[12px] font-medium text-accent-ink transition-colors hover:bg-[#E0E4FF]"
        >
          Store memory
        </button>
      </form>
      <button
        type="button"
        onClick={model.tryConflict}
        className="mt-3 min-h-8 text-[12px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-accent-ink"
      >
        Use a sample conflict
      </button>
    </div>
  );
}
