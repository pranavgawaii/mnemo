import { chooseScenario } from "./helpers";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createDemoApi } from "../../src/lib/server/demo-api";
import { LIVE_SCENARIOS, type DemoScenarioId } from "../../src/lib/api/demo-scenarios";
import { checkContradiction } from "../../src/lib/memory/scoring";

const KEY = "test-server-only-key";
const OLD = {
  id: "00000000-0000-4000-8000-000000000001",
  content: "Demo user lives in Bengaluru",
};
const MOVED = {
  id: "00000000-0000-4000-8000-000000000002",
  content: "Demo user moved from Bengaluru to Pune",
};
const CONFLICT = "00000000-0000-4000-8000-000000000003";
const hit = (memory: typeof OLD) => ({
  memory,
  similarity: 0.71,
  relevance_score: 0.7,
});
const request = (action: string, token?: string, extra = {}) =>
  new Request("https://web.example/api/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token, ...extra }),
  });
function fixture(scenarioId: DemoScenarioId = "relocation") {
  const OLD = { id: "00000000-0000-4000-8000-000000000001", content: LIVE_SCENARIOS[scenarioId].previous };
  const MOVED = { id: "00000000-0000-4000-8000-000000000002", content: LIVE_SCENARIOS[scenarioId].change };
  const calls: { path: string; data: Record<string, unknown> | undefined }[] =
    [];
  const replies = [
    { status: 201, data: { memory: OLD } },
    { status: 200, data: { hits: [hit(OLD)] } },
    {
      status: 201,
      data: {
        memory: MOVED,
        contradictions: [
          {
            id: CONFLICT,
            existing_memory: OLD,
            new_memory: MOVED,
            reason: "Explicit relocation; review required.",
          },
        ],
      },
    },
    { status: 200, data: { status: "resolved", resolved_winner_id: MOVED.id } },
    { status: 200, data: { hits: [hit(MOVED)] } },
    { status: 200, data: { ...OLD, is_active: false } },
  ];
  const send = async (url: string | URL | Request, options?: RequestInit) => {
    expect(options?.headers).toMatchObject({ "X-API-Key": KEY });
    const data =
      typeof options?.body === "string" ? JSON.parse(options.body) : undefined;
    calls.push({ path: String(url), data });
    const response = replies.shift();
    expect(response).toBeDefined();
    return Response.json(response!.data, { status: response!.status });
  };
  return {
    calls,
    api: createDemoApi(
      { url: "https://api.example", key: KEY },
      send as typeof fetch,
    ),
  };
}

test("unconfigured live demo makes no upstream calls or credential disclosures", async () => {
  const api = createDemoApi({}, (() => {
    throw new Error("Must stay offline");
  }) as typeof fetch);
  expect(await (await api.GET()).json()).toEqual({ enabled: false, status: "unconfigured" });
  const response = await api.POST(request("start"));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain(KEY);
});

test("live demo proxy uses fixed facts, a signed isolated session and actual upstream response values", async () => {
  const { api, calls } = fixture();
  const first = await api.POST(request("start"));
  expect(first.status).toBe(200);
  const started = await first.json();
  expect(started.hits[0]).toMatchObject({
    content: OLD.content,
    similarity: 0.71,
    score: 0.7,
  });
  expect(calls[0].data?.namespace).toMatch(/^web-demo-/);
  expect(
    Date.parse(String(calls[0].data?.expires_at)) - Date.now(),
  ).toBeGreaterThan(14 * 60 * 1000);
  expect(calls[0].data?.content).toBe(OLD.content);
  const second = await api.POST(request("move", started.token));
  const changed = await second.json();
  expect(changed.phase).toBe("flagged");
  expect(changed.reason).toContain("Explicit relocation");
  expect(calls[2].data?.namespace).toBe(calls[0].data?.namespace);
  const third = await api.POST(request("resolve", changed.token));
  const resolved = await third.json();
  expect(resolved.phase).toBe("resolved");
  expect(resolved.previousActive).toBe(false);
  expect(resolved.hits[0].content).toBe(MOVED.content);
  expect(calls[3].data).toEqual({
    contradiction_id: CONFLICT,
    winner_memory_id: MOVED.id,
  });
  expect(calls).toHaveLength(6);
  expect(JSON.stringify([started, changed, resolved])).not.toContain(KEY);
  expect(resolved.requests.map((r: { status: number }) => r.status)).toEqual([
    200, 200, 200,
  ]);
});

