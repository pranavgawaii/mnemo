"use client";

import { useState } from "react";
import { useTabList } from "@/hooks/use-tabs";
import { MemoryWorkbench } from "./memory-workbench";
import { useDemoAvailability } from "./use-demo-availability";
import { LiveApiDemo } from "./live-api-demo";

export function PlaygroundExperience() {
  const availabilityState = useDemoAvailability();
  const { availability, checking } = availabilityState;
  const [mode, setMode] = useState(0);
  const tabs = useTabList({ count: 2, active: mode, onChange: setMode });
  return (
    <>
      <div className="mx-auto max-w-frame px-4 pt-3 sm:px-6">
        <div
          role="tablist"
          aria-label="Playground mode"
          className="inline-flex gap-1 rounded-lg border border-line bg-white p-1"
        >
          {["Browser demo", "Live API"].map((name, index) => (
            <button
              key={name}
              ref={tabs.register(index)}
              id={`demo-mode-${index}`}
              type="button"
              role="tab"
              aria-selected={mode === index}
              aria-controls="playground-mode-panel"
              tabIndex={mode === index ? 0 : -1}
              onKeyDown={tabs.onKeyDown}
              onClick={() => setMode(index)}
              className={`min-h-9 rounded-md px-3 text-[12px] ${mode === index ? "bg-accent-soft font-medium text-accent-ink" : "text-muted hover:text-accent-ink"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <p aria-live="polite" className="flex h-[60px] items-center gap-2 text-[12px] sm:h-11 text-muted">
          {checking ? "Checking local API availability…" : availability?.status === "available"
            ? "Live API connected. Browser demo works offline."
            : availability?.status === "unconfigured"
              ? "Browser demo works offline. Live API requires local setup."
              : "Live API unavailable. Browser demo works offline."}
          {!checking && availability?.status !== "available" && (
            <a href="/docs#live-api-setup" className="shrink-0 text-accent-ink underline underline-offset-4">Setup guide</a>
          )}
        </p>
      </div>
      <div
        id="playground-mode-panel"
        role="tabpanel"
        aria-labelledby={`demo-mode-${mode}`}
      >
        {mode === 0 ? <MemoryWorkbench /> : <LiveApiDemo availabilityState={availabilityState} />}
      </div>
    </>
  );
}
