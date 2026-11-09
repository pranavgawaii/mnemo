import { useTabList } from "@/hooks/use-tabs";
import { ContextResults } from "./context-results";
import { ReviewPanel } from "./review-panel";
import type { WorkbenchModel } from "./use-workbench";

/** One stable phone frame; the desktop keeps its side-by-side comparison. */
export function ResultPanels({ model }: { model: WorkbenchModel }) {
  const active = model.mobilePanel === "context" ? 0 : 1;
  const tabs = useTabList({ count: 2, active, onChange: index => model.setMobilePanel(index === 0 ? "context" : "review") });
  return (
    <>
      <div role="tablist" aria-label="Memory results" className="grid grid-cols-2 border-t border-line bg-background/40 p-2 lg:hidden">
        {["Context", `Review (${model.openConflicts.length})`].map((label, index) => (
          <button key={index} ref={tabs.register(index)} id={`results-tab-${index}`} type="button" role="tab"
            aria-selected={active === index} aria-controls={`results-panel-${index}`} tabIndex={active === index ? 0 : -1}
            onClick={() => model.setMobilePanel(index === 0 ? "context" : "review")} onKeyDown={tabs.onKeyDown}
            className={`min-h-11 rounded-lg text-[13px] ${active === index ? "border border-line bg-white font-medium text-accent-ink" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div id="results-panel-0" role="tabpanel" aria-labelledby="results-tab-0" className={active === 0 ? "block" : "hidden lg:block"}>
          <ContextResults model={model} />
        </div>
        <div id="results-panel-1" role="tabpanel" aria-labelledby="results-tab-1" className={active === 1 ? "block" : "hidden lg:block"}>
          <ReviewPanel model={model} />
        </div>
      </div>
    </>
  );
}
