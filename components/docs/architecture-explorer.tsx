"use client";

import { Fragment, useState } from "react";
import { ArrowRight } from "lucide-react";
import { DocsSection } from "@/components/docs/docs-section";
import { useTabList } from "@/hooks/use-tabs";
import { SystemArchitecture } from "./system-architecture";

type Stage = {
  key: string;
  label: string;
  sub: string;
  title: string;
  body: string;
  facts: { k: string; v: string }[];
};

const STAGES: Stage[] = [
  {
    key: "client",
    label: "Client",
    sub: "your service",
    title: "Client",
    body: "Your service or agent calls the REST API over JSON/HTTP. Everything under v1 is authenticated; the health probe is not.",
    facts: [
      { k: "Interface", v: "JSON over HTTP" },
      { k: "Auth", v: "X-API-Key header" },
      { k: "Schema", v: "OpenAPI at /docs" },
    ],
  },
  {
    key: "api",
    label: "FastAPI",
    sub: "auth + validation",
    title: "FastAPI",
    body: "The authenticated v1 operations check API keys and scopes, then validate their request payloads. Validation is typed with Pydantic, and errors come back as normal HTTP status codes.",
    facts: [
      { k: "Validation", v: "Pydantic v2" },
      { k: "Auth", v: "scoped API keys" },
      { k: "Errors", v: "400 · 401 · 404" },
    ],
  },
  {
    key: "embed",
    label: "Embedding",
    sub: "in-process · 384-d",
    title: "Local embedding",
    body: "Text is turned into a 384-dimensional vector by all-MiniLM-L6-v2, running in-process. There is no embedding API and no key to manage; the model loads lazily and is cached in the process.",
    facts: [
      { k: "Model", v: "all-MiniLM-L6-v2" },
      { k: "Dimensions", v: "384" },
      { k: "Normalised", v: "L2: dot = cosine" },
    ],
  },
  {
    key: "store",
    label: "Postgres + pgvector",
    sub: "rows + vectors",
    title: "One store for rows and vectors",
    body: "A single PostgreSQL database holds the memories and their vectors. An HNSW index is available for cosine nearest-neighbour queries; PostgreSQL selects the plan, and search over-fetches four times the limit so re-ranking has candidates to work with.",
    facts: [
      { k: "Database", v: "PostgreSQL 16" },
      { k: "Index", v: "HNSW · cosine" },
      { k: "Over-fetch", v: "limit × 4" },
    ],
  },
  {
    key: "rank",
    label: "Re-rank",
    sub: "decay × importance",
    title: "Re-rank in Python",
    body: "Candidates receive base scores from similarity, age and importance, followed by optional keyword boosting and diversity selection. A higher raw cosine score can lose.",
    facts: [
      { k: "Score", v: "similarity × decay × importance" },
      { k: "Half-life", v: "180 days" },
      { k: "Floor", v: "0.7" },
    ],
  },
];

/**
 * Interactive architecture diagram. A horizontal flow of stages; selecting one
 * reveals what it does and the parameters that matter.
 */
export function ArchitectureExplorer() {
  const [active, setActive] = useState(0);
  const stage = STAGES[active];
  const { register, onKeyDown } = useTabList({
    count: STAGES.length,
    active,
    onChange: setActive,
  });

  return (
    <DocsSection
      id="architecture"
      title="System architecture"
      intro="One API process, one database and an optional webhook destination. Your application supplies facts and generates answers; Mnemo stores, retrieves and helps review those facts."
    >
      <SystemArchitecture />
      <details className="rounded-xl border border-line bg-white p-4 md:p-5">
        <summary className="cursor-pointer text-[13px] font-medium text-ink">
          Inspect the retrieval path
        </summary>
        <div className="mt-5">
          <div className="rounded-xl border border-line bg-white p-4 md:p-5">
            <div
              role="tablist"
              aria-label="Architecture stages"
              onKeyDown={onKeyDown}
              className="flex items-stretch gap-1.5 overflow-x-auto pb-1"
            >
              {STAGES.map((s, i) => (
                <Fragment key={s.key}>
                  <button
                    type="button"
                    role="tab"
                    id={`arch-tab-${s.key}`}
                    ref={register(i)}
                    tabIndex={active === i ? 0 : -1}
                    aria-selected={active === i}
                    aria-controls="arch-panel"
                    onClick={() => setActive(i)}
                    className={`shrink-0 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                      active === i
                        ? "border-ink bg-ink"
                        : "border-line bg-[#FCFCFB] hover:border-faint/40"
                    }`}
                  >
                    <span
                      className={`block text-[12.5px] font-medium ${
                        active === i ? "text-white" : "text-ink"
                      }`}
                    >
                      {s.label}
                    </span>
                    <span
                      className={`mt-0.5 block text-[11px] ${
                        active === i ? "text-white/60" : "text-faint"
                      }`}
                    >
                      {s.sub}
                    </span>
                  </button>
                  {i < STAGES.length - 1 && (
                    <ArrowRight
                      className="h-4 w-4 shrink-0 self-center text-[#D4D4D4]"
                      strokeWidth={1.8}
                    />
                  )}
                </Fragment>
              ))}
            </div>
          </div>

          <div
            key={stage.key}
            id="arch-panel"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`arch-tab-${stage.key}`}
            data-lenis-prevent
            className="mt-4 h-[440px] scroll-stable overflow-y-auto rounded-xl border border-line bg-white p-6 sm:h-[300px]"
          >
            <h3 className="text-[16px] font-medium text-ink">{stage.title}</h3>
            <p className="mt-2 max-w-[640px] text-[14px] leading-[1.75] text-muted">
              {stage.body}
            </p>
            <dl className="mt-5 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
              {stage.facts.map((f) => (
                <div key={f.k} className="bg-white px-4 py-3">
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                    {f.k}
                  </dt>
                  <dd className="mt-1 text-[12.5px] text-ink">{f.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </details>
    </DocsSection>
  );
}
