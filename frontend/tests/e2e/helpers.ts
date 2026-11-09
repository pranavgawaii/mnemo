import type { Page } from "@playwright/test";

/** Use the control users see at this breakpoint. */
export async function chooseScenario(page: Page, label: string) {
  const picker = page.getByLabel("Sample scenario", { exact: true });
  if (await picker.isVisible()) await picker.selectOption({ label });
  else await page.getByRole("group", { name: "Sample scenarios" }).getByRole("button", { name: label, exact: true }).click();
}

export async function showResults(page: Page, panel: "Context" | "Review") {
  const tabs = page.getByRole("tablist", { name: "Memory results", exact: true });
  if (await tabs.isVisible()) await tabs.getByRole("tab", { name: panel === "Context" ? "Context" : /^Review/, exact: panel === "Context" }).click();
}
