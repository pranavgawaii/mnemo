"use client";

import * as React from "react";

/**
 * Decorative hero backdrop: slow-orbiting "memory" rings with drifting vector
 * nodes, echoing Mnemo's world (vectors, recall, decay). Purely ornamental —
 * aria-hidden, pointer-events-none, and motion is disabled under
 * prefers-reduced-motion. Rings are hidden below `lg` so they never crowd the
 * mobile layout.
 */

const ORBIT_CSS = `
@keyframes hxo-spin { to { transform: rotate(360deg); } }
@keyframes hxo-spin-rev { to { transform: rotate(-360deg); } }
@keyframes hxo-pulse {
  0%, 100% { opacity: .42; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.55); }
}
@keyframes hxo-drift {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.hxo-spin { animation: hxo-spin var(--hxo-dur, 46s) linear infinite; }
.hxo-spin-rev { animation: hxo-spin-rev var(--hxo-dur, 70s) linear infinite; }
.hxo-dot { animation: hxo-pulse 4.6s ease-in-out infinite; }
.hxo-drift { animation: hxo-drift 9s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .hxo-spin, .hxo-spin-rev, .hxo-dot, .hxo-drift { animation: none; }
}
`;

function Ring({
  inset,
  color = "rgba(79,70,229,0.20)",
  dashed = true,
}: {
  inset: number;
  color?: string;
  dashed?: boolean;
}) {
  return (
    <span
      className="absolute rounded-full"
      style={{ inset, border: `1px ${dashed ? "dashed" : "solid"} ${color}` }}
    />
  );
}

function Dot({
  angle,
  radius,
  size = 7,
  color = "#4F46E5",
  delay = "0s",
  glow = false,
}: {
  angle: number;
  radius: number;
  size?: number;
  color?: string;
  delay?: string;
  glow?: boolean;
}) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.round(Math.cos(rad) * radius);
  const y = Math.round(Math.sin(rad) * radius);
  return (
    <span
      className="hxo-dot absolute left-1/2 top-1/2 rounded-full"
      style={{
        width: size,
        height: size,
        background: color,
        marginLeft: x,
        marginTop: y,
        animationDelay: delay,
        boxShadow: glow ? "0 0 12px rgba(79,70,229,0.45)" : undefined,
      }}
    />
  );
}

export function HeroOrbit() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 select-none"
    >
      {/* Static stylesheet. `suppressHydrationWarning` keeps browser extensions
          (e.g. Dark Reader, which stamps a class onto <style> nodes) from
          tripping a hydration mismatch — the CSS itself is a constant. */}
      <style suppressHydrationWarning>{ORBIT_CSS}</style>

      {/* Top-right orbit system — nested dashed rings, slow counter-spin. */}
      <div
        className="hxo-drift absolute right-[-150px] top-[96px] hidden h-[520px] w-[520px] lg:block"
        style={{ animationDelay: "0.4s" }}
      >
        <Ring inset={0} />
        <Ring inset={66} />
        <Ring inset={132} />
        <Ring inset={198} />

        <div className="hxo-spin absolute inset-0">
          <Dot angle={-60} radius={260} size={8} glow delay="0s" />
          <Dot angle={120} radius={260} size={5} color="rgba(10,10,15,0.5)" delay="0.6s" />
        </div>

        <div
          className="hxo-spin-rev absolute inset-0"
          style={{ ["--hxo-dur" as string]: "72s" } as React.CSSProperties}
        >
          <Dot angle={200} radius={194} size={6} delay="1.1s" />
          <Dot angle={20} radius={194} size={4} color="rgba(10,10,15,0.4)" delay="1.6s" />
        </div>

        <div
          className="hxo-spin absolute inset-0"
          style={{ ["--hxo-dur" as string]: "34s" } as React.CSSProperties}
        >
          <Dot angle={300} radius={128} size={5} color="rgba(10,10,15,0.5)" />
        </div>

        <span
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          style={{ boxShadow: "0 0 26px rgba(79,70,229,0.5)" }}
        />
      </div>

      {/* Mid-left orbit system — smaller, faster. */}
      <div
        className="hxo-drift absolute left-[-150px] top-[170px] hidden h-[420px] w-[420px] lg:block"
        style={{ animationDelay: "1.6s" }}
      >
        <Ring inset={0} />
        <Ring inset={63} />
        <Ring inset={126} />

        <div
          className="hxo-spin-rev absolute inset-0"
          style={{ ["--hxo-dur" as string]: "56s" } as React.CSSProperties}
        >
          <Dot angle={45} radius={210} size={7} glow delay="0.5s" />
          <Dot angle={225} radius={210} size={4} color="rgba(10,10,15,0.45)" delay="1.3s" />
        </div>

        <div
          className="hxo-spin absolute inset-0"
          style={{ ["--hxo-dur" as string]: "38s" } as React.CSSProperties}
        >
          <Dot angle={150} radius={147} size={5} color="rgba(10,10,15,0.5)" />
        </div>

        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/70" />
      </div>

      {/* Small themed labels at the right edge, above the product window. */}
      <span
        className="hxo-drift absolute right-[18px] top-[182px] hidden font-mono text-[10px] lowercase tracking-[0.14em] text-accent/70 lg:block"
        style={{ animationDelay: "0.9s" }}
      >
        recall
      </span>
      <span
        className="hxo-drift absolute right-[6px] top-[292px] hidden font-mono text-[10px] lowercase tracking-[0.14em] text-faint lg:block"
        style={{ animationDelay: "1.8s" }}
      >
        decay · 180d
      </span>

      {/* Small floating nodes / micro graph, lower-right of the rings. */}
      <div
        className="hxo-drift absolute right-[88px] top-[470px] hidden lg:block"
        style={{ animationDelay: "2.2s" }}
      >
        <svg width="132" height="72" viewBox="0 0 132 72" fill="none">
          <line x1="10" y1="60" x2="62" y2="26" stroke="rgba(79,70,229,0.35)" strokeWidth="1" />
          <line x1="62" y1="26" x2="118" y2="46" stroke="rgba(10,10,15,0.14)" strokeWidth="1" />
          <circle cx="10" cy="60" r="4" fill="#4F46E5" />
          <circle cx="62" cy="26" r="3" fill="#0A0A0F" fillOpacity="0.55" />
          <circle cx="118" cy="46" r="3.5" fill="#4F46E5" fillOpacity="0.75" />
        </svg>
      </div>
    </div>
  );
}
