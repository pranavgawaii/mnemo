import type { WorkbenchModel } from "./use-workbench";

export function MemoryComposer({ model }: { model: WorkbenchModel }) {
  return (
    <div>
      <h2 className="text-[16px] font-medium text-ink">
        <span className="mr-2 text-[12px] text-accent-ink">2</span> Store a fact
      </h2>
      <form onSubmit={model.handleStore} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="wb-store" className="sr-only">
          New memory
        </label>
        <textarea
          id="wb-store"
          name="memory"
          autoComplete="off"
          required
          maxLength={1000}
          value={model.draft}
          onChange={(event) => model.setDraft(event.target.value)}
          placeholder={`${model.scenario.change}…`}
          rows={2}
          className="h-[100px] min-w-0 resize-none scroll-mt-24 rounded-lg border border-line bg-white px-3 py-2.5 text-[16px] leading-6 sm:h-11 sm:flex-1 sm:text-[13px] sm:leading-5 text-ink placeholder:text-faint focus:border-accent"
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
        {model.scenario.kind === "review" ? "Use a sample conflict" : "Use suggested note"}
      </button>
      <p className="mt-2 h-[54px] text-[12px] leading-[18px] text-muted sm:h-9">
        {model.scenario.kind === "review"
          ? "A supported change is flagged for review. Nothing is replaced automatically."
          : model.scenario.kind === "uncertain"
            ? "Plans stay as notes. The demo does not infer that a future event has happened."
            : "Compatible details stay active together. A new fact does not always mean a conflict."}
      </p>
    </div>
  );
}