test("tampered and expired demo sessions cannot choose upstream records", async () => {
  const { api, calls } = fixture();
  const started = await (await api.POST(request("start"))).json();
  expect((await api.POST(request("move", `x${started.token}`))).status).toBe(
    400,
  );
  const original = Date.now;
  try {
    Date.now = () => original() + 16 * 60 * 1000;
    expect((await api.POST(request("move", started.token))).status).toBe(400);
  } finally {
    Date.now = original;
  }
  expect(calls).toHaveLength(2);
});

test("demo refuses arbitrary namespaces, foreign origins and oversized bodies", async () => {
  const { api, calls } = fixture();
  expect(
    (await api.POST(request("start", undefined, { namespace: "private" })))
      .status,
  ).toBe(400);
  const foreign = request("start");
  foreign.headers.set("Origin", "https://other.example");
  expect((await api.POST(foreign)).status).toBe(403);
  expect((await api.POST(request("start", "x".repeat(5000)))).status).toBe(413);
  expect(calls).toHaveLength(0);
});

test("upstream failures never become fabricated successful results", async () => {
  const api = createDemoApi(
    { url: "https://api.example", key: KEY },
    (async () =>
      new Response(`private: ${KEY}`, { status: 401 })) as typeof fetch,
  );
  const response = await api.POST(request("start"));
  expect(response.status).toBe(502);
  const data = await response.json();
  expect(data.error).toContain("rejected");
  expect(data.hits).toBeUndefined();
  expect(JSON.stringify(data)).not.toContain(KEY);
});

const cases = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../backend/tests/fixtures/relocation_cases.json"),
    "utf8",
  ),
) as { name: string; new: string; old: string; expected: boolean }[];
for (const entry of cases) {
  test(`browser relocation parity: ${entry.name}`, () => {
    expect(checkContradiction(entry.new, entry.old, 0.1).isContradiction).toBe(
      entry.expected,
    );
  });
}

test("live mode explains setup and supports keyboard mode switching", async ({
  page,
}) => {
  await page.route("**/api/demo", (route) =>
    route.fulfill({ json: { enabled: false, status: "unconfigured" } }),
  );
  await page.goto("/playground");
  await page
    .getByRole("tab", { name: "Browser demo", exact: true })
    .press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Live API", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Connect your local API", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Live API demo", exact: true }),
  ).toContainText("server-only");
  await page
    .getByRole("tab", { name: "Live API", exact: true })
    .press("ArrowLeft");
  await expect(page.getByLabel("Recall query")).toBeVisible();
});

