import { ArrowRight } from "lucide-react";
import { MEMORY_SCENARIOS } from "@/lib/memory/scenarios";
import type { WorkbenchModel } from "./use-workbench";

export function RecallQuery({ model }: { model: WorkbenchModel }) {
  return (
    <div className="min-w-0">
      <h2 className="text-[16px] font-medium text-ink">
        <span className="mr-2 text-[12px] text-accent-ink">1</span> Recall a
        fact
      </h2>
      <form
        className="mt-3 flex gap-2 sm:mt-4"
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
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-[16px] sm:text-[13px] text-ink placeholder:text-faint focus:border-accent"
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
        id="sample-scenarios"
        aria-label="Sample scenarios"
        role="group"
        className="mt-2 flex scroll-mt-24 flex-wrap gap-2 sm:mt-3"
      >
        <label htmlFor="sample-scenario" className="self-center text-[12px] text-muted">Sample scenario</label>
        <select
          id="sample-scenario"
          value={model.scenario.id}
          onChange={(event) => {
            const selected = MEMORY_SCENARIOS.find(item => item.id === event.target.value);
            if (selected) model.chooseScenario(selected);
          }}
          className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[16px] text-ink sm:w-auto sm:flex-1 sm:text-[13px]"
        >
          {MEMORY_SCENARIOS.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}
        </select>

      </div>
      <p className="mt-1 h-9 text-[12px] leading-[18px] text-muted sm:mt-2">
        {model.scenario.hint}
      </p>
    </div>
  );
}
