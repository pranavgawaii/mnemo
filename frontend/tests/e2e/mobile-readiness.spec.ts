import { chooseScenario } from "./helpers";
import { expect, test } from "@playwright/test";
import { MEMORY_SCENARIOS } from "../../src/lib/memory/scenarios";
import { LIVE_SCENARIOS } from "../../src/lib/api/demo-scenarios";

for (const width of [320, 390, 768]) {
  for (const route of ["/", "/docs", "/docs/concepts", "/docs/api", "/docs/evaluation", "/playground"]) {
    test(`${route} and mobile navigation fit ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      if (route === "/" && width < 640) {
        const menu = page.getByRole("button", { name: "Open menu", exact: true });
        await menu.click();
        await expect(page.getByRole("button", { name: "Close menu", exact: true })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(menu).toBeFocused();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (width < 640) {
        const controls = page.locator('input:not([type="range"]):not([type="radio"]):not([type="checkbox"]), textarea, select').filter({ visible: true });
        for (const control of await controls.all()) {
          expect(await control.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
        }
      }
    });
  }
}

for (const scenario of MEMORY_SCENARIOS.filter(example => example.id !== "location" && example.id !== "relocation")) {
  test(`phone flow handles ${scenario.label} without layout jumps`, async ({ page, browserName }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/playground");
    await chooseScenario(page, scenario.label);
    const frame = page.locator("#workbench");
    const height = (await frame.boundingBox())!.height;
    const input = page.getByRole("textbox", { name: "New memory", exact: true });
    await expect(input).toHaveValue(scenario.change);
    if (browserName === "chromium" && scenario.id === "learning") {
      await page.screenshot({ path: "/tmp/mnemo-mobile-playground.png" });
    }
    expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(88);
    await page.getByRole("button", { name: "Store memory", exact: true }).click();
    if (scenario.kind === "review") {
      await expect(page.getByText("7 active memories · 1 open conflict", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Keep new", exact: true }).click();
      await page.getByRole("button", { name: "Recall and compare", exact: true }).click();
      await expect(page.getByRole("region", { name: "After review context", exact: true })).toContainText({ Learning: "Pranav is learning Go on weekends", Routine: "Pranav runs 3 kilometres twice a week", Preferences: "Pranav's favourite cuisine is Japanese" }[scenario.label as "Learning" | "Routine" | "Preferences"]);
    } else {
      await expect(page.getByRole("status", { name: "Workbench status" })).toContainText(scenario.kind === "uncertain" ? "unconfirmed note" : "alongside existing facts");
      await expect(page.getByRole("button", { name: "Keep new", exact: true })).toHaveCount(0);
      await expect(page.getByText("7 active memories · 0 open conflicts", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Recall again", exact: true }).click();
    }
    expect((await frame.boundingBox())!.height).toBeCloseTo(height, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test("phone live API examples are readable and switching starts a fresh view", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.route("**/api/demo", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { enabled: true, status: "available", embedding: "warm" } });
    const input = route.request().postDataJSON();
    const example = LIVE_SCENARIOS[input.scenario as keyof typeof LIVE_SCENARIOS];
    return route.fulfill({ json: {
      token: "test-session", phase: "stored", hits: [{ id: "test-id", content: example.previous, similarity: 0.72, score: 0.70 }], requests: [],
    } });
  });
  await page.goto("/playground");
  await page.getByRole("tab", { name: "Live API", exact: true }).click();
  const demo = page.getByRole("region", { name: "Live API demo", exact: true });
  const chooser = page.getByLabel("Choose a real API example");
  await expect(chooser).toBeEnabled();
  const height = (await demo.boundingBox())!.height;
  for (const [id, example] of Object.entries(LIVE_SCENARIOS)) {
    await chooser.selectOption(id);
    await expect(demo.getByRole("button", { name: "Save and recall a fact", exact: true })).toBeVisible();
    await demo.getByRole("button", { name: "Save and recall a fact", exact: true }).click();
    const old = demo.locator('[aria-label="Live context before change"]');
    const after = demo.locator('[aria-label="Live context after review"]');
    await expect(old).toContainText(example.previous);
    const oldBounds = (await old.boundingBox())!, afterBounds = (await after.boundingBox())!;
    expect(afterBounds.y).toBeGreaterThanOrEqual(oldBounds.y + oldBounds.height);
    const card = (await old.locator("li").boundingBox())!;
    expect(card.y + card.height).toBeLessThanOrEqual(afterBounds.y);
    expect((await demo.boundingBox())!.height).toBeCloseTo(height, 1);
  }
});

test("mobile uses one stable result panel and can revisit either view", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/playground");
  await chooseScenario(page, "Move city");
  const frame = page.locator("#workbench"), initial = (await frame.boundingBox())!.height;
  expect(initial).toBeLessThan(2200);
  const tabs = page.getByRole("tablist", { name: "Memory results", exact: true });
  await expect(tabs.getByRole("tab", { name: "Context", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: "3 Review a change", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Store memory", exact: true }).click();
  await expect(tabs.getByRole("tab", { name: "Review (1)", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: "Recalled context", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Keep new", exact: true }).click();
  await page.getByRole("button", { name: "Recall and compare", exact: true }).click();
  const after = page.getByRole("region", { name: "After review context", exact: true });
  await expect(after).toContainText("Pranav lives in Pune");
  await expect(after).not.toContainText("Bengaluru");
  if (browserName === "chromium") await page.screenshot({ path: "/tmp/mnemo-current-value-mobile.png" });
  await tabs.getByRole("tab", { name: "Context", exact: true }).press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Review (0)", exact: true })).toBeFocused();
  await expect(page.getByRole("region", { name: "Review complete", exact: true })).toContainText("Pranav lives in Pune");
  expect((await frame.boundingBox())!.height).toBeCloseTo(initial, 1);
});

test("API availability recovers after an outage without claiming configuration is health", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let available = false;
  await page.route("**/api/demo", route => route.fulfill({ json: { enabled: true, status: available ? "available" : "unavailable", embedding: "cold", checkedAt: new Date().toISOString(), reason: "unreachable" } }));
  await page.goto("/playground");
  await page.getByRole("tab", { name: "Live API", exact: true }).click();
  const demo = page.getByRole("region", { name: "Live API demo", exact: true });
  await expect(demo.getByRole("status", { name: "API availability" })).toHaveText("API unavailable");
  const height = (await demo.boundingBox())!.height;
  await expect(demo.getByRole("button", { name: "Save and recall a fact", exact: true })).toBeDisabled();
  available = true;
  await demo.getByRole("button", { name: "Check availability", exact: true }).click();
  await expect(demo.getByRole("status", { name: "API availability" })).toHaveText("API online");
  await expect(demo.getByRole("button", { name: "Save and recall a fact", exact: true })).toBeEnabled();
  await expect(demo).toContainText("starts on first use");
  expect((await demo.boundingBox())!.height).toBeCloseTo(height, 1);
});