for (const width of [320, 1280]) {
  test(`live demo shows results, request evidence and errors at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const actions: string[] = [];
    await page.route("**/api/demo", async (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({ json: { enabled: true, status: "available", embedding: "warm" } });
      const input = route.request().postDataJSON();
      actions.push(input.action);
      if (input.action === "start")
        return route.fulfill({
          json: {
            token: "session-1",
            phase: "stored",
            hits: [
              {
                id: OLD.id,
                content: OLD.content,
                similarity: 0.713,
                score: 0.701,
              },
            ],
            requests: [
              {
                method: "POST",
                path: "/v1/memories",
                status: 201,
                durationMs: 23,
              },
            ],
          },
        });
      if (input.action === "move")
        return route.fulfill({
          json: {
            token: "session-2",
            phase: "flagged",
            hits: [],
            change: MOVED.content,
            reason: "Explicit relocation",
            requests: [
              {
                method: "POST",
                path: "/v1/memories",
                status: 201,
                durationMs: 19,
              },
            ],
          },
        });
      return route.fulfill({
        json: {
          token: "session-3",
          phase: "resolved",
          hits: [
            {
              id: MOVED.id,
              content: MOVED.content,
              similarity: 0.782,
              score: 0.771,
            },
          ],
          previousActive: false,
          requests: [
            {
              method: "POST",
              path: "/v1/memories/search",
              status: 200,
              durationMs: 12,
            },
          ],
        },
      });
    });
    await page.goto("/playground");
    await page.getByRole("tab", { name: "Live API", exact: true }).click();
    await page
      .getByRole("button", { name: "Save and recall a fact", exact: true })
      .click();
    const demo = page.getByRole("region", {
      name: "Live API demo",
      exact: true,
    });
    const height = (await demo.boundingBox())!.height;
    await expect(demo).toContainText("cosine 0.713");
    await demo
      .getByRole("button", { name: "Move from Bengaluru to Pune", exact: true })
      .click();
    await demo
      .getByRole("button", { name: "Keep Pune and recall", exact: true })
      .click();
    await expect(
      page.getByRole("region", {
        name: "Live context after review",
        exact: true,
      }),
    ).toContainText("Demo user lives in Pune");
    expect((await demo.boundingBox())!.height).toBe(height);
    await demo
      .getByRole("button", { name: "Inspect API requests", exact: true })
      .click();
    const details = page.getByRole("dialog", {
      name: "Live API requests",
      exact: true,
    });
    await expect(details).toContainText("HTTP 201 · 23 ms");
    await expect(details).toContainText("not a benchmark");
    await page.keyboard.press("Escape");
    expect(actions).toEqual(["start", "move", "resolve"]);
    await page.route("**/api/demo", (route) =>
      route.fulfill({
        status: 503,
        json: { error: "The live API is unavailable.", requests: [] },
      }),
    );
    await demo
      .getByRole("button", { name: "Start new run", exact: true })
      .click();
    await expect(demo.getByRole("status", { name: "Live walkthrough status" })).toContainText("unavailable");
    await expect(
      demo.getByRole("button", { name: "Start new run", exact: true }),
    ).toBeDisabled();
  });
}

for (const width of [320, 1280]) {
  for (const keepNew of [true, false]) {
    test(`explicit move updates browser recall at ${width}px keeping ${keepNew ? "Pune" : "Bengaluru"}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/playground");
      await chooseScenario(page, "Move city");
      const frame = () =>
        page
          .locator("#workbench")
          .evaluate((el) => el.getBoundingClientRect().height);
      const initial = await frame();
      const context = page.getByRole("region", {
        name: "Recalled context",
        exact: true,
      });
      const review = page.getByRole("region", {
        name: "3 Review a change",
        exact: true,
      });
      if (width === 320) {
        expect((await context.boundingBox())!.height).toBeLessThanOrEqual(420);
        await expect(review).not.toBeVisible();
      }
      await page
        .getByRole("button", { name: "Store memory", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: keepNew ? "Keep new" : "Keep existing",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Recall and compare", exact: true })
        .click();
      const after = page.getByRole("region", {
        name: "After review context",
        exact: true,
      });
      await expect(after).toContainText(
        keepNew
          ? "Pranav lives in Pune"
          : "Pranav lives in Bengaluru",
      );
      await expect(after.getByRole("button")).toHaveCount(1);
      expect(await frame()).toBe(initial);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
    });
  }
}

const revisionCases = JSON.parse(readFileSync(resolve(__dirname, "../../../backend/tests/fixtures/revision_cases.json"), "utf8")) as typeof cases;
for (const entry of revisionCases) {
  test(`browser revision parity: ${entry.name}`, () => {
    expect(checkContradiction(entry.new, entry.old, 0.1).isContradiction).toBe(entry.expected);
  });
}
for (const scenarioId of Object.keys(LIVE_SCENARIOS) as DemoScenarioId[]) {
  test(`proxy binds ${scenarioId} to a signed session`, async () => {
    const { api, calls } = fixture(scenarioId);
    const started = await (await api.POST(request("start", undefined, { scenario: scenarioId }))).json();
    expect(calls[0].data?.content).toBe(LIVE_SCENARIOS[scenarioId].previous);
    expect(calls[1].data?.query).toBe(LIVE_SCENARIOS[scenarioId].question);
    expect((await api.POST(request("move", started.token, { scenario: "routine" }))).status).toBe(400);
    const changed = await (await api.POST(request("move", started.token))).json();
    expect(calls[2].data?.content).toBe(LIVE_SCENARIOS[scenarioId].change);
    const resolved = await (await api.POST(request("resolve", changed.token))).json();
    expect(resolved.previousActive).toBe(false);
    expect(resolved.hits[0].content).toBe(LIVE_SCENARIOS[scenarioId].change);
  });
}
test("proxy rejects unknown and prototype scenario names", async () => {
  const { api, calls } = fixture();
  for (const scenario of ["other", "__proto__", "constructor", 123, null]) {
    expect((await api.POST(request("start", undefined, { scenario }))).status).toBe(400);
  }
  expect(calls).toHaveLength(0);
});

