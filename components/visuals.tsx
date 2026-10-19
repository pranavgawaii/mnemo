/**
 * Product visuals used across the landing page. Each one is a small, static
 * mock of a real piece of Mnemo behaviour — a write, a cosine match, the decay
 * curve, or a flagged contradiction. Values are illustrative; field shapes and
 * parameters match `backend/app/models/schemas.py` and `backend/app/core/config.py`.
 */

export function StoreVisual() {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-soft p-6">
      <div className="flex items-center gap-2 border-b border-hairline pb-3">
        <span className="font-mono text-[10.5px] font-semibold text-accent-ink bg-accent-soft px-2 py-0.5 rounded">
          new memory
        </span>
        <span className="ml-auto font-mono text-[10.5px] text-faint">
          saved
        </span>
      </div>

      <p className="mt-4 text-[14px] text-ink leading-snug">
        &ldquo;Pranav is allergic to peanuts&rdquo;
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-hairline pt-4 font-mono text-[11px]">
        <div>
          <div className="text-faint">namespace</div>
          <div className="mt-1 text-ink">default</div>
        </div>
        <div>
          <div className="text-faint">importance</div>
          <div className="mt-1 text-ink">5 / 5</div>
        </div>
        <div>
          <div className="text-faint">embedding</div>
          <div className="mt-1 text-ink">384-d</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-hairline pt-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          embedded locally
        </span>
        <span className="font-mono text-[11px] text-faint">no API key</span>
      </div>
    </div>
  );
}

export function CosineVisual() {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-soft p-6">
      <svg
        viewBox="0 0 340 170"
        className="w-full h-auto"
        role="img"
        aria-label="Cosine similarity between a query vector and a memory vector"
      >
        <defs>
          <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0 0L7 3.5L0 7z" fill="#4F46E5" />
          </marker>
          <marker id="arrowMuted" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0 0L7 3.5L0 7z" fill="#9CA3AF" />
          </marker>
        </defs>

        <line x1="30" y1="140" x2="320" y2="140" stroke="#EFEFEC" strokeWidth="1" />
        <line x1="30" y1="140" x2="30" y2="20" stroke="#EFEFEC" strokeWidth="1" />

        <path d="M30 140 A 90 90 0 0 0 74 60" fill="none" stroke="#E5E5E5" strokeWidth="1" strokeDasharray="3 3" />

        <line x1="30" y1="140" x2="122" y2="42" stroke="#4F46E5" strokeWidth="1.6" markerEnd="url(#arrow)" />
        <line x1="30" y1="140" x2="96" y2="128" stroke="#9CA3AF" strokeWidth="1.4" markerEnd="url(#arrowMuted)" />

        <text x="128" y="40" className="fill-[#0A0A0F]" fontSize="11" fontFamily="monospace">query</text>
        <text x="100" y="136" className="fill-[#6B7280]" fontSize="11" fontFamily="monospace">memory</text>
        <text x="66" y="96" className="fill-[#4F46E5]" fontSize="10.5" fontFamily="monospace">cos θ</text>
      </svg>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-hairline pt-4 font-mono text-[11px]">
        <div>
          <div className="text-faint">similarity</div>
          <div className="mt-1 text-ink">0.85</div>
        </div>
        <div>
          <div className="text-faint">metric</div>
          <div className="mt-1 text-ink">cosine</div>
        </div>
        <div>
          <div className="text-faint">index</div>
          <div className="mt-1 text-ink">vector_cosine_ops</div>
        </div>
      </div>
    </div>
  );
}

export function DecayVisual() {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-soft p-6">
      <svg
        viewBox="0 0 440 200"
        className="w-full h-auto"
        role="img"
        aria-label="Exponential decay curve with a 180-day half-life, floored at 0.7"
      >
        <line x1="24" y1="170" x2="424" y2="170" stroke="#E5E5E5" strokeWidth="1" />
        <line x1="24" y1="20" x2="24" y2="170" stroke="#E5E5E5" strokeWidth="1" />

        <line x1="24" y1="20" x2="424" y2="20" stroke="#F1F1EF" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="24" y1="132.5" x2="424" y2="132.5" stroke="#4F46E5" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

        <text x="28" y="16" fontSize="10.5" fontFamily="monospace" fill="#9CA3AF">1.0</text>
        <text x="382" y="128" fontSize="10.5" fontFamily="monospace" fill="#4F46E5">floor 0.7</text>

        <polyline
          points="24,20 38.7,47.8 53.3,73.4 68,97.4 82.7,119.7 91.9,132.5"
          fill="none"
          stroke="#0A0A0F"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line x1="91.9" y1="132.5" x2="424" y2="132.5" stroke="#0A0A0F" strokeWidth="2" strokeLinecap="round" />

        <line x1="156" y1="20" x2="156" y2="170" stroke="#E5E5E5" strokeWidth="1" strokeDasharray="3 3" />
        <text x="146" y="186" fontSize="10.5" fontFamily="monospace" fill="#9CA3AF" textAnchor="middle">180d half-life</text>
      </svg>

      <div className="mt-4 rounded-lg border border-line bg-[#FCFCFB] px-4 py-3 font-mono text-[11.5px] text-ink overflow-x-auto">
        relevance = similarity × decay(age) × importance
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 font-mono text-[11px]">
        <div>
          <div className="text-faint">half-life</div>
          <div className="mt-1 text-ink">180 days</div>
        </div>
        <div>
          <div className="text-faint">floor</div>
          <div className="mt-1 text-ink">0.7</div>
        </div>
        <div>
          <div className="text-faint">importance</div>
          <div className="mt-1 text-ink">0.9 – 1.1</div>
        </div>
      </div>
    </div>
  );
}

export function ContradictionVisual() {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-soft p-6">
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-line bg-[#FCFCFB] px-4 py-3">
          <div className="font-mono text-[10.5px] text-faint mb-1.5">existing</div>
          <p className="text-[13px] text-ink leading-snug">
            Pranav lives in Bengaluru
          </p>
        </div>

        <div className="rounded-xl border border-line bg-[#FCFCFB] px-4 py-3">
          <div className="font-mono text-[10.5px] text-faint mb-1.5">new</div>
          <p className="text-[13px] text-ink leading-snug">
            Pranav no longer lives in Bengaluru
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          flagged · open
        </span>
        <span className="font-mono text-[11px] text-faint">sim 0.87 ≥ gate 0.82</span>
      </div>

      <p className="mt-4 border-t border-hairline pt-4 font-mono text-[11px] leading-[1.7] text-muted">
        Similar content (sim=0.87) with opposing polarity; negation marker(s) on
        one side only: no longer.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[11px]">
        <div>
          <div className="text-faint">resolution</div>
          <div className="mt-1 text-ink">explicit</div>
        </div>
        <div>
          <div className="text-faint">loser</div>
          <div className="mt-1 text-ink">is_active = false</div>
        </div>
      </div>
    </div>
  );
}
