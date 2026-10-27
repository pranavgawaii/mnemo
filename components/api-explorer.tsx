"use client";

import { useState } from "react";
import { DocsSection } from "./docs-section";
import { useTabList } from "../lib/use-tabs";

type Field = { name: string; type: string; note: string; required?: boolean };

type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  description: string;
  auth: boolean;
  sends?: Field[];
  gets?: Field[];
  notes?: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/health",
    summary: "Liveness probe",
    description:
      "Confirms the process is serving. It touches no database and needs no key, so it is safe to poll from a load balancer.",
    auth: false,
    gets: [{ name: "status", type: "string", note: 'Always "ok" when the process is serving' }],
    notes:
      "Unauthenticated. Liveness only. It does not check the database.",
  },
  {
    method: "GET",
    path: "/ready",
    summary: "Readiness probe",
    description:
      "Confirms the service can reach its database. Wire this one into an orchestrator so it never routes traffic to an instance that is up but cannot query.",
    auth: false,
    gets: [{ name: "status", type: "string", note: 'Always "ready" when the database answered' }],
    notes:
      "Unauthenticated, like /health. Returns 503 when the database is unreachable.",
  },
  {
    method: "POST",
    path: "/v1/memories",
    summary: "Store a memory",
    description:
      "Embeds the text locally, writes the row, then checks it against its five nearest active neighbours before the transaction commits.",
    auth: true,
    sends: [
      { name: "content", type: "string", note: "The fact to store", required: true },
      { name: "namespace", type: "string", note: "Retrieval bucket, 1 to 128 chars. Default “default”" },
      { name: "importance", type: "integer", note: "1 to 5. Default 3" },
      { name: "tags", type: "array", note: "Up to 10 short labels; filterable with ANY-match" },
      { name: "metadata", type: "object", note: "Free-form JSON side data, returned on read" },
      { name: "expires_at", type: "timestamp", note: "Optional TTL; expired rows drop out of reads" },
    ],
    gets: [
      { name: "memory", type: "object", note: "The stored row" },
      { name: "contradictions", type: "array", note: "Flags raised by this write; usually empty" },
      { name: "deduplicated_of", type: "uuid | null", note: "Id of the near-identical existing memory when dedup hit" },
    ],
    notes:
      "Returns 201 with the memory and any flags. A missing or wrong key returns 401 with “Missing or invalid API key.”; a duplicate within the dedup window returns 409.",
  },
  {
    method: "POST",
    path: "/v1/memories/bulk",
    summary: "Store many memories",
    description:
      "Runs each item through the normal write path in one call. Items are independent: a bad item is reported and never rolls the others back, and flags raised by earlier items are visible to later ones.",
    auth: true,
    sends: [
      { name: "items", type: "array", note: "1 to 100 memory objects, same shape as the single add", required: true },
    ],
    gets: [
      { name: "created / errors", type: "integer", note: "Outcome tally" },
      { name: "results", type: "array", note: "Per item: index, status, memory, contradictions or error" },
    ],
    notes: "Each item still re-embeds and re-checks its neighbours, so large batches are not free.",
  },
  {
    method: "POST",
    path: "/v1/memories/search",
    summary: "Search, relevance-ranked",
    description:
      "Embeds the query, scans by cosine distance through the HNSW index, over-fetches four times the limit, then re-ranks in Python.",
    auth: true,
    sends: [
      { name: "query", type: "string", note: "Natural-language question", required: true },
      { name: "namespace", type: "string", note: "Bucket to search. Default “default”" },
      { name: "limit", type: "integer", note: "1 to 100. Default 10" },
      { name: "tags", type: "array", note: "Optional ANY-match tag filter" },
      { name: "keyword_weight", type: "number", note: "0 to 1. Per-query keyword boost; 0 turns it off" },
      { name: "diversity", type: "number", note: "0 to 1. 0 is pure relevance, higher spreads results (MMR)" },
    ],
    gets: [
      { name: "query / namespace", type: "string", note: "Echoed back" },
      { name: "hits", type: "array", note: "Ordered by relevance; each has memory, similarity, relevance_score, age_days" },
    ],
    notes:
      "similarity is raw cosine; relevance_score adds decay and importance. Both are returned so the re-ranking is visible. A freshly stored memory measured 0.838 similarity and 0.880 relevance.",
  },
  {
    method: "GET",
    path: "/v1/memories",
    summary: "List a namespace",
    description:
      "Returns active memories for a namespace, newest first. Soft-deleted rows are excluded.",
    auth: true,
    sends: [
      { name: "namespace", type: "string", note: "Default “default”" },
      { name: "limit", type: "integer", note: "1 to 100. Default 20" },
      { name: "offset", type: "integer", note: "Default 0" },
    ],
    gets: [
      { name: "items", type: "array", note: "Active memories, newest first" },
      { name: "total", type: "integer", note: "Count in the namespace" },
      { name: "limit / offset", type: "integer", note: "Echoed back" },
    ],
  },
  {
    method: "GET",
    path: "/v1/memories/{id}",
    summary: "Fetch one memory",
    description: "Returns a single memory by id, active or not.",
    auth: true,
    sends: [{ name: "id", type: "uuid", note: "Memory id (path parameter)", required: true }],
    gets: [{ name: "memory", type: "object", note: "The full memory row" }],
    notes: "Unknown ids return 404 with “Memory not found.”",
  },
  {
    method: "PATCH",
    path: "/v1/memories/{id}",
    summary: "Update one memory",
    description:
      "Partially updates content, importance, or both in place, so a correction does not break the audit trail. A content change is re-embedded and re-checked against its nearest active neighbours.",
    auth: true,
    sends: [
      { name: "id", type: "uuid", note: "Memory id (path parameter)", required: true },
      { name: "content", type: "string", note: "Replacement text; re-embedded and re-checked" },
      { name: "importance", type: "integer", note: "1 to 5" },
      { name: "namespace", type: "string", note: "Optional scope; a mismatch returns 404" },
    ],
    gets: [{ name: "memory", type: "object", note: "The updated row" }],
    notes:
      "At least one of content or importance is required; an empty body returns 422. New contradictions surface through the list route, and an existing pair is never flagged twice.",
  },
  {
    method: "DELETE",
    path: "/v1/memories/{id}",
    summary: "Soft-delete",
    description:
      "Marks a memory inactive. The row is kept so the audit trail survives. Never a hard delete.",
    auth: true,
    sends: [{ name: "id", type: "uuid", note: "Memory id (path parameter)", required: true }],
    gets: [{ name: "memory", type: "object", note: "The same row, now inactive" }],
  },
  {
    method: "GET",
    path: "/v1/contradictions",
    summary: "List flagged conflicts",
    description:
      "Lists contradictions for a namespace. Both sides are inlined on each item as new_memory and existing_memory.",
    auth: true,
    sends: [
      { name: "namespace", type: "string", note: "Default “default”" },
      { name: "status", type: "string", note: "open | resolved. Default open" },
      { name: "limit", type: "integer", note: "1 to 100. Default 20" },
      { name: "offset", type: "integer", note: "Default 0" },
    ],
    gets: [
      { name: "items", type: "array", note: "Newest first; each has id, similarity, reason, status, resolved_winner_id, resolved_at" },
      { name: "total", type: "integer", note: "Count of matches" },
      { name: "limit / offset", type: "integer", note: "Echoed back" },
    ],
    notes:
      "Paginated like the memory list. Both sides of each pair are inlined as new_memory and existing_memory.",
  },
  {
    method: "POST",
    path: "/v1/contradictions/resolve",
    summary: "Resolve by naming the winner",
    description:
      "Closes a flagged pair. The winner stays active and the loser becomes inactive.",
    auth: true,
    sends: [
      { name: "contradiction_id", type: "uuid", note: "The flagged pair", required: true },
      { name: "winner_memory_id", type: "uuid", note: "Must be one of the two memories", required: true },
    ],
    gets: [
      { name: "id / status", type: "string", note: "The contradiction, now resolved" },
      { name: "resolved_winner_id / resolved_at", type: "uuid / timestamp", note: "Who won, and when" },
      { name: "new_memory / existing_memory", type: "object", note: "Both rows; the loser is inactive" },
    ],
    notes:
      "Returns 400 if the id is unknown, already resolved, or the winner is not one of the two memories in the pair.",
  },
  {
    method: "GET",
    path: "/v1/namespaces/{namespace}/export",
    summary: "Export a namespace",
    description:
      "Returns every memory and contradiction in a namespace, including soft-deleted rows. The snapshot is portable across deployments because vectors are omitted and rebuilt from the text on import.",
    auth: true,
    sends: [
      { name: "namespace", type: "string", note: "Namespace to export (path parameter)", required: true },
    ],
    gets: [
      { name: "version / exported_at", type: "integer / timestamp", note: "Snapshot format and creation time" },
      { name: "memories", type: "array", note: "Ids, content, importance, active state and timestamps" },
      { name: "contradictions", type: "array", note: "Both memory ids plus status, reason and resolution fields" },
    ],
    notes:
      "Admin endpoint. Use the CLI to write the JSON to disk and restore it into an empty namespace.",
  },
  {
    method: "GET",
    path: "/v1/namespaces/{namespace}/stats",
    summary: "Namespace statistics",
    description:
      "Aggregates memory and contradiction counts for one namespace without scanning the full rows in the browser.",
    auth: true,
    sends: [
      { name: "namespace", type: "string", note: "Namespace to inspect (path parameter)", required: true },
    ],
    gets: [
      { name: "total / active / inactive", type: "integer", note: "Memory counts, including soft-deleted rows" },
      { name: "open / resolved", type: "integer", note: "Contradiction counts" },
      { name: "average_importance", type: "number | null", note: "Mean importance across all memories" },
      { name: "importance_counts", type: "array", note: "Count per importance value" },
      { name: "oldest / newest", type: "timestamp | null", note: "Created-at bounds for the namespace" },
    ],
  },
  {
    method: "POST",
    path: "/v1/namespaces",
    summary: "Register a namespace",
    description:
      "Creates the namespace row that holds per-namespace scoring overrides. Namespaces also come to exist implicitly when a memory names one.",
    auth: true,
    sends: [
      { name: "name", type: "string", note: "Letters, digits, dot, underscore, dash; 1 to 128 chars", required: true },
      { name: "decay_half_life_days", type: "number", note: "Relevance decay half-life in days" },
      { name: "decay_floor", type: "number", note: "0 to 1. Lower bound decay can push relevance to" },
      { name: "contradiction_sim_threshold", type: "number", note: "0 to 1. Similarity above which a pair is flagged. Default 0.82" },
    ],
    gets: [{ name: "name / overrides / total_memories", type: "object", note: "The namespace row" }],
    notes: "A duplicate name returns 409. Omitted overrides inherit the global settings.",
  },
  {
    method: "GET",
    path: "/v1/namespaces",
    summary: "List namespaces",
    description: "All registered namespaces with their memory counts.",
    auth: true,
    gets: [
      { name: "items", type: "array", note: "Name, overrides, created_at and total_memories each" },
      { name: "total", type: "integer", note: "Count of namespaces" },
    ],
  },
  {
    method: "GET",
    path: "/v1/namespaces/{name}",
    summary: "Fetch one namespace",
    description: "The namespace row with its overrides and current memory count.",
    auth: true,
    sends: [{ name: "name", type: "string", note: "Namespace name (path parameter)", required: true }],
    gets: [{ name: "name / overrides / total_memories", type: "object", note: "The namespace row" }],
    notes: "Unknown names return 404.",
  },
  {
    method: "PATCH",
    path: "/v1/namespaces/{name}",
    summary: "Update overrides",
    description:
      "Changes decay or flagging thresholds. Fields present but null reset to the global value; fields left out stay as they are.",
    auth: true,
    sends: [
      { name: "name", type: "string", note: "Namespace name (path parameter)", required: true },
      { name: "decay_half_life_days", type: "number | null", note: "Null resets to the global default" },
      { name: "decay_floor", type: "number | null", note: "Null resets to the global default" },
      { name: "contradiction_sim_threshold", type: "number | null", note: "Null resets to the global default" },
    ],
    gets: [{ name: "name / overrides / total_memories", type: "object", note: "The updated row" }],
  },
  {
    method: "DELETE",
    path: "/v1/namespaces/{name}",
    summary: "Delete a namespace row",
    description:
      "Removes the namespace row and its overrides. Refused with 409 while memories still exist in it.",
    auth: true,
    sends: [{ name: "name", type: "string", note: "Namespace name (path parameter)", required: true }],
    notes: "Returns 204 on success. The memories must be moved or soft-deleted first.",
  },
  {
    method: "POST",
    path: "/v1/keys",
    summary: "Issue an API key",
    description:
      "Creates a key with a label and scope set. The plaintext key is returned exactly once and stored only as a SHA-256 hash.",
    auth: true,
    sends: [
      { name: "label", type: "string", note: "What the key is for; 1 to 64 chars", required: true },
      { name: "scopes", type: "array", note: "read | write | admin. Default read and write" },
      { name: "rate_limit_per_minute", type: "integer", note: "Optional per-key override of the global budget" },
    ],
    gets: [
      { name: "key", type: "string", note: "Plaintext, starts with mnemo_. Shown once, never again" },
      { name: "id / label / key_prefix / scopes", type: "object", note: "The key row" },
    ],
    notes: "Requires the admin scope. A lost plaintext can only be fixed by rotating the key.",
  },
  {
    method: "GET",
    path: "/v1/keys",
    summary: "List issued keys",
    description: "Every key with its prefix and scopes. Secrets are never returned.",
    auth: true,
    gets: [
      { name: "items", type: "array", note: "id, label, key_prefix, scopes, is_active and timestamps each" },
      { name: "total", type: "integer", note: "Count of keys" },
    ],
    notes: "Requires the admin scope.",
  },
  {
    method: "POST",
    path: "/v1/keys/{id}/rotate",
    summary: "Rotate a key",
    description:
      "Replaces the secret, keeping the label and scopes. Use this when a key may have leaked.",
    auth: true,
    sends: [{ name: "id", type: "uuid", note: "Key id (path parameter)", required: true }],
    gets: [{ name: "key", type: "string", note: "The new plaintext. Shown once" }],
    notes: "Requires the admin scope. The old secret stops working at once. Unknown ids return 404.",
  },
  {
    method: "DELETE",
    path: "/v1/keys/{id}",
    summary: "Revoke a key",
    description: "Deactivates the key. Auth with it starts failing immediately.",
    auth: true,
    sends: [{ name: "id", type: "uuid", note: "Key id (path parameter)", required: true }],
    notes: "Returns 204. Requires the admin scope. Unknown ids return 404.",
  },
  {
    method: "GET",
    path: "/v1/events",
    summary: "Audit trail",
    description:
      "Every mutation as it was written, in the same transaction as the change it describes. Newest first.",
    auth: true,
    sends: [
      { name: "namespace", type: "string", note: "Optional filter" },
      { name: "resource_type", type: "string", note: "memory | contradiction | api_key | namespace" },
      { name: "action", type: "string", note: "E.g. memory.created, contradiction.flagged" },
      { name: "limit", type: "integer", note: "1 to 200. Default 50" },
      { name: "offset", type: "integer", note: "Default 0" },
    ],
    gets: [
      { name: "items", type: "array", note: "action, namespace, resource_id, actor_key_id, details, created_at each" },
      { name: "total / limit / offset", type: "integer", note: "Echoed back for paging" },
    ],
    notes: "Requires the admin scope.",
  },
  {
    method: "POST",
    path: "/v1/webhooks",
    summary: "Subscribe to contradiction events",
    description:
      "Registers a URL for one namespace. When a contradiction is flagged there, Mnemo queues a signed POST and retries with backoff until the endpoint acknowledges.",
    auth: true,
    sends: [
      { name: "namespace", type: "string", note: "Namespace to watch", required: true },
      { name: "url", type: "string", note: "http or https endpoint to POST to", required: true },
    ],
    gets: [
      { name: "secret", type: "string", note: "64 hex chars. Shown once; verify payloads with HMAC-SHA256" },
      { name: "id / namespace / url / is_active", type: "object", note: "The subscription" },
    ],
    notes:
      "Requires the admin scope. Deliveries carry an X-Mnemo-Signature header you can verify with the secret.",
  },
  {
    method: "GET",
    path: "/v1/webhooks",
    summary: "List subscriptions",
    description:
      "All webhook subscriptions, optionally filtered by namespace. Secrets are never returned.",
    auth: true,
    sends: [{ name: "namespace", type: "string", note: "Optional filter" }],
    gets: [{ name: "items / total", type: "array / integer", note: "Subscriptions without secrets" }],
    notes: "Requires the admin scope.",
  },
  {
    method: "DELETE",
    path: "/v1/webhooks/{id}",
    summary: "Unsubscribe",
    description: "Deactivates a subscription; deliveries stop immediately.",
    auth: true,
    sends: [{ name: "id", type: "uuid", note: "Webhook id (path parameter)", required: true }],
    notes: "Returns 204. Requires the admin scope. Unknown ids return 404.",
  },
];