test("a second move reviews the current city and retains both earlier facts in history", async ({ page }) => {
  await page.goto("/playground");
  await chooseScenario(page, "Move city");
  await page.getByRole("button", { name: "Store memory", exact: true }).click();
  await page.getByRole("button", { name: "Keep new", exact: true }).click();
  await page.getByLabel("New memory", { exact: true }).fill("Pranav moved from Pune to Delhi");
  await page.getByRole("button", { name: "Store memory", exact: true }).click();
  const review = page.getByRole("region", { name: "Review details", exact: true });
  await expect(review).toContainText("Pranav moved from Bengaluru to Pune");
  await expect(review).toContainText("Pranav moved from Pune to Delhi");
  await page.getByRole("button", { name: "Keep new", exact: true }).click();
  await page.getByRole("button", { name: "Recall and compare", exact: true }).click();
  const after = page.getByRole("region", { name: "After review context", exact: true });
  await expect(after).toContainText("Pranav lives in Delhi");
  await expect(after.getByRole("button")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Open review & history.*2 inactive/ })).toBeVisible();
});

for (const embedding of ["cold", "warm"]) {
  test(`availability probes actual storage and key access with ${embedding} encoder`, async () => {
    const calls: string[] = [];
    const api = createDemoApi({ url: "https://api.example", key: KEY }, (async (url, options) => {
      calls.push(String(url));
      expect(options?.headers).toEqual({ "X-API-Key": KEY });
      expect(options?.body).toBeUndefined();
      expect(options?.signal).toBeDefined();
      return Response.json({ status: "available", embedding });
    }) as typeof fetch);
    const result = await (await api.GET()).json();
    expect(result).toMatchObject({ enabled: true, status: "available", embedding });
    expect(calls).toEqual(["https://api.example/v1/demo/availability"]);
    expect(JSON.stringify(result)).not.toContain(KEY);
  });
}
for (const status of [401, 403, 429, 500, 503]) {
  test(`availability never labels HTTP ${status} as online`, async () => {
    const api = createDemoApi({ url: "https://api.example", key: KEY }, (async () => new Response(KEY, { status })) as typeof fetch);
    const result = await (await api.GET()).json();
    expect(result.status).toBe("unavailable");
    expect(result.reason).toBe([401, 403].includes(status) ? "access" : status === 429 ? "busy" : "unreachable");
    expect(JSON.stringify(result)).not.toContain(KEY);
  });
}
test("availability sanitizes unreachable and malformed backend responses", async () => {
  for (const send of [async () => { throw new Error(KEY); }, async () => Response.json({ status: "ok" })]) {
    const api = createDemoApi({ url: "https://api.example", key: KEY }, send as typeof fetch);
    const result = await (await api.GET()).json();
    expect(result.status).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain(KEY);
  }
});
const currentCases = JSON.parse(readFileSync(resolve(__dirname, "../../../backend/tests/fixtures/current_statement_cases.json"), "utf8")) as { name: string; content: string; expected: string | null }[];
for (const entry of currentCases) {
  test(`Python/browser current-value parity: ${entry.name}`, async () => {
    const { currentStatement } = await import("../../src/lib/memory/changes");
    expect(currentStatement(entry.content)).toBe(entry.expected);
  });
}

test("copying current context uses the displayed value while inspection retains the source", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/playground");
  await chooseScenario(page, "Move city");
  await page.getByRole("button", { name: "Store memory", exact: true }).click();
  await page.getByRole("button", { name: "Keep new", exact: true }).click();
  await page.getByRole("button", { name: "Recall and compare", exact: true }).click();
  await page.getByRole("button", { name: "Show current context", exact: true }).click();
  await page.getByRole("button", { name: "Copy recalled context", exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("Pranav lives in Pune");
  await page.getByRole("button", { name: "Inspect fact: Pranav moved from Bengaluru to Pune", exact: true }).click();
  const inspector = page.getByRole("dialog", { name: "Memory inspector", exact: true });
  await expect(inspector).toContainText("Pranav lives in Pune");
  await expect(inspector).toContainText("Pranav moved from Bengaluru to Pune");
});
