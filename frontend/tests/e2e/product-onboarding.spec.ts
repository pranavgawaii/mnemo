import { expect, test } from "@playwright/test";
import schema from "../../public/openapi.json";

test("default playground has one guided action path to the new current city", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/playground");
  await expect(page.getByLabel("Sample scenario", { exact: true })).toHaveValue("relocation");
  await expect(page.getByLabel("New memory", { exact: true })).toHaveValue("Pranav moved from Bengaluru to Pune");
  await expect(page.getByRole("button", { name: "Start with recall", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: "Store memory", exact: true }).click();
  await expect(page.getByRole("link", { name: /Review below|Review changes/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Keep new", exact: true }).click();
  await expect(page.getByRole("button", { name: "Recall again", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Recall and compare", exact: true }).click();
  await expect(page.getByRole("region", { name: "After review context", exact: true })).toContainText("Pranav lives in Pune");
});

test("unconfigured API is explained before entering live mode and never sends writes", async ({ page }) => {
  let writes = 0;
  await page.route("**/api/demo", route => {
    if (route.request().method() === "POST") writes++;
    return route.fulfill({ json: { enabled: false, status: "unconfigured" } });
  });
  await page.goto("/playground");
  await expect(page.getByText("Browser demo works offline. Live API requires local setup.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Setup guide", exact: true })).toHaveAttribute("href", "/docs#live-api-setup");
  await page.getByRole("tab", { name: "Live API", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Connect your local API", exact: true })).toBeVisible();
  await expect(page.getByText("The hosted website cannot reach your laptop’s localhost.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save and recall a fact", exact: true })).toHaveCount(0);
  expect(writes).toBe(0);
});

test("docs match operation counts, independent scopes and current Python onboarding", async ({ page }) => {
  const methods = new Set(["get", "post", "put", "patch", "delete"]);
  const operations = Object.entries(schema.paths).flatMap(([path, data]) => Object.keys(data).filter(method => methods.has(method)).map(() => path));
  const authenticated = operations.filter(path => path.startsWith("/v1/")).length;
  await page.goto("/docs/api");
  await expect(page.locator("#api")).toContainText(`${operations.length} operations: ${authenticated} authenticated v1 operations and ${operations.length - authenticated} public operational endpoints`);
  await expect(page.locator("#auth")).toContainText("Read and write scopes must be granted separately.");
  await page.goto("/docs");
  await expect(page.locator("#quickstart")).toContainText("Docker loads and validates the local embedding model before serving requests.");
  await expect(page.locator("#agent-integration")).toContainText("python sdk/examples/assistant.py");
  await expect(page.locator("#agent-integration")).toContainText("client.context");
  await expect(page.locator("#agent-integration")).toContainText("Namespace grants restrict an issued key’s access through the API");
});

test("evaluation separates saved scopes and makes missed conflicts visible", async ({ page }) => {
  await page.goto("/docs/evaluation");
  await expect(page.getByRole("region", { name: "Query-only holdout", exact: true })).toContainText("same 60 synthetic memories");
  await expect(page.getByRole("region", { name: "Lifecycle regression results", exact: true })).toContainText("27/27 lifecycle checks");
  const challenges = page.getByRole("region", { name: "Conflict challenge results", exact: true });
  await expect(challenges).toContainText("58.3%");
  await challenges.getByText("Inspect 5 incorrect predictions", { exact: true }).click();
  await expect(challenges.getByText("numeric-budget", { exact: true })).toBeVisible();
  const response = await page.request.get("/evaluation/conflicts.json");
  expect(response.ok()).toBe(true);
  const report = await response.json();
  expect(report.true_positive + report.false_negative).toBe(12);
  expect(report.false_negative).toBe(5);
});
