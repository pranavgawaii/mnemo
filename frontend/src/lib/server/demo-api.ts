import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { LIVE_SCENARIOS, isDemoScenario, type DemoScenarioId } from "../api/demo-scenarios";
import type {
  DemoAction,
  DemoAvailability,
  DemoHit,
  DemoRequest,
  LiveDemoResult,
} from "../api/live-demo";

type Config = { url?: string; key?: string };
type Session = {
  scenario: DemoScenarioId;
  namespace: string;
  expiresAt: number;
  seedId: string;
  movedId?: string;
  conflictId?: string;
  phase: "stored" | "flagged" | "resolved";
};
const LIFETIME = 15 * 60 * 1000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

class DemoError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new DemoError(502, "The API returned an unexpected response.");
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value))
    throw new DemoError(502, "The API returned an invalid record ID.");
  return value;
}
async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new DemoError(400, "Choose a demo action.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new DemoError(413, "Demo request is too large.");
    }
    chunks.push(value);
  }
  try {
    return record(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    throw new DemoError(400, "Send a valid demo action as JSON.");
  }
}

/** Fixed example operations only: callers cannot choose the upstream, facts or namespace. */
export function createDemoApi(config: Config, send: typeof fetch = fetch) {
  let base = "";
  try {
    const url = new URL(config.url ?? "");
    if (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    )
      base = url.origin;
  } catch {
    /* An unconfigured demo stays offline. */
  }
  const enabled = Boolean(base && config.key);
  const signature = (payload: string) =>
    createHmac("sha256", config.key!)
      .update(`mnemo-demo-v1:${payload}`)
      .digest();
  function encode(session: Session) {
    const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
    return `${payload}.${signature(payload).toString("base64url")}`;
  }
  function decode(token: unknown): Session {
    if (typeof token !== "string" || token.length > 3000)
      throw new DemoError(400, "Start a new demo run first.");
    const [payload, mac, extra] = token.split(".");
    if (!payload || !mac || extra)
      throw new DemoError(
        400,
        "This demo session is invalid. Start a new run.",
      );
    const presented = Buffer.from(mac, "base64url"),
      expected = signature(payload);
    if (
      presented.length !== expected.length ||
      !timingSafeEqual(presented, expected)
    )
      throw new DemoError(
        400,
        "This demo session is invalid. Start a new run.",
      );
    let s: Record<string, unknown>;
    try {
      s = record(
        JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
      );
    } catch {
      throw new DemoError(
        400,
        "This demo session is invalid. Start a new run.",
      );
    }
    if (
      typeof s.namespace !== "string" ||
      !s.namespace.startsWith("web-demo-") ||
      !UUID.test(s.namespace.slice(9)) ||
      typeof s.expiresAt !== "number" ||
      s.expiresAt <= Date.now() ||
      s.expiresAt > Date.now() + LIFETIME ||
      !["stored", "flagged", "resolved"].includes(String(s.phase))
      || !isDemoScenario(s.scenario)
    )
      throw new DemoError(400, "This demo session expired. Start a new run.");
    id(s.seedId);
    if (s.movedId !== undefined) id(s.movedId);
    if (s.conflictId !== undefined) id(s.conflictId);
    return s as unknown as Session;
  }
  return {
    GET: async (request?: Request) => {
      if (!enabled) return json({ enabled: false, status: "unconfigured" } satisfies DemoAvailability);
      const checkedAt = new Date().toISOString();
      try {
        const response = await send(`${base}/v1/demo/availability`, {
          cache: "no-store",
          redirect: "error",
          headers: { "X-API-Key": config.key! },
          signal: AbortSignal.any([
            ...(request ? [request.signal] : []),
            AbortSignal.timeout(5_000),
          ]),
        });
        if (!response.ok) return json({
          enabled: true, status: "unavailable", checkedAt,
          reason: [401, 403].includes(response.status) ? "access" : response.status === 429 ? "busy" : "unreachable",
        } satisfies DemoAvailability);
        const result = record(await response.json());
        if (result.status !== "available" || !["warm", "cold"].includes(String(result.embedding))) throw new Error();
        return json({ enabled: true, status: "available", checkedAt, embedding: result.embedding as "cold" | "warm" } satisfies DemoAvailability);
      } catch {
        return json({ enabled: true, status: "unavailable", checkedAt, reason: "unreachable" } satisfies DemoAvailability);
      }
    },
    POST: async (request: Request) => {
      const requests: DemoRequest[] = [];
      const deadline = performance.now() + 45_000;
      try {
        if (!enabled)
          throw new DemoError(
            503,
            "Live API demo is not configured. Follow the setup guide.",
          );
        const origin = request.headers.get("Origin");
        if (origin && origin !== new URL(request.url).origin)
          throw new DemoError(403, "Open this demo on its own website.");
        const input = await body(request);
        if (
          Object.keys(input).some(
            (key) => !["action", "token", "scenario"].includes(key),
          ) ||
          (input.scenario !== undefined && (input.action !== "start" || !isDemoScenario(input.scenario))) ||
          !["start", "move", "resolve"].includes(String(input.action))
        )
          throw new DemoError(400, "Choose a supported demo action.");
        const action = input.action as DemoAction;
        const api = async (path: string, method: string, data?: unknown) => {
          const started = performance.now();
          const response = await send(`${base}${path}`, {
            method,
            cache: "no-store",
            redirect: "error",
            headers: {
              "X-API-Key": config.key!,
              "Content-Type": "application/json",
            },
            body: data === undefined ? undefined : JSON.stringify(data),
            signal: AbortSignal.any([
              request.signal,
              AbortSignal.timeout(
                Math.max(1, Math.ceil(deadline - performance.now())),
              ),
            ]),
          });
          requests.push({
            method,
            path,
            status: response.status,
            durationMs: Math.round(performance.now() - started),
          });
          if (!response.ok)
            throw new DemoError(
              response.status === 429 ? 429 : 502,
              response.status === 429
                ? "The demo API reached its request limit. Try again later."
                : "The API rejected this request. Check its key permissions and backend version.",
            );
          return record(await response.json());
        };
        const search = async (session: Session): Promise<DemoHit[]> => {
          const result = await api("/v1/memories/search", "POST", {
            namespace: session.namespace,
            query: LIVE_SCENARIOS[session.scenario].question,
            limit: 3,
          });
          if (!Array.isArray(result.hits))
            throw new DemoError(
              502,
              "The API returned an unexpected search response.",
            );
          return result.hits.map((value) => {
            const hit = record(value),
              memory = record(hit.memory);
            if (
              typeof memory.content !== "string" ||
              typeof hit.similarity !== "number" ||
              typeof hit.relevance_score !== "number"
            )
              throw new DemoError(
                502,
                "The API returned invalid search scores.",
              );
            return {
              id: id(memory.id),
              content: memory.content,
              currentStatement: typeof memory.current_statement === "string" ? memory.current_statement : null,
              similarity: hit.similarity,
              score: hit.relevance_score,
            };
          });
        };
        const store = (session: Session, content: string) =>
          api("/v1/memories", "POST", {
            namespace: session.namespace,
            content,
            importance: 3,
            expires_at: new Date(session.expiresAt).toISOString(),
          });
        let session: Session;
        let hits: DemoHit[] = [],
          change: string | undefined,
          reason: string | undefined,
          previousActive: boolean | undefined;
        if (action === "start") {
          session = {
            scenario: isDemoScenario(input.scenario) ? input.scenario : "relocation",
            namespace: `web-demo-${randomUUID()}`,
            expiresAt: Date.now() + LIFETIME,
            seedId: "",
            phase: "stored",
          };
          const created = await store(session, LIVE_SCENARIOS[session.scenario].previous);
          session.seedId = id(record(created.memory).id);
          hits = await search(session);
        } else {
          session = decode(input.token);
          if (action === "move") {
            if (session.phase !== "stored")
              throw new DemoError(
                409,
                "This run already has a change. Continue review or start a new run.",
              );
            const created = await store(session, LIVE_SCENARIOS[session.scenario].change);
            session.movedId = id(record(created.memory).id);
            const conflicts = Array.isArray(created.contradictions)
              ? created.contradictions.map(record)
              : [];
            const conflict = conflicts.find(
              (c) =>
                record(c.existing_memory).id === session.seedId &&
                record(c.new_memory).id === session.movedId,
            );
            if (!conflict || typeof conflict.reason !== "string")
              throw new DemoError(
                409,
                "The API did not flag this explicit change. Run the current backend and start a new demo run.",
              );
            session.conflictId = id(conflict.id);
            session.phase = "flagged";
            change = LIVE_SCENARIOS[session.scenario].change;
            reason = conflict.reason;
          } else {
            if (
              session.phase !== "flagged" ||
              !session.conflictId ||
              !session.movedId
            )
              throw new DemoError(
                409,
                "Store the change before resolving it.",
              );
            const resolved = await api("/v1/contradictions/resolve", "POST", {
              contradiction_id: session.conflictId,
              winner_memory_id: session.movedId,
            });
            if (
              resolved.status !== "resolved" ||
              resolved.resolved_winner_id !== session.movedId
            )
              throw new DemoError(
                502,
                "The API did not confirm the review decision.",
              );
            hits = await search(session);
            const previous = await api(
              `/v1/memories/${session.seedId}?namespace=${session.namespace}`,
              "GET",
            );
            if (previous.is_active !== false)
              throw new DemoError(
                502,
                "The API did not confirm that the previous fact is inactive.",
              );
            previousActive = false;
            session.phase = "resolved";
          }
        }
        return json({
          token: encode(session),
          phase: session.phase,
          hits,
          requests,
          change,
          reason,
          previousActive,
        } satisfies LiveDemoResult);
      } catch (error) {
        return json(
          {
            error:
              error instanceof DemoError
                ? error.message
                : "The live API is unavailable or timed out. Check the service and start a new run.",
            requests,
          },
          error instanceof DemoError ? error.status : 503,
        );
      }
    },
  };
}
