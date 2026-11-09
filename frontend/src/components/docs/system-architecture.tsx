"use client";

import { useId, useState } from "react";
import { Maximize2 } from "lucide-react";
import { useTabList } from "@/hooks/use-tabs";
import { ExpandedView } from "@/components/ui/expanded-view";
import { ArchitectureComponents } from "./architecture-components";
import { MemoryUserFlow } from "./memory-user-flow";

export function SystemArchitecture() {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const id = useId();
  const inlineTabs = useTabList({ count: 2, active, onChange: setActive });
  const expandedTabs = useTabList({ count: 2, active, onChange: setActive });
  function navigation(modal = false) {
    const tabs = modal ? expandedTabs : inlineTabs;
    const prefix = modal ? `${id}-expanded` : id;
    return (
      <div
        role="tablist"
        aria-label="Architecture views"
        className="inline-flex gap-1 rounded-lg bg-background p-1"
      >
        {["System map", "User flow"].map((label, index) => (
          <button
            key={label}
            ref={tabs.register(index)}
            id={`${prefix}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls={`${prefix}-panel`}
            tabIndex={active === index ? 0 : -1}
            onKeyDown={tabs.onKeyDown}
            onClick={() => setActive(index)}
            className={`min-h-10 rounded-md px-2 text-[12px] transition-colors sm:px-3 sm:text-[13px] ${active === index ? "bg-white font-medium text-ink shadow-sm" : "text-muted hover:text-accent-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <figure
      aria-label="Mnemo system architecture"
      className="overflow-hidden rounded-xl border border-line bg-white"
    >
      <div className="border-b border-line px-3 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          {navigation()}
          <button
            type="button"
            aria-label="Expand architecture"
            aria-haspopup="dialog"
            onClick={() => setExpanded(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-line px-2 text-[13px] text-muted transition-colors hover:text-accent-ink sm:px-3"
          >
            <Maximize2 aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Expand</span>
          </button>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          {active === 0
            ? "Process and storage boundaries"
            : "Remember · recall · review"}
        </p>
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${active}`}
        className="architecture-panel h-[640px] p-4 sm:h-[680px] sm:p-5"
      >
        {active === 0 ? (
          <ArchitectureComponents compact />
        ) : (
          <>
            <div className="architecture-map">
              <MemoryUserFlow />
            </div>
            <div className="architecture-mobile">
              <MemoryUserFlow compact />
            </div>
          </>
        )}
      </div>
      <figcaption className="border-t border-line bg-background/60 px-4 py-4 text-[13px] leading-relaxed text-muted sm:px-5">
        The Browser demo runs offline. The optional Live API walkthrough reaches
        the API through a separate Next.js server proxy; neither demo calls your
        model. The map shows the default local encoder; optional model conflict
        verdicts add a configured provider call. Webhook delivery is at least
        once; the worker can be disabled for external processing.
      </figcaption>
      <ExpandedView
        contentKey={`${active}-${zoomed}`}
        open={expanded}
        onClose={() => setExpanded(false)}
        title="System architecture"
        description="Inspect the process boundary and data paths, or follow remember, recall and review."
        toolbar={
          <div className="flex items-center justify-between gap-3">
            {navigation(true)}
            {active === 0 && (
              <div className="hidden items-center gap-2 lg:flex">
                {[false, true].map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    aria-pressed={zoomed === value}
                    onClick={() => setZoomed(value)}
                    className={`min-h-10 rounded-lg border px-3 text-[13px] ${zoomed === value ? "border-accent/25 bg-accent-soft text-accent-ink" : "border-line text-muted hover:text-ink"}`}
                  >
                    {value ? "Read larger" : "Fit diagram"}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      >
        <div
          id={`${id}-expanded-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-expanded-tab-${active}`}
          className="architecture-panel mx-auto max-w-[1080px]"
        >
          {active === 0 ? (
            <ArchitectureComponents fit={!zoomed} />
          ) : (
            <MemoryUserFlow />
          )}
        </div>
      </ExpandedView>
    </figure>
  );
}