const METHOD_TONE: Record<string, string> = {
  GET: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  DELETE: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  POST: "border-[#C7D2FE] bg-accent-soft text-accent-ink",
  PATCH: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
};

function MethodPill({ method }: { method: string }) {
  return (
    <span
      className={`w-[52px] shrink-0 rounded-md border text-center text-[10.5px] font-bold ${METHOD_TONE[method] ?? ""}`}
    >
      {method}
    </span>
  );
}

function FieldList({ title, fields }: { title: string; fields: Field[] }) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">
        {title}
      </p>
      <ul className="mt-3 flex flex-col divide-y divide-hairline">
        {fields.map((field) => (
          <li key={field.name} className="py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12px] text-ink">{field.name}</span>
              <span className="rounded-md border border-line bg-[#FCFCFB] px-1.5 py-0.5 font-mono text-[10px] text-muted">
                {field.type}
              </span>
              {field.required && (
                <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wide text-accent-ink">
                  required
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">
              {field.note}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Interactive REST reference. Pick a route on the left; read its contract on the right. */
export function ApiExplorer() {
  const [active, setActive] = useState(2);
  const endpoint = ENDPOINTS[active];
  const { register, onKeyDown } = useTabList({
    count: ENDPOINTS.length,
    active,
    onChange: setActive,
  });

  return (
    <DocsSection
      id="api"
      index="06"
      title="REST API"
      intro="Twenty-six routes over a JSON interface. Everything under v1 requires an API key; the two probes do not. Keys, events and webhooks additionally need the admin scope. Pick a route to read exactly what it accepts and returns."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <div
          role="tablist"
          aria-label="Endpoints"
          onKeyDown={onKeyDown}
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {ENDPOINTS.map((e, i) => {
            const selected = active === i;
            return (
              <button
                key={e.method + e.path}
                type="button"
                role="tab"
                id={`api-tab-${i}`}
                ref={register(i)}
                tabIndex={selected ? 0 : -1}
                aria-selected={selected}
                aria-controls="api-panel"
                onClick={() => setActive(i)}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors lg:w-full ${
                  selected
                    ? "border-ink bg-ink"
                    : "border-line bg-white hover:border-faint/40"
                }`}
              >
                <span
                  className={`w-[46px] shrink-0 rounded text-center font-mono text-[10px] font-bold ${
                    selected ? "text-white/80" : "text-faint"
                  }`}
                >
                  {e.method}
                </span>
                <span
                  className={`truncate font-mono text-[12px] ${
                    selected ? "text-white" : "text-ink"
                  }`}
                >
                  {e.path}
                </span>
              </button>
            );
          })}
        </div>

        <div
          id="api-panel"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`api-tab-${active}`}
          className="overflow-hidden rounded-xl border border-line bg-white"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line bg-[#FCFCFB] px-5 py-4">
            <MethodPill method={endpoint.method} />
            <span className="font-mono text-[12.5px] font-medium text-ink">
              {endpoint.path}
            </span>
            <span className="text-[12.5px] text-muted">
              {endpoint.summary}
            </span>
            <span className="ml-auto text-[10.5px] font-medium uppercase tracking-wider text-faint">
              {endpoint.auth ? "API key required" : "No auth"}
            </span>
          </div>

          <div className="px-5 py-5">
            <p className="max-w-[680px] text-[13.5px] leading-[1.75] text-muted">
              {endpoint.description}
            </p>

            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {endpoint.sends && (
                <FieldList title="Request" fields={endpoint.sends} />
              )}
              {endpoint.gets && (
                <FieldList title="Response" fields={endpoint.gets} />
              )}
            </div>

            {endpoint.notes && (
              <p className="mt-5 border-t border-hairline pt-4 text-[12.5px] leading-[1.7] text-muted">
                {endpoint.notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </DocsSection>
  );
}
