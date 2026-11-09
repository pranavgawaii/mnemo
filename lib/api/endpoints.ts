import snapshot from "@/public/openapi.json";

/** Schema-backed reference data. Regenerate the snapshot after API changes. */
type Schema = {
  $ref?: string;
  type?: string;
  title?: string;
  description?: string;
  format?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  anyOf?: Schema[];
  enum?: unknown[];
  default?: unknown;
};
type Parameter = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: Schema;
};
type Operation = {
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
  responses: Record<
    string,
    { description?: string; content?: Record<string, { schema?: Schema }> }
  >;
};
type Document = {
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, Schema> };
};
const document = snapshot as unknown as Document;
export type Field = {
  name: string;
  type: string;
  note: string;
  required?: boolean;
  location?: string;
};
export type Resource =
  | "memories"
  | "conflicts"
  | "namespaces"
  | "keys"
  | "events"
  | "operations";
export type Endpoint = {
  method: string;
  path: string;
  summary: string;
  description: string;
  resource: Resource;
  scope: "public" | "read" | "write" | "admin";
  sends: Field[];
  gets: Field[];
  status: string;
  mediaType: string;
  notes?: string;
};

export const API_RESOURCES: { key: Resource; label: string }[] = [
  { key: "memories", label: "Memories" },
  { key: "conflicts", label: "Conflicts" },
  { key: "namespaces", label: "Namespaces" },
  { key: "keys", label: "API keys" },
  { key: "events", label: "Events & webhooks" },
  { key: "operations", label: "Operations" },
];

function resolve(schema: Schema): Schema {
  return schema.$ref
    ? (document.components.schemas[schema.$ref.split("/").at(-1)!] ?? schema)
    : schema;
}
function typeName(schema: Schema): string {
  if (schema.$ref) return schema.$ref.split("/").at(-1)!;
  if (schema.anyOf) return [...new Set(schema.anyOf.map(typeName))].join(" | ");
  if (schema.type === "array") return `array<${typeName(schema.items ?? {})}>`;
  return schema.format ?? schema.type ?? "object";
}
function note(schema: Schema): string {
  const parts = [schema.description ?? ""];
  if (schema.default !== undefined)
    parts.push(`Default: ${JSON.stringify(schema.default)}.`);
  if (schema.enum) parts.push(`Values: ${schema.enum.map(String).join(", ")}.`);
  return (
    parts.filter(Boolean).join(" ") ||
    schema.title ||
    "See the complete schema for constraints."
  );
}
function fields(schema: Schema, location: string): Field[] {
  const resolved = resolve(schema);
  return Object.entries(resolved.properties ?? {}).map(([name, value]) => ({
    name,
    type: typeName(value),
    note: note(value),
    required: resolved.required?.includes(name),
    location,
  }));
}
function resource(path: string): Resource {
  if (path.startsWith("/v1/memories")) return "memories";
  if (path.startsWith("/v1/contradictions")) return "conflicts";
  if (path.startsWith("/v1/namespaces")) return "namespaces";
  if (path.startsWith("/v1/keys")) return "keys";
  return path.startsWith("/v1/") ? "events" : "operations";
}
function scope(path: string, method: string): Endpoint["scope"] {
  if (!path.startsWith("/v1/")) return "public";
  if (/^\/v1\/(namespaces|keys|events|webhooks)(\/|$)/.test(path))
    return "admin";
  return method === "GET" || path.endsWith("/search") ? "read" : "write";
}
const NOTES: Record<string, string> = {
  "POST /v1/memories":
    "Default duplicate mode accepts the write with status 201 and reports deduplicated_of. DEDUP_MODE=reject returns 409 instead. Conflict flags require review; writes do not resolve them automatically.",
  "POST /v1/memories/bulk":
    "Each item commits independently. A failed item is rolled back and reported without undoing successful items.",
  "POST /v1/memories/search":
    "Base scores combine cosine similarity, age and importance. The default keyword weight is 0.25; pass keyword_weight=0 to disable it. diversity>0 enables MMR selection.",
  "GET /v1/memories":
    "Returns active, non-expired memories. Pass next_cursor back as cursor for the next keyset page, or use offset pagination. Tags use ANY-match.",
  "GET /v1/memories/{memory_id}":
    "Returns the memory row directly, including inactive history. An optional namespace mismatch returns 404.",
  "PATCH /v1/memories/{memory_id}":
    "Supply at least one of content, importance, tags, metadata or expires_at. Explicit expires_at=null clears TTL. Content edits replace text in place; prior text versions are not retained.",
  "DELETE /v1/memories/{memory_id}":
    "Soft-deletes the memory. The response is the memory row directly, now inactive.",
  "POST /v1/contradictions/resolve":
    "The winner must be an active, non-expired member of the pair. Unknown, resolved or invalid choices return 400. Resolution deactivates the loser.",
  "DELETE /v1/namespaces/{namespace}":
    "Any remaining memory rows, including inactive history, prevent deletion and return 409.",
  "POST /v1/webhooks":
    "Signing secrets are returned once. Delivery is at least once, with up to five attempts by default. Verify X-Mnemo-Signature and deduplicate X-Mnemo-Event-ID.",
  "GET /metrics":
    "Prometheus text exposition, not JSON. Public, like the liveness and readiness probes.",
};

export const ENDPOINTS: Endpoint[] = Object.entries(document.paths).flatMap(
  ([path, operations]) =>
    Object.entries(operations)
      .filter(([method]) => ["get", "post", "patch", "delete"].includes(method))
      .map(([verb, operation]) => {
        const method = verb.toUpperCase();
        const access = scope(path, method);
        const status =
          Object.keys(operation.responses).find((code) =>
            code.startsWith("2"),
          ) ?? "200";
        const response = operation.responses[status];
        const mediaType =
          path === "/metrics"
            ? "text/plain"
            : (Object.keys(response.content ?? {})[0] ?? "No response body");
        const body =
          operation.requestBody?.content?.["application/json"]?.schema;
        return {
          method,
          path,
          resource: resource(path),
          scope: access,
          status,
          mediaType,
          summary: operation.summary ?? method,
          description:
            `${method} ${path}` === "PATCH /v1/memories/{memory_id}"
              ? "Update content, importance, tags, metadata or expiration for an existing memory."
              : (operation.description?.split("\n\n")[0] ?? ""),
          sends: [
            ...(operation.parameters ?? []).map((parameter) => ({
              name: parameter.name,
              type: typeName(parameter.schema ?? {}),
              note: parameter.description ?? note(parameter.schema ?? {}),
              required:
                parameter.name.toLowerCase() === "x-api-key"
                  ? access !== "public"
                  : parameter.required,
              location: parameter.in,
            })),
            ...(body ? fields(body, "body") : []),
          ],
          gets:
            path === "/metrics"
              ? []
              : fields(response.content?.[mediaType]?.schema ?? {}, "response"),
          notes: NOTES[`${method} ${path}`],
        };
      }),
);
