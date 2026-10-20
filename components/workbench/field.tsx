"use client";

import { useMemo } from "react";
import { DECAY_FLOOR } from "../../lib/mnemo";
import type { PlaygroundContradiction } from "../../lib/playground";
import { CENTER, FIELD_CSS, SIZE, TRACKS, clamp, nodeRadius } from "./layout";
import type { Row } from "./types";

export function Field({
  rows,
  ranked,
  positions,
  conflicts,
  query,
  selectedId,
  hoverId,
  pulseRank,
  scanning,
  onSelect,
  onHover,
}: {
  rows: Row[];
  ranked: Row[];
  positions: Map<string, { x: number; y: number }>;
  conflicts: PlaygroundContradiction[];
  query: string;
  selectedId: string | null;
  hoverId: string | null;
  pulseRank: number;
  scanning: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const order = useMemo(() => {
    const map = new Map<string, number>();
    ranked.forEach((row, index) => map.set(row.memory.id, index + 1));
    return map;
  }, [ranked]);

  const drawOrder = useMemo(() => {
    return [...ranked].sort((a, b) => {
      const aHot = a.memory.id === selectedId || a.memory.id === hoverId ? 1 : 0;
      const bHot = b.memory.id === selectedId || b.memory.id === hoverId ? 1 : 0;
      return aHot - bHot;
    });
  }, [ranked, selectedId, hoverId]);

  const hoverRow = rows.find((row) => row.memory.id === hoverId) ?? null;
  const hoverPosition = hoverRow ? positions.get(hoverRow.memory.id) : null;

  /**
   * Captions are placed outward first, then fall back to the next side that is
   * clear of both the nodes and the captions already placed. Without this, the
   * top match's caption lands on its neighbour (two rings share the top arc).
   */
  const captions = useMemo(() => {
    // Past eight memories the field is a crowd; the ranked list carries the
    // names, so the captions step aside rather than pile up.
    if (ranked.length > 8) return [];

    const LABEL_HEIGHT = 13;
    const GAP = 9;
    const PAD = 3;
    const placedBoxes: {
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];

    const nodes = ranked.flatMap((row, index) => {
      const position = positions.get(row.memory.id);
      return position
        ? [{
            id: row.memory.id,
            x: position.x,
            y: position.y,
            r: nodeRadius(row, index + 1) + 3,
          }]
        : [];
    });

    return ranked.flatMap((row, index) => {
      const position = positions.get(row.memory.id);
      if (!position) return [];

      const radius = nodeRadius(row, index + 1) + 3;
      const width = Math.min(160, Math.max(44, row.memory.label.length * 6.4 + 4));
      const dx = position.x - CENTER;
      const dy = position.y - CENTER;
      const distance = Math.hypot(dx, dy) || 1;

      const candidates = [
        {
          box: { x: position.x - width / 2, y: position.y - radius - GAP - LABEL_HEIGHT, width, height: LABEL_HEIGHT },
          x: position.x,
          y: position.y - radius - GAP - 3,
          anchor: "middle" as const,
          side: "above" as const,
          outward: -dy / distance,
        },
        {
          box: { x: position.x - width / 2, y: position.y + radius + GAP, width, height: LABEL_HEIGHT },
          x: position.x,
          y: position.y + radius + GAP + 10,
          anchor: "middle" as const,
          side: "below" as const,
          outward: dy / distance,
        },
        {
          box: { x: position.x + radius + GAP, y: position.y - LABEL_HEIGHT / 2, width, height: LABEL_HEIGHT },
          x: position.x + radius + GAP,
          y: position.y + 3.5,
          anchor: "start" as const,
          side: "right" as const,
          outward: dx / distance,
        },
        {
          box: { x: position.x - radius - GAP - width, y: position.y - LABEL_HEIGHT / 2, width, height: LABEL_HEIGHT },
          x: position.x - radius - GAP,
          y: position.y + 3.5,
          anchor: "end" as const,
          side: "left" as const,
          outward: -dx / distance,
        },
      ].sort((a, b) => b.outward - a.outward);

      const pick =
        candidates.find(({ box }) => {
          if (box.x < 2 || box.x + width > SIZE - 2) return false;
          if (box.y < 2 || box.y + LABEL_HEIGHT > SIZE - 2) return false;

          const hitsNode = nodes.some(
            (node) =>
              node.id !== row.memory.id &&
              box.x < node.x + node.r + PAD &&
              box.x + width > node.x - node.r - PAD &&
              box.y < node.y + node.r + PAD &&
              box.y + LABEL_HEIGHT > node.y - node.r - PAD
          );
          if (hitsNode) return false;

          return !placedBoxes.some(
            (other) =>
              box.x < other.x + other.width + PAD &&
              box.x + width > other.x - PAD &&
              box.y < other.y + other.height + PAD &&
              box.y + LABEL_HEIGHT > other.y - PAD
          );
        }) ?? candidates[0];

      placedBoxes.push(pick.box);

      return [{
        id: row.memory.id,
        label: row.memory.label,
        x: pick.x,
        y: pick.y,
        anchor: pick.anchor,
        side: pick.side,
        node: { x: position.x, y: position.y, r: radius },
        box: pick.box,
      }];
    });
  }, [ranked, positions]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      <style suppressHydrationWarning>{FIELD_CSS}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(79,70,229,0.09), rgba(79,70,229,0) 62%)",
        }}
      />
      <div
        aria-hidden="true"
        className="wb-sweep pointer-events-none absolute inset-0 rounded-full opacity-70"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(79,70,229,0) 0deg, rgba(79,70,229,0) 302deg, rgba(79,70,229,0.06) 340deg, rgba(79,70,229,0.02) 354deg, rgba(79,70,229,0) 360deg)",
        }}
      />

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="relative h-full w-full overflow-visible"
        aria-label="Memory field. The inner orbit holds the strongest matches; size is importance and fade is age."
      >
        <defs>
          <radialGradient id="wb-core-fill" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="72%" stopColor="#FBFBFF" />
            <stop offset="100%" stopColor="#F3F4FF" />
          </radialGradient>
          <filter id="wb-node-shadow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow
              dx="0"
              dy="1.2"
              stdDeviation="1.8"
              floodColor="#0A0A0F"
              floodOpacity="0.12"
            />
          </filter>
        </defs>

        {/* Every orbit turns, so no ring sits static. The markers riding each
            track make the rotation legible without moving the nodes. */}
        {TRACKS.map((radius, ring) => (
          <g
            key={radius}
            className={ring % 2 === 0 ? "wb-ring" : "wb-ring-rev"}
            style={{ animationDuration: `${62 + ring * 28}s` }}
          >
            <circle
              cx={CENTER}
              cy={CENTER}
              r={radius}
              fill="none"
              stroke={ring === 2 ? "#D2D2E4" : "#DDDDEA"}
              strokeWidth="1"
              strokeDasharray="2 7"
            />
            <circle
              cx={CENTER + radius}
              cy={CENTER}
              r={ring === 0 ? 3.2 : 2.4}
              fill="#4F46E5"
              opacity={ring === 0 ? 0.6 : 0.32}
            />
            <circle
              cx={CENTER - radius}
              cy={CENTER}
              r="1.7"
              fill="#4F46E5"
              opacity="0.2"
            />
          </g>
        ))}

        {/* core halo */}
        <circle
          className="wb-core"
          cx={CENTER}
          cy={CENTER}
          r="80"
          fill="none"
          stroke="#4F46E5"
          strokeOpacity="0.3"
          strokeWidth="1"
          strokeDasharray="3 8"
        />

        {/* conflict arcs */}
        {conflicts.map((conflict) => {
          const from = positions.get(conflict.new_memory.id);
          const to = positions.get(conflict.existing_memory.id);
          if (!from || !to) return null;

          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.hypot(dx, dy) || 1;
          let px = -dy / length;
          let py = dx / length;
          if ((midX - CENTER) * px + (midY - CENTER) * py < 0) {
            px = -px;
            py = -py;
          }
          const controlX = midX + px * 46;
          const controlY = midY + py * 46;

          return (
            <g key={conflict.id}>
              <path
                d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
                fill="none"
                stroke="#D97706"
                strokeWidth="1.4"
                strokeDasharray="4 5"
                opacity="0.75"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-18"
                  dur="1.1s"
                  repeatCount="indefinite"
                />
              </path>
              <circle
                cx={controlX}
                cy={controlY}
                r="8"
                fill="#FFFBEB"
                stroke="#FDE68A"
              />
              <text
                x={controlX}
                y={controlY + 3.5}
                textAnchor="middle"
                fontSize="9"
                fill="#B45309"
                fontFamily="ui-monospace, monospace"
              >
                !
              </text>
            </g>
          );
        })}

        {/* nodes */}
        {drawOrder.map((row) => {
          const position = positions.get(row.memory.id);
          if (!position) return null;

          const rank = order.get(row.memory.id) ?? 1;
          const selected = selectedId === row.memory.id;
          const hovered = hoverId === row.memory.id;
          const pulsing = pulseRank === rank;
          const freshness = clamp(
            (row.decay - DECAY_FLOOR) / (1 - DECAY_FLOOR),
            0,
            1
          );
          const radius =
            nodeRadius(row, rank) * (0.92 + freshness * 0.08);
          const fill = selected
            ? "#4F46E5"
            : rank === 1
              ? "#EEF0FF"
              : hovered
                ? "#F7F7FF"
                : "#FFFFFF";
          const stroke = selected
            ? "#3730A3"
            : rank === 1
              ? "#4F46E5"
              : "#CFCFDF";
          const textFill = selected
            ? "#FFFFFF"
            : rank === 1
              ? "#3730A3"
              : "#4C5263";

          return (
            <g
              key={row.memory.id}
              role="button"
              tabIndex={0}
              aria-label={`Rank ${rank}. ${row.memory.content}. Relevance ${row.relevance.toFixed(3)}.`}
              aria-pressed={selected}
              onMouseEnter={() => onHover(row.memory.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(row.memory.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(row.memory.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(row.memory.id);
                }
              }}
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
                cursor: "pointer",
                outline: "none",
                opacity: selected || hovered ? 1 : 0.72 + freshness * 0.28,
              }}
            >
              <circle r={radius + 12} fill="transparent" />

              {rank === 1 && (
                <circle
                  r={radius + 9}
                  fill="#4F46E5"
                  opacity={selected ? 0.14 : 0.07}
                />
              )}

              {rank === 1 && !pulsing && (
                <circle
                  r={radius + 9}
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="1"
                  strokeDasharray="2 5"
                  opacity="0.32"
                  className="motion-safe:animate-pulse"
                />
              )}

              {pulsing && (
                <circle
                  r={radius + 14}
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="1.2"
                  opacity="0.55"
                />
              )}

              <circle
                r={radius}
                fill={fill}
                stroke={stroke}
                strokeWidth={selected || rank === 1 ? 1.6 : 1}
                filter="url(#wb-node-shadow)"
                style={{ transition: "r 300ms, fill 200ms" }}
              />
              <text
                textAnchor="middle"
                dy="0.35em"
                fontSize={rank === 1 ? 12 : 11}
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                fill={textFill}
              >
                {rank}
              </text>
            </g>
          );
        })}

        {/* core */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r="64"
          fill="url(#wb-core-fill)"
          stroke="#E1E1F0"
        />

        {/* captions */}
        {captions.map((caption) => {
          const { node, box, side } = caption;
          const leader =
            side === "above"
              ? { x1: node.x, y1: node.y - node.r, x2: node.x, y2: box.y + box.height }
              : side === "below"
                ? { x1: node.x, y1: node.y + node.r, x2: node.x, y2: box.y }
                : side === "right"
                  ? { x1: node.x + node.r, y1: node.y, x2: box.x, y2: node.y }
                  : { x1: node.x - node.r, y1: node.y, x2: box.x + box.width, y2: node.y };

          return (
            <g key={caption.id} className="wb-label pointer-events-none select-none">
              <line
                {...leader}
                stroke="#C7C7DA"
                strokeWidth="0.8"
                strokeDasharray="2 3"
              />
              <text
                x={caption.x}
                y={caption.y}
                textAnchor={caption.anchor}
                fontSize="10.5"
                letterSpacing="0.1"
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                fill="#5E6472"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {caption.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-1/2 w-[104px] -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
          query
        </span>
        <p className="mt-1 line-clamp-3 text-[10.5px] leading-[1.35] text-ink">
          {query || "type something"}
        </p>
      </div>

      {scanning && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-[118px] w-[118px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/50 motion-safe:animate-ping" />
      )}

      {hoverRow && hoverPosition && (
        <div
          className="pointer-events-none absolute z-10 hidden w-[188px] rounded-lg border border-line bg-white/95 px-2.5 py-2 text-[10.5px] leading-snug text-ink shadow-lift backdrop-blur sm:block"
          style={{
            left: `${clamp((hoverPosition.x / SIZE) * 100, 16, 84)}%`,
            top: `${(hoverPosition.y / SIZE) * 100}%`,
            transform: `translate(-50%, ${
              hoverPosition.y < 150 ? "22px" : "calc(-100% - 22px)"
            })`,
          }}
        >
          {hoverRow.memory.content}
          <span className="mt-1 block font-mono text-[9px] text-faint">
            sim {hoverRow.similarity.toFixed(2)} · rel{" "}
            {hoverRow.relevance.toFixed(2)} · {hoverRow.ageDays}d
          </span>
        </div>
      )}
    </div>
  );
}
