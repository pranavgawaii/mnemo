import { expect, test } from "@playwright/test";

test.describe("site smoke tests", () => {
  test("landing renders without nested heading paragraphs", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Give your AI agents"
    );

    const nested = await page.locator("h1 p, h2 p, h3 p").count();
    expect(nested).toBe(0);
    expect(pageErrors).toEqual([]);
  });

  test("docs and playground routes render", async ({ page }) => {
    await page.goto("/docs");
    await expect(
      page.getByRole("heading", { name: "Developer guide" })
    ).toBeVisible();
    await expect(page.getByText("Eleven routes over a JSON interface")).toBeVisible();

    await page.goto("/playground");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Take");
  });

  test("playground stores a contradiction and resolves it", async ({ page }) => {
    await page.goto("/playground");

    await page.getByLabel("Recall query").fill("Where does Pranav live?");
    await page.getByRole("button", { name: "Run recall" }).click();
    await expect(page.getByText("7 active")).toHaveCount(0);

    await page
      .getByLabel("New memory")
      .fill("Pranav no longer lives in Bengaluru");
    await page.getByRole("button", { name: "Store memory" }).click();

    await expect(page.getByText("7 active")).toBeVisible();
    await expect(page.getByText(/conflict .* pick a winner/)).toBeVisible();

    await page.getByRole("button", { name: "keep new" }).click();
    await expect(page.getByText("soft-deleted · 1")).toBeVisible();
  });

  test("playground has no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/playground");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Take");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
