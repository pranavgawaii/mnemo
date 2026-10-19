import {
  AlertTriangle,
  Check,
  LayoutGrid,
  Layers,
  PlayCircle,
  Search,
  Settings,
  UserPlus,
} from "lucide-react";
import { LogoMark } from "./logo";

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "accent" | "danger" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "danger"
        ? "text-[#B91C1C]"
        : tone === "warning"
          ? "text-[#B45309]"
          : "text-ink";
  return (
    <div className="flex items-center text-[11px]">
      <span className="w-[74px] text-faint shrink-0">{label}</span>
      <span className={`text-[11.5px] font-medium ${toneClass}`}>{value}</span>
    </div>
  );
}

export function MemoryWindow() {
  return (
    <div className="w-full relative">
      {/* Ambient glow under the window. Kept vertically inside the card: the
          blobs stop well above its bottom edge so the 90px blur can't leak into
          the stack strip underneath (it used to wash the chips). */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[70px] bottom-[150px] -left-[70px] w-[360px] bg-[#C7D2FE] rounded-full blur-[90px] opacity-50 mix-blend-multiply" />
        <div className="absolute top-[90px] bottom-[150px] left-1/2 -translate-x-1/2 w-[560px] bg-[#E7D9FB] rounded-full blur-[90px] opacity-45 mix-blend-multiply" />
        <div className="absolute top-[70px] bottom-[150px] -right-[70px] w-[360px] bg-[#BFE3F7] rounded-full blur-[90px] opacity-45 mix-blend-multiply" />
      </div>

      <div className="w-full bg-white/30 backdrop-blur-[40px] rounded-[24px] border border-white/60 shadow-[0_28px_56px_-26px_rgba(40,25,70,0.18)] flex sm:pr-2 sm:py-2 sm:pl-0">
        {/* LEFT ICON RAIL */}
        <div className="hidden sm:flex w-[44px] flex-col items-center py-2 gap-3 shrink-0">
          <div className="w-7 h-7 flex items-center justify-center mb-1">
            <LogoMark className="w-[22px] h-[22px] text-ink" />
          </div>

          <div className="w-7 h-7 flex items-center justify-center text-ink/45 hover:text-ink hover:bg-white/40 rounded-[8px] transition-all">
            <LayoutGrid className="w-[14px] h-[14px]" strokeWidth={1.5} />
          </div>
          {/* active: no background, darker */}
          <div className="w-7 h-7 flex items-center justify-center text-ink">
            <Search className="w-[14px] h-[14px]" strokeWidth={2} />
          </div>
          <div className="w-7 h-7 flex items-center justify-center text-ink/45 hover:text-ink hover:bg-white/40 rounded-[8px] transition-all">
            <Layers className="w-[14px] h-[14px]" strokeWidth={1.5} />
          </div>
          <div className="w-7 h-7 flex items-center justify-center text-ink/45 hover:text-ink hover:bg-white/40 rounded-[8px] transition-all">
            <AlertTriangle className="w-[14px] h-[14px]" strokeWidth={1.5} />
          </div>
          <div className="w-7 h-7 flex items-center justify-center text-ink/45 hover:text-ink hover:bg-white/40 rounded-[8px] transition-all">
            <Settings className="w-[14px] h-[14px]" strokeWidth={1.5} />
          </div>
        </div>

        {/* INNER WHITE PANEL */}
        <div className="flex-1 flex flex-col bg-white rounded-[16px] shadow-sm border border-white/50 overflow-hidden relative">
          {/* TOP HEADER */}
          <div className="h-[56px] border-b border-gray-100 flex items-center px-4 sm:px-6 shrink-0 bg-white">
            <div className="flex items-center gap-2.5 text-[13px] font-medium text-muted min-w-0">
              <Search className="w-[17px] h-[17px] text-[#A3A3A3] shrink-0" strokeWidth={2} />
              <span className="shrink-0">Recall</span>
              <span className="text-[#D4D4D4] shrink-0">›</span>
              <span className="text-ink font-semibold truncate">
                Where does Pranav live?
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0 pl-3">
              <span className="hidden sm:inline font-mono text-[11px] text-faint">
                namespace: default
              </span>
              <span className="bg-white text-muted px-3 py-1 rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 border border-[#E5E5E5] shadow-sm">
                <Check className="w-3 h-3 text-[#22C55E]" strokeWidth={3} />
                Live
              </span>
            </div>
          </div>

          {/* MAIN PANELS */}
          <div className="flex h-[520px] lg:h-[620px] overflow-hidden font-medium tracking-tight">
            {/* LEFT PANEL: meta */}
            <div className="hidden lg:flex flex-col p-5 w-[220px] bg-white border-r border-[#E5E5E5] shrink-0 overflow-y-auto">
              <div className="mb-4">
                <div className="text-[11px] font-bold text-accent mb-[6px]">
                  RECALL
                </div>
                <div className="text-[11px] text-muted mb-1">
                  #128 · recall
                </div>
                <h3 className="font-bold text-ink text-[18px] mb-2 leading-[1.2]">
                  Where does Pranav live?
                </h3>
                <p className="text-[12px] text-muted leading-[1.6]">
                  Embedded locally, matched against 3 memories in the{" "}
                  <span className="font-mono">default</span> namespace, then
                  re-ranked by relevance.
                </p>
              </div>

              <div className="border-t border-[#E5E5E5] my-4" />

              <div className="flex flex-col gap-3">
                <Row label="Ranking" value={<span className="font-mono text-[10.5px]">sim × decay × imp</span>} />
                <Row label="Half-life" value="180 days" />
                <Row label="Floor" value="0.70" />
                <Row label="Gate" value="0.82" />
              </div>

              <div className="border-t border-[#E5E5E5] my-4" />

              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase text-faint tracking-wider font-bold">
                    Top relevance
                  </span>
                  <span className="text-[11px] font-bold text-ink">0.89</span>
                </div>
                <div className="w-full h-1 bg-[#F3F4F6] rounded-full overflow-hidden mb-1.5">
                  <div className="h-full w-[89%] bg-accent rounded-full" />
                </div>
                <div className="text-[10px] text-muted font-medium">
                  sim 0.85 · importance 4
                </div>
              </div>

              <div className="border-t border-[#E5E5E5] my-4" />

              <div className="flex flex-col gap-2.5">
                <div className="flex items-center text-[11px]">
                  <span className="w-[74px] text-faint shrink-0">Index</span>
                  <span className="text-ink">HNSW · cosine</span>
                </div>
                <div className="flex items-center text-[11px]">
                  <span className="w-[74px] text-faint shrink-0">Embedding</span>
                  <span className="text-ink">384-d</span>
                </div>
                <div className="flex items-center text-[11px]">
                  <span className="w-[74px] text-faint shrink-0">Over-fetch</span>
                  <span className="text-ink">4× limit</span>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: activity */}
            <div className="flex-1 bg-[#FAFAFA] flex flex-col overflow-hidden relative">
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FAFAFA] to-transparent z-10 pointer-events-none" />

              <div className="h-[40px] border-b border-[#E5E5E5] px-4 sm:px-5 flex items-center gap-5 shrink-0 bg-[#FAFAFA]/90 backdrop-blur-md z-20">
                <div className="text-[11px] text-ink border-b-2 border-ink h-[40px] flex items-center px-1">
                  Recall
                </div>
                <div className="text-[11px] text-muted">Stored</div>
                <div className="text-[11px] text-muted">Contradictions</div>
              </div>

              <div className="p-4 pb-20">
                <div className="relative border-l-[2px] border-transparent ml-2.5 pl-5 flex flex-col gap-3">
                  <div className="animate-draw-line absolute left-[-2px] top-2 bottom-2 w-[2px] bg-[#E5E5E5] z-0" />

                  {/* 1. stored */}
                  <div className="relative animate-cascade" style={{ animationDelay: "1400ms" }}>
                    <div className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-[#E5E5E5] border-[2px] border-[#FAFAFA]" />
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] text-ink">Memory stored</span>
                      <span className="text-[10px] text-faint font-normal">• 3 days ago</span>
                    </div>
                    <p className="text-[11px] text-ink leading-[1.5]">
                      Pranav lives in Bengaluru{" "}
                      <span className="font-mono bg-[#F0F0F0] px-1 py-0.5 rounded text-[10px] text-muted">
                        importance 4
                      </span>
                    </p>
                  </div>

                  {/* 2. recall */}
                  <div className="relative animate-cascade" style={{ animationDelay: "2200ms" }}>
                    <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center shadow-sm">
                      <Search className="w-[8px] h-[8px] text-accent" strokeWidth={2.5} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted">Recall returned</span>
                      <span className="text-[11px] text-ink font-mono">3 hits</span>
                      <span className="text-[10px] text-faint font-normal">· just now</span>
                    </div>
                  </div>

                  {/* 3. finding + code */}
                  <div className="relative animate-cascade" style={{ animationDelay: "3000ms" }}>
                    <div className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-accent border-[2px] border-[#FAFAFA]" />
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] text-ink">Finding</span>
                      <span className="text-[10px] text-faint font-normal">• just now</span>
                    </div>
                    <p className="text-[11px] text-ink mb-2">
                      Over-fetched 12 candidates, re-ranked in Python, returned the head
                      of the list.
                    </p>

                    <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden shadow-sm font-mono text-[10px] font-normal">
                      <div className="bg-[#F7F7F5] border-b border-[#E5E5E5] px-2 py-1 flex items-center text-muted">
                        recall · result
                      </div>
                      <div className="p-2 overflow-x-auto leading-[1.7] whitespace-nowrap">
                        <div>
                          <span className="text-[#A3A3A3]">1</span>{" "}
                          <span className="text-[#6B7280]">content</span>
                          <span className="text-[#6B7280]">: </span>
                          <span className="text-ink">&quot;Pranav lives in Bengaluru&quot;</span>
                        </div>
                        <div>
                          <span className="text-[#A3A3A3]">2</span>{" "}
                          <span className="text-[#6B7280]">similarity</span>
                          <span className="text-[#6B7280]">: </span>
                          <span className="text-[#15803D]">0.85</span>
                          <span className="text-[#6B7280]">, relevance_score: </span>
                          <span className="text-[#15803D]">0.89</span>
                        </div>
                        <div>
                          <span className="text-[#A3A3A3]">3</span>{" "}
                          <span className="text-[#6B7280]">age_days</span>
                          <span className="text-[#6B7280]">: </span>
                          <span className="text-[#15803D]">0.0</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. fact */}
                  <div className="relative animate-cascade" style={{ animationDelay: "3800ms" }}>
                    <div className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-[#E5E5E5] border-[2px] border-[#FAFAFA]" />
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] text-ink">Fact</span>
                      <span className="text-[10px] text-faint font-normal">• just now</span>
                    </div>
                    <p className="text-[11px] text-ink">
                      Decay is floored at 0.7, so the recency penalty is capped at
                      30% — an old memory can never bury a clearly better match.
                    </p>
                  </div>

                  {/* 5. resolution */}
                  <div className="relative animate-cascade" style={{ animationDelay: "4600ms" }}>
                    <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center shadow-sm">
                      <UserPlus className="w-[8px] h-[8px] text-[#6B7280]" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted">Contradiction resolved</span>
                      <span className="text-[11px] text-ink font-mono">loser is_active = false</span>
                    </div>
                  </div>

                  {/* 6. deterministic check card */}
                  <div className="relative animate-cascade" style={{ animationDelay: "5400ms" }}>
                    <div className="absolute -left-[32px] top-0.5 w-6 h-6 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center shadow-sm z-10">
                      <div className="w-2.5 h-2.5 rounded-full bg-accent flex items-center justify-center" />
                    </div>

                    <div className="bg-white border border-[#E5E5E5] rounded-xl p-3 shadow-sm mt-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[11px] text-ink font-semibold">
                          Deterministic check
                        </span>
                        <span className="text-[10px] text-faint font-normal">just now</span>
                      </div>
                      <p className="text-[11px] text-ink mb-3 leading-[1.5]">
                        Similarity gate passed at 0.87, then a negation marker was found
                        on exactly one side. No LLM call.
                      </p>
                      <div className="bg-[#F7F7F5] border border-[#E5E5E5] rounded-lg p-2.5 flex items-center gap-2">
                        <PlayCircle className="w-3 h-3 text-accent shrink-0" strokeWidth={2} />
                        <span className="text-[10px] text-muted leading-[1.6] font-normal">
                          negation marker(s) on one side only: no longer
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
