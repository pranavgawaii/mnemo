import { ArrowRight } from "lucide-react";
import { MEMORY_SCENARIOS } from "@/lib/memory/scenarios";
import type { WorkbenchModel } from "./use-workbench";

export function RecallQuery({ model }: { model: WorkbenchModel }) {
  return (
    <div>
      <h2 className="text-[16px] font-medium text-ink">
        <span className="mr-2 text-[12px] text-accent-ink">1</span> Recall a
        fact
      </h2>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          model.runRecall();
        }}
      >
        <label htmlFor="wb-query" className="sr-only">
          Recall query
        </label>
        <input
          id="wb-query"
          name="query"
          autoComplete="off"
          required
          value={model.query}
          onChange={(event) => model.setQuery(event.target.value)}
          placeholder="Where does Pranav live?…"
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-faint focus:border-accent"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-ink px-3.5 text-[12px] font-medium text-white transition-colors hover:bg-[#27272A]"
        >
          Search{" "}
          <ArrowRight
            aria-hidden="true"
            className="hidden h-3.5 w-3.5 sm:block"
          />
        </button>
      </form>
      <div
        aria-label="Sample scenarios"
        role="group"
        className="mt-3 flex flex-wrap gap-2"
      >
        {MEMORY_SCENARIOS.map((scenario) => (
          <button
            type="button"
            key={scenario.id}
            aria-pressed={model.scenario.id === scenario.id}
            onClick={() => model.chooseScenario(scenario)}
            className={`min-h-8 rounded-full border px-3 text-[12px] transition-colors ${model.scenario.id === scenario.id ? "border-accent/20 bg-accent-soft text-accent-ink" : "border-line text-muted hover:border-accent/25 hover:text-accent-ink"}`}
          >
            {scenario.label}
          </button>
        ))}
      </div>
      <p className="mt-2 h-9 text-[12px] leading-[18px] text-muted sm:h-[18px]">
        {model.scenario.hint}
      </p>
    </div>
  );
}
