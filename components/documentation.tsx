import { AlertTriangle, Database, Layers, ShieldCheck } from "lucide-react";
import { DocsSection } from "./docs-section";
import { ANCHORS, GITHUB_URL } from "../lib/site";

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

type Field = { name: string; type: string; note: string };

function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-line bg-white p-6 ${className}`}>
      {children}
    </div>
  );
}

function CellGrid({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid gap-px overflow-hidden rounded-xl border border-line bg-line ${className}`}
    >
      {children}
    </div>
  );
}

function Cell({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`bg-white p-5 ${className}`}>{children}</div>;
}

function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn";
  title?: string;
  children: React.ReactNode;
}) {
  const warn = tone === "warn";
  return (
    <div
      className={`rounded-r-lg border-l-2 bg-[#FCFCFB] py-3.5 pl-4 pr-5 text-[13px] leading-[1.7] text-muted ${
        warn ? "border-[#F59E0B]" : "border-accent/40"
      }`}
    >
      {title && (
        <p className="mb-1 flex items-center gap-2 font-medium text-ink">
          {warn && (
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-[#B45309]"
              strokeWidth={2}
            />
          )}
          {title}
        </p>
      )}
      <div>{children}</div>
    </div>
  );
}

function FieldList({ fields }: { fields: Field[] }) {
  return (
    <ul className="mt-5 flex flex-col divide-y divide-hairline">
      {fields.map((f) => (
        <li key={f.name} className="py-2.5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-[11.5px] text-ink">{f.name}</span>
            <span className="font-mono text-[10.5px] text-faint">{f.type}</span>
          </div>
          <p className="mt-1 text-[12.5px] leading-[1.55] text-muted">
            {f.note}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** A small uppercase label used above short blocks. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ *
 * Data
 * ------------------------------------------------------------------ */

const MEMORY_FIELDS: Field[] = [
  { name: "id", type: "uuid", note: "Primary key" },
  { name: "namespace", type: "varchar(128)", note: "Retrieval bucket; default \"default\"" },
  { name: "content", type: "text", note: "The fact itself" },
  { name: "importance", type: "integer", note: "1–5, default 3" },
  { name: "embedding", type: "vector(384)", note: "all-MiniLM-L6-v2, L2-normalised" },
  { name: "is_active", type: "boolean", note: "Soft-delete flag; default true" },
  { name: "created_at / updated_at", type: "timestamptz", note: "created_at drives decay" },
];

const CONTRADICTION_FIELDS: Field[] = [
  { name: "id", type: "uuid", note: "Primary key" },
  { name: "namespace", type: "varchar(128)", note: "Same bucket as the pair" },
  { name: "new_memory_id / existing_memory_id", type: "uuid", note: "Both sides of the flagged pair" },
  { name: "similarity", type: "double precision", note: "Cosine similarity that cleared the gate" },
  { name: "reason", type: "text", note: "Human-readable explanation of the flag" },
  { name: "status", type: "varchar(32)", note: "open | resolved" },
  { name: "resolved_winner_id / resolved_at", type: "uuid / timestamptz", note: "Set when a human resolves it" },
];

const TROUBLESHOOTING = [
  { s: "401 Missing or invalid API key", c: "Send the X-API-Key header matching MNEMO_API_KEY. The default dev key is dev-local-key-change-me." },
  { s: "Embedding dimension mismatch", c: "The model, EMBEDDING_DIM and the migration's vector size must change together." },
  { s: "The memories relation is missing", c: "Migrations haven't run. Apply them with Alembic after setting DATABASE_URL." },
  { s: "The vector extension is unavailable", c: "Install pgvector, or use the pgvector/pgvector:pg16 image. The migration needs extension privileges." },
  { s: "First request is slow", c: "The MiniLM model loads once per process. Docker pre-downloads it to /models." },
  { s: "400 on resolve", c: "The contradiction is unknown, already resolved, or the winner isn't one of the two memories in the pair." },
];

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

export function QuickstartSection() {
  const paths = [
    {
      title: "Docker",
      badge: "Recommended",
      primary: true,
      steps: [
        "Clone the repository",
        "Start the stack with Docker Compose",
        "Migrations run automatically on boot",
        "The API answers on port 8000",
      ],
    },
    {
      title: "Local Python",
      badge: "Postgres 16+",
      primary: false,
      steps: [
        "Create a virtual environment and install the requirements",
        "Copy the example env file and set the database URL",
        "Apply migrations with Alembic",
        "Serve the app with uvicorn in reload mode",
      ],
    },
  ];

  return (
    <DocsSection
      id="quickstart"
      index="01"
      title="Run it locally"
      intro="Two supported paths: a one-command Docker stack, or a local Python environment against your own Postgres. Both end with the API answering on port 8000."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {paths.map((path) => (
          <Panel key={path.title}>
            <div className="flex items-center gap-2.5">
              <h3 className="text-[15px] font-medium text-ink">{path.title}</h3>
              <span
                className={`ml-auto rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  path.primary
                    ? "border-[#C7D2FE] bg-accent-soft text-accent-ink"
                    : "border-line bg-[#FCFCFB] text-faint"
                }`}
              >
                {path.badge}
              </span>
            </div>
            <ol className="mt-4 flex flex-col gap-2.5">
              {path.steps.map((step, i) => (
                <li
                  key={step}
                  className="flex gap-3 text-[13.5px] leading-[1.6] text-muted"
                >
                  <span className="pt-0.5 font-mono text-[11px] tabular-nums text-faint">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Panel>
        ))}
      </div>

      <CellGrid className="sm:grid-cols-3">
        <Cell>
          <Label>Base URL</Label>
          <p className="mt-1.5 text-[13.5px] text-ink">localhost:8000</p>
        </Cell>
        <Cell>
          <Label>Health</Label>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
            /health, no key needed
          </p>
        </Cell>
        <Cell>
          <Label>OpenAPI</Label>
          <p className="mt-1.5 text-[13.5px] text-ink">Interactive docs at /docs</p>
        </Cell>
      </CellGrid>
    </DocsSection>
  );
}

export function RetrievalSection() {
  return (
    <DocsSection
      id="retrieval"
      index="03"
      title="Retrieval & ranking"
      intro="A search runs in two steps: pgvector returns approximate nearest neighbours by cosine distance, then Python re-orders them so recency and importance decide between comparable matches."
    >
      <Panel className="md:p-8">
        <Label>Every candidate is scored by</Label>
        <p className="mt-3 text-[20px] font-medium leading-[1.3] tracking-[-0.01em] text-ink md:text-[26px]">
          relevance = similarity × decay(age) × importance
        </p>
        <div className="mt-6 grid gap-4 border-t border-hairline pt-6 sm:grid-cols-3">
          <div>
            <Label>similarity</Label>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-ink">
              Raw cosine from pgvector.
            </p>
          </div>
          <div>
            <Label>decay</Label>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-ink">
              Exponential, 180-day half-life, floored at 0.7.
            </p>
          </div>
          <div>
            <Label>importance</Label>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-ink">
              A 1–5 rating mapped to a narrow 0.90–1.10 band.
            </p>
          </div>
        </div>
      </Panel>

      <CellGrid className="sm:grid-cols-3">
        <Cell>
          <Label>Embeddings</Label>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-muted">
            all-MiniLM-L6-v2, 384 dimensions, computed in-process. Vectors are
            L2-normalised, so a dot product equals cosine similarity.
          </p>
        </Cell>
        <Cell>
          <Label>Index</Label>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-muted">
            HNSW over cosine distance — fast and approximate, not an exhaustive
            scan. Search over-fetches limit × 4 before re-ranking.
          </p>
        </Cell>
        <Cell>
          <Label>Why the multiplier is small</Label>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-muted">
            It spans under 2× on purpose, narrower than the spread of cosine
            similarity — so decay reorders, never overrides.
          </p>
        </Cell>
      </CellGrid>

      <Callout title="Try the function live">
        The{" "}
        <a
          href={ANCHORS.rankingCalculator}
          className="text-accent-ink underline decoration-line underline-offset-4"
        >
          ranking calculator
        </a>{" "}
        evaluates this exact score for any similarity, age and importance.
      </Callout>
    </DocsSection>
  );
}

export function DataModelSection() {
  const entities = [
    { name: "memories", icon: Database, fields: MEMORY_FIELDS },
    { name: "contradictions", icon: AlertTriangle, fields: CONTRADICTION_FIELDS },
  ];

  return (
    <DocsSection
      id="data-model"
      index="05"
      title="Data model"
      intro="Two tables. memories holds each fact and its 384-dimensional vector; contradictions records a flagged pair and, once resolved, which side won."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {entities.map((entity) => {
          const Icon = entity.icon;
          return (
            <Panel key={entity.name}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <h3 className="font-mono text-[13px] font-semibold text-ink">
                  {entity.name}
                </h3>
              </div>
              <FieldList fields={entity.fields} />
            </Panel>
          );
        })}
      </div>

      <CellGrid className="sm:grid-cols-3">
        <Cell>
          <Label>Soft delete</Label>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-muted">
            Rows are never removed — an inactive memory is hidden from lists and
            search but stays fetchable by id.
          </p>
        </Cell>
        <Cell>
          <Label>Namespaces</Label>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-muted">
            Both tables carry a 128-character namespace, and every query filters
            on it.
          </p>
        </Cell>
        <Cell>
          <Label>Indexes</Label>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-muted">
            A b-tree on namespace and active state, plus an HNSW index for the
            vector column.
          </p>
        </Cell>
      </CellGrid>
    </DocsSection>
  );
}

export function AuthSection() {
  return (
    <DocsSection
      id="auth"
      index="07"
      title="Authentication & namespaces"
      intro="v1 auth is deliberately minimal. It is worth being precise about what that buys you."
    >
      <CellGrid className="md:grid-cols-2">
        <Cell className="p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <h3 className="text-[14px] font-semibold text-ink">A single shared key</h3>
          </div>
          <p className="mt-3 text-[13.5px] leading-[1.7] text-muted">
            One key, compared in constant time, guards every v1 route. Requests
            without it are rejected with 401.
          </p>
        </Cell>
        <Cell className="p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
              <Layers className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <h3 className="text-[14px] font-semibold text-ink">Namespaces</h3>
          </div>
          <p className="mt-3 text-[13.5px] leading-[1.7] text-muted">
            A namespace is the memory bucket. Every read and write filters on it,
            so two namespaces never see each other&apos;s memories.
          </p>
        </Cell>
      </CellGrid>

      <Callout tone="warn" title="What this is, and is not">
        Namespaces are an application-level filter, not database row-level
        security, and the shared key can read and write <em>any</em> namespace.
        There are no per-tenant keys, no rate limiting and no roles. Treat Mnemo
        as a single-tenant service you run yourself.
      </Callout>
    </DocsSection>
  );
}

export function LimitationsSection() {
  const items = [
    { t: "Contradiction detection is a heuristic", d: "The marker list is small and English-only. Paraphrased contradictions can be missed, and a shared negation can produce a false positive. A flag is a candidate for review, not a verdict." },
    { t: "Search is approximate", d: "HNSW trades exactness for speed, and re-ranking only sees the over-fetched candidates." },
    { t: "One shared key", d: "No per-tenant keys, no rate limiting, no roles. Namespaces are a logical filter, not an auth boundary." },
    { t: "Long input is truncated", d: "MiniLM truncates at its maximum sequence length, so very long memories lose detail in the vector." },
    { t: "Relevance is not clamped", d: "It can edge slightly above raw similarity when importance is high." },
    { t: "No pagination on contradictions", d: "The list returns every matching row for the namespace." },
  ];
  return (
    <DocsSection
      id="limitations"
      index="09"
      title="Limitations"
      intro="What this version does not do, stated plainly."
    >
      <CellGrid className="md:grid-cols-2">
        {items.map((item) => (
          <Cell key={item.t}>
            <p className="text-[13px] font-medium text-ink">{item.t}</p>
            <p className="mt-1.5 text-[13px] leading-[1.7] text-muted">
              {item.d}
            </p>
          </Cell>
        ))}
      </CellGrid>
    </DocsSection>
  );
}

export function TroubleshootingSection() {
  return (
    <DocsSection
      id="troubleshooting"
      index="10"
      title="Troubleshooting"
      intro="The failures worth knowing about before they cost you an afternoon."
    >
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <ul className="flex flex-col divide-y divide-hairline">
          {TROUBLESHOOTING.map((row) => (
            <li
              key={row.s}
              className="flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:gap-6"
            >
              <span className="flex items-start gap-2 text-[13px] font-medium text-ink sm:w-[260px] sm:shrink-0">
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B45309]"
                  strokeWidth={2}
                />
                {row.s}
              </span>
              <span className="text-[13px] leading-[1.7] text-muted">
                {row.c}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {GITHUB_URL && (
        <p className="text-[13px] leading-[1.7] text-muted">
          The source is the authority for anything not covered here —{" "}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-ink underline decoration-line underline-offset-4"
          >
            read it on GitHub
          </a>
          .
        </p>
      )}
    </DocsSection>
  );
}
