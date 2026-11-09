"use client";

import { useState } from "react";
import { ArrowRight, Bot, Check, RotateCcw } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { useMemoryStore } from "@/hooks/use-memory-store";
import { initialPlaygroundState } from "@/lib/memory/simulation";

function exampleStore() {
  const seed = initialPlaygroundState();
  return {
    memories: seed.memories.filter((memory) => memory.id === "m1"),
    contradictions: [],
  };
}

const STAGES = [
  "Session 1: supply a fact",
  "Session 2: recall the context",
  "A change: review both sides",
];
type Stage = "stored" | "recalled" | "flagged" | "resolved";

export function AgentMemoryDemo() {
  const { store, add, resolve, reset, search } = useMemoryStore(exampleStore);
  const [stage, setStage] = useState<Stage>("stored");
  const [notice, setNotice] = useState("");
  const phase = stage === "stored" ? 0 : stage === "recalled" ? 1 : 2;

  function advance() {
    if (stage === "stored") {
      const hit = search("Where does Pranav live?", 1)[0];
      setNotice(`Recalled: ${hit.memory.content}.`);
      setStage("recalled");
    } else if (stage === "recalled") {
      add("Pranav no longer lives in Bengaluru", 4);
      setNotice(
        "A possible conflict was flagged. Both facts remain active until review.",
      );
      setStage("flagged");
    } else if (stage === "flagged") {
      const conflict = store.contradictions[0];
      resolve(conflict.id, conflict.new_memory.id);
      setNotice("The new fact was kept. The previous fact is now inactive.");
      setStage("resolved");
    } else {
      reset();
      setStage("stored");
      setNotice("Example reset.");
    }
  }

  const action = {
    stored: "Recall the fact",
    recalled: "Introduce a change",
    flagged: "Keep the new fact",
    resolved: "Replay example",
  }[stage];

  return (
    <section
      id="agent-example"
      className="scroll-mt-20 border-y border-line bg-white py-16 md:py-24"
    >
      <div className="mx-auto grid max-w-frame items-center gap-10 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="text-[12px] font-medium text-accent-ink">
            An agent, across sessions
          </p>
          <h2 className="mt-5 max-w-[420px] text-balance text-[32px] font-medium leading-[1.15] tracking-[-0.03em] text-ink md:text-[42px]">
            The conversation ends.
            <br />
            The context stays.
          </h2>
          <p className="mt-5 max-w-[390px] text-[14px] leading-[1.8] text-muted">
            A user changes where they live. See how an agent recalls the old
            fact, flags the change and lets you decide what stays.
          </p>
          <ol className="mt-7 space-y-3">
            {STAGES.map((label, index) => (
              <li
                key={label}
                aria-current={phase === index ? "step" : undefined}
                className={`flex items-center gap-3 text-[13px] ${index <= phase ? "text-ink" : "text-faint"}`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${index < phase || stage === "resolved" ? "border-accent/25 bg-accent-soft text-accent-ink" : "border-line"}`}
                >
                  {index < phase || stage === "resolved" ? (
                    <Check aria-hidden="true" className="h-3 w-3" />
                  ) : (
                    index + 1
                  )}
                </span>
                {label}
              </li>
            ))}
          </ol>
          <a
            href="/playground"
            className="mt-7 inline-flex items-center gap-2 text-[13px] font-medium text-accent-ink underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
          >
            Try your own example{" "}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="min-w-0 rounded-2xl border border-line bg-background p-4 shadow-soft sm:p-7">
          <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
            <span>Memory between sessions</span>
            <span className="rounded-full border border-line bg-white px-2.5 py-1">
              Browser simulation
            </span>
          </div>
          <div className="relative my-7 flex items-center justify-between px-3 sm:px-8">
            <div className="relative z-10 flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[12px] text-ink">
              <Bot aria-hidden="true" className="h-5 w-5 text-muted" /> Your
              agent
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-x-8 top-1/2 border-t border-dashed border-accent/25"
            />
            {stage !== "stored" && (
              <div key={stage} aria-hidden="true" className="agent-transfer">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_12px_rgba(79,70,229,0.3)]" />
              </div>
            )}
            <div className="relative z-10 flex items-center gap-2 rounded-xl border border-accent/20 bg-white px-3 py-2.5 text-[12px] text-ink">
              <LogoMark className="h-5 w-5" /> Mnemo
            </div>
          </div>
          <div
            data-lenis-prevent
            tabIndex={0}
            role="region"
            aria-label="Agent example state"
            className="h-[360px] scroll-stable overflow-y-auto rounded-xl border border-line bg-white p-5 sm:h-[310px] sm:p-6"
          >
            <p className="text-[12px] text-muted">
              {phase === 0
                ? "A fact supplied by your application"
                : phase === 1
                  ? "Context returned for the next session"
                  : stage === "resolved"
                    ? "Review complete"
                    : "A possible conflict needs a decision"}
            </p>
            <div className="mt-5 space-y-3">
              {stage === "recalled" && (
                <p className="rounded-lg border border-dashed border-accent/20 px-3.5 py-2.5 text-[12px] text-accent-ink">
                  Agent asks: Where does Pranav live?
                </p>
              )}
              {store.memories.map((memory) => (
                <div
                  key={memory.id}
                  className={`rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed ${!memory.is_active ? "border-line text-muted" : stage === "flagged" ? "border-[#F2D7AA] bg-[#FFFCF5] text-ink" : "border-line bg-background/50 text-ink"}`}
                >
                  <span className="mb-1 block text-[11px] text-muted">
                    {memory.id === "m1" ? "Stored fact" : "New fact"}
                  </span>
                  <p className={!memory.is_active ? "line-through" : ""}>
                    {memory.content}
                  </p>
                  {!memory.is_active && (
                    <span className="mt-1 block text-[11px] no-underline">
                      Kept in history · inactive
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              {stage === "flagged"
                ? "A flag is a prompt to review, not a truth verdict."
                : stage === "resolved"
                  ? "The losing row stays available for inspection."
                  : "No model credentials or backend requests in this example."}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={advance}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#27272A]"
            >
              {stage === "resolved" ? (
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {action}
            </button>
            <span className="text-[12px] text-muted">
              You control the next step
            </span>
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {notice}
          </p>
        </div>
      </div>
    </section>
  );
}
