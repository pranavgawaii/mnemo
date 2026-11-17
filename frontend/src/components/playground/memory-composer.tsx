import type { WorkbenchModel } from "./use-workbench";

export function MemoryComposer({ model }: { model: WorkbenchModel }) {
  return (
    <div className="min-w-0">
      <h2 id="wb-store-heading" className="text-[16px] font-medium text-ink">
        <span className="mr-2 text-[12px] text-accent-ink">2</span> Store a fact
      </h2>
      <form
        aria-labelledby="wb-store-heading"
        onSubmit={(event) => {
          const field = event.currentTarget.elements.namedItem("memory") as HTMLTextAreaElement;
          if (!field.value.trim()) {
            event.preventDefault();
            field.setCustomValidity("Enter a fact, not just spaces.");
            field.reportValidity();
            field.focus();
            return;
          }
          model.handleStore(event);
        }}
        className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row"
      >
        <label htmlFor="wb-store" className="sr-only">
          New memory
        </label>
        <textarea
          id="wb-store"
          name="memory"
          aria-describedby="wb-store-hint"
          autoComplete="off"
          required
          maxLength={1000}
          value={model.draft}
          onChange={(event) => {
            event.target.setCustomValidity("");
            model.setDraft(event.target.value);
          }}
          placeholder={`${model.scenario.change}…`}
          rows={2}
          className="h-20 min-h-20 w-full min-w-0 resize-y scroll-mt-24 rounded-lg border border-line bg-white px-3 py-2.5 text-[16px] leading-6 sm:h-11 sm:min-h-11 sm:flex-1 sm:text-[13px] sm:leading-5 text-ink placeholder:text-faint focus:border-accent"
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
      <p id="wb-store-hint" className="mt-1 min-h-9 text-[12px] leading-[18px] text-muted sm:mt-2">
        {model.reviewOutcome
          ? "Review complete. The inactive fact stays in history."
          : model.scenario.kind === "review"
          ? "Both facts stay active until you review the change."
          : model.scenario.kind === "uncertain"
            ? "A plan stays a note until confirmed."
            : "Compatible facts stay active together."}
      </p>
    </div>
  );
}
