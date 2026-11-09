import { useId } from "react";
import {
  Bot,
  Cpu,
  Layers,
  Server,
  UserRound,
  Webhook,
  Workflow,
  type LucideIcon,
} from "lucide-react";

function MapNode({
  x,
  y,
  width,
  title,
  detail,
  icon: Icon,
  accent = false,
}: {
  x: number;
  y: number;
  width: number;
  title: string;
  detail: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height="76"
        rx="9"
        fill={accent ? "#EEF0FF" : "#FFFFFF"}
        stroke={accent ? "#BDB9F5" : "#DEDFE4"}
      />
      <Icon
        x="14"
        y="17"
        width="21"
        height="21"
        stroke="#4F46E5"
        strokeWidth="1.5"
      />
      <text x="46" y="29" fill="#0A0A0F" fontSize="14" fontWeight="500">
        {title}
      </text>
      <text x="14" y="57" fill="#5E6472" fontSize="11.5">
        {detail}
      </text>
    </g>
  );
}

/** Arrows represent implemented calls and job polling, not separate microservices. */
export function SystemMap({ fit = false }: { fit?: boolean }) {
  const marker = `system-arrow-${useId().replace(/:/g, "")}`;
  return (
    <svg
      className="architecture-map h-auto w-full"
      style={fit ? { maxHeight: "calc(100dvh - 280px)" } : undefined}
      viewBox="0 0 880 650"
      role="img"
      aria-labelledby={`${marker}-title ${marker}-desc`}
    >
      <title id={`${marker}-title`}>Mnemo deployment and data paths</title>
      <desc id={`${marker}-desc`}>
        A user interacts with their application, which calls its model and the
        Mnemo API. FastAPI, the memory service, local encoder and background
        worker share one Python process. The service reads and writes PostgreSQL
        and pgvector. The worker polls persisted jobs and delivers signed
        webhooks to an optional receiver. The browser simulation is separate; an
        optional Next.js server proxy connects the live walkthrough to the API.
      </desc>
      <defs>
        <marker
          id={marker}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto-start-reverse"
        >
          <path
            d="M1 1L7 4L1 7"
            fill="none"
            stroke="#817AB8"
            strokeWidth="1.2"
          />
        </marker>
      </defs>
      <g fontFamily="inherit">
        <path
          d="M28 598H8V255H38"
          fill="none"
          stroke="#817AB8"
          strokeWidth="1.2"
          strokeDasharray="2 4"
          markerEnd={`url(#${marker})`}
        />
        <MapNode
          x={28}
          y={22}
          width={174}
          title="User"
          detail="Facts and questions"
          icon={UserRound}
        />
        <MapNode
          x={302}
          y={22}
          width={260}
          title="Your application / agent"
          detail="Conversation · model integration"
          icon={Bot}
        />
        <MapNode
          x={662}
          y={22}
          width={190}
          title="Your model"
          detail="Generates the answer"
          icon={Cpu}
        />
        <g
          fill="none"
          stroke="#817AB8"
          strokeWidth="1.4"
          markerEnd={`url(#${marker})`}
        >
          <path d="M202 60H292" />
          <path d="M572 60H652" markerStart={`url(#${marker})`} />
          <path d="M432 98V137H16V255H38" />
        </g>
        <text x="252" y="49" textAnchor="middle" fill="#5E6472" fontSize="11">
          chat
        </text>
        <text x="612" y="49" textAnchor="middle" fill="#5E6472" fontSize="11">
          context
        </text>
        <text x="275" y="126" textAnchor="middle" fill="#5E6472" fontSize="11">
          REST / Python SDK · X-API-Key
        </text>
        <rect
          x="28"
          y="167"
          width="558"
          height="302"
          rx="13"
          fill="#F7F7F5"
          stroke="#C4C0E7"
          strokeDasharray="5 5"
        />
        <text x="47" y="191" fill="#3730A3" fontSize="12" fontWeight="500">
          Mnemo · one Python API process
        </text>
        <MapNode
          x={48}
          y={217}
          width={198}
          title="FastAPI"
          detail="Auth · validation · observability"
          icon={Server}
        />
        <MapNode
          x={316}
          y={217}
          width={250}
          title="Memory service"
          detail="Store · search · rank · review"
          icon={Layers}
          accent
        />
        <MapNode
          x={316}
          y={366}
          width={250}
          title="MiniLM encoder"
          detail="Local · 384-d · L2 normalized"
          icon={Cpu}
        />
        <MapNode
          x={48}
          y={366}
          width={198}
          title="Job worker"
          detail="In-process polling thread"
          icon={Workflow}
        />
        <g
          fill="none"
          stroke="#817AB8"
          strokeWidth="1.4"
          markerEnd={`url(#${marker})`}
        >
          <path d="M246 255H306" />
          <path d="M441 303V356" markerStart={`url(#${marker})`} />
          <path d="M576 255H652" markerStart={`url(#${marker})`} />
        </g>
        <text x="454" y="331" fill="#5E6472" fontSize="11">
          encode text
        </text>
        <text x="620" y="237" textAnchor="middle" fill="#5E6472" fontSize="11">
          SQL + vectors
        </text>
        <g>
          <path
            d="M662 239C662 212 852 212 852 239V331C852 358 662 358 662 331Z"
            fill="#EEF0FF"
            stroke="#BDB9F5"
          />
          <ellipse
            cx="757"
            cy="239"
            rx="95"
            ry="20"
            fill="#F7F7FF"
            stroke="#BDB9F5"
          />
          <path
            d="M662 316C662 343 852 343 852 316"
            fill="none"
            stroke="#D5D2F2"
          />
          <text
            x="757"
            y="280"
            textAnchor="middle"
            fill="#3730A3"
            fontSize="14"
            fontWeight="500"
          >
            PostgreSQL + pgvector
          </text>
          <text
            x="757"
            y="302"
            textAnchor="middle"
            fill="#5E6472"
            fontSize="11.5"
          >
            Rows · vectors · outbox jobs
          </text>
        </g>
        <g
          fill="none"
          stroke="#817AB8"
          strokeWidth="1.4"
          strokeDasharray="5 5"
          markerEnd={`url(#${marker})`}
        >
          <path d="M662 328H615V455H272V404H256" />
          <path d="M147 452V523H652" />
        </g>
        <text x="625" y="387" fill="#5E6472" fontSize="11">
          poll persisted jobs
        </text>
        <text x="379" y="511" textAnchor="middle" fill="#5E6472" fontSize="11">
          signed HTTP POST · retries
        </text>
        <MapNode
          x={662}
          y={485}
          width={190}
          title="Your receiver"
          detail="Optional webhook endpoint"
          icon={Webhook}
        />
        <rect
          x="28"
          y="568"
          width="558"
          height="62"
          rx="8"
          fill="#FAFAF9"
          stroke="#DEDFE4"
        />
        <text x="46" y="592" fill="#0A0A0F" fontSize="12" fontWeight="500">
          Next.js website + playground
        </text>
        <text x="46" y="612" fill="#5E6472" fontSize="11.5">
          Browser demo · optional live API proxy · no model calls
        </text>
        <g fill="none" stroke="#817AB8" strokeWidth="1.4">
          <path d="M664 600H696" />
          <path d="M664 622H696" strokeDasharray="5 5" />
        </g>
        <text x="705" y="604" fill="#5E6472" fontSize="11">
          Request / response
        </text>
        <text x="705" y="626" fill="#5E6472" fontSize="11">
          Background delivery
        </text>
      </g>
    </svg>
  );
}
