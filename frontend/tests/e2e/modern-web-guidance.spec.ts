import { expect, test } from "@playwright/test";

for (const route of ["/", "/docs", "/docs/api"]) {
  test(`keyboard skip link moves focus into ${route}`, async ({ page }) => {
    await page.goto(route);
    const skip = page.getByRole("link", { name: "Skip to content", exact: true });
    await skip.focus();
    await skip.press("Enter");
    await expect.poll(() => page.locator("main").evaluate(el => el === document.activeElement || el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Tab");
    await expect(page.locator("main h1")).not.toHaveAttribute("tabindex");
  });
}

test("skip links work before JavaScript loads", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    for (const route of ["/", "/docs", "/docs/api", "/playground"]) {
      await page.goto(route);
      const skip = page.getByRole("link", { name: /Skip to/ });
      await skip.focus();
      await skip.press("Enter");
      const target = route === "/playground" ? "#workbench" : "#main";
      await expect(page.locator(target)).toBeFocused();
    }
  } finally {
    await context.close();
  }
});

test("primary navigation identifies docs and playground without color alone", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const [route, current] of [["/docs", "page"], ["/docs/api", "location"]]) {
    await page.goto(route);
    const docs = page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Read docs" });
    await expect(docs).toHaveAttribute("aria-current", current);
    await expect(docs).toHaveCSS("text-decoration-line", "underline");
  }
  await page.goto("/playground");
  const link = page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Playground", exact: true }).filter({ visible: true });
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(link).toHaveCSS("background-size", "100% 1px");
});

test("mobile navigation dismisses outside and stays closed after resizing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open menu", exact: true });
  await trigger.click();
  await expect(page.getByRole("button", { name: "Close menu", exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Playground", exact: true })).toBeVisible();
  await page.mouse.click(10, 650);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(page.getByRole("button", { name: "Close menu", exact: true })).toHaveAttribute("aria-expanded", "true");
  await page.setViewportSize({ width: 1280, height: 900 });
  // Observe the wide-layout response before resizing again. Read docs is visible
  // at both widths, so it cannot synchronize a matchMedia change event.
  await expect(page.getByRole("navigation", { name: "Primary", exact: true }).locator("button[aria-controls]")).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await trigger.press("Enter");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("mobile navigation keeps its keyboard fallback without Popover support", async ({ page }) => {
  await page.addInitScript(() => { Reflect.deleteProperty(HTMLElement.prototype, "popover"); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // Unsupported browsers need script to install the manual fallback.
  await expect(page.locator(".site-mobile-menu")).not.toHaveAttribute("popover");
  const trigger = page.getByRole("button", { name: "Open menu", exact: true });
  await trigger.click();
  await page.locator("header").getByRole("link", { name: "Playground", exact: true }).filter({ visible: true }).focus();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await page.mouse.click(10, 650);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("code copy failures are visible, retryable and do not move the section", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")),
    } });
  });
  await page.goto("/docs");
  const copy = page.getByRole("button", { name: "Copy Store a memory", exact: true });
  await copy.scrollIntoViewIfNeeded();
  const before = await page.locator("#first-memory").boundingBox();
  await copy.focus();
  await copy.press("Enter");
  const feedback = page.getByRole("status").filter({ hasText: "Copy failed" });
  await expect(feedback).toBeVisible();
  await expect(copy).toBeEnabled();
  await expect(copy).toBeFocused();
  expect((await page.locator("#first-memory").boundingBox())!.height).toEqual(before!.height);
  const first = await feedback.textContent();
  await copy.press("Enter");
  await expect.poll(() => feedback.textContent()).not.toBe(first);
});

test("successful copy feedback clears rather than staying stale", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.resolve() } });
  });
  await page.goto("/docs");
  await page.getByRole("button", { name: "Copy Store a memory", exact: true }).click();
  const block = page.locator("#first-memory");
  await expect(block.getByRole("status").filter({ hasText: "Copied" })).toBeVisible();
  await expect(block.getByRole("status").first()).toBeEmpty({ timeout: 5000 });
});

test("recalled context reports clipboard denial visibly", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")),
    } });
  });
  await page.goto("/playground");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const copy = page.getByRole("button", { name: "Copy recalled context", exact: true });
  await expect(copy).toBeEnabled();
  await copy.click();
  await expect(page.getByRole("status").filter({ hasText: "Copy failed" })).toBeVisible();
});

test("playground fields expose their hints and reject whitespace-only submissions", async ({ page }) => {
  await page.goto("/playground");
  const query = page.getByLabel("Recall query", { exact: true });
  const fact = page.getByLabel("New memory", { exact: true });
  await expect(query).toHaveAccessibleDescription(/Match the old city/);
  await expect(fact).toHaveAccessibleDescription(/Both facts stay active until you review/);
  await expect(page.getByRole("form", { name: /Recall a fact/ })).toBeVisible();
  await query.fill("   ");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(query).toBeFocused();
  expect(await query.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  await query.fill("Where does Pranav live?");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await fact.fill("   ");
  await page.getByRole("button", { name: "Store memory", exact: true }).click();
  await expect(fact).toBeFocused();
  expect(await fact.evaluate((el: HTMLTextAreaElement) => el.validationMessage)).toContain("not just spaces");
  await fact.fill("Pranav prefers concise answers");
  expect(await fact.evaluate((el: HTMLTextAreaElement) => el.validity.valid)).toBe(true);
});

test("decorative motion can be paused and the choice survives navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Pause animations", exact: true }).click();
  await expect(page.locator(".hxo-spin").first()).toHaveCSS("animation-play-state", "paused");
  await page.goto("/docs/concepts");
  await expect(page.getByRole("button", { name: "Resume animations", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume animations", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause animations", exact: true })).toBeVisible();
});

test("expanded architecture preserves width, selection drags and focus return", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/docs/concepts");
  const trigger = page.getByRole("button", { name: "Expand architecture", exact: true });
  await trigger.scrollIntoViewIfNeeded();
  const width = await page.locator("main").evaluate(el => el.getBoundingClientRect().width);
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "System architecture", exact: true });
  await expect(dialog.getByRole("button", { name: "Close System architecture", exact: true })).toBeFocused();
  expect(await page.locator("main").evaluate(el => el.getBoundingClientRect().width)).toEqual(width);
  const rect = (await dialog.boundingBox())!;
  await page.mouse.move(rect.x + 80, rect.y + 30);
  await page.mouse.down();
  await page.mouse.move(rect.x - 8, rect.y + 30);
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("memory map supports release-to-activate Space and reduced-motion focus", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/playground");
  await page.getByText("Explore the mechanics", { exact: true }).click();
  await page.getByText("Memory map", { exact: true }).click();
  const node = page.locator("svg").getByRole("button", { name: /^Rank 1\./ });
  await node.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(node).toBeFocused();
  await page.keyboard.down("Space");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(node).toHaveCSS("transition-duration", "0s");
  await expect(node).toHaveCSS("outline-style", "solid");
  await page.keyboard.up("Space");
  await expect(page.getByRole("dialog", { name: "Memory inspector", exact: true })).toBeVisible();
});

test("landing benchmark exposes column and row headers", async ({ page }) => {
  await page.goto("/");
  const table = page.getByRole("table", { name: "Local in-sample retrieval benchmark", exact: true });
  await expect(table.getByRole("columnheader")).toHaveCount(2);
  await expect(table.getByRole("rowheader")).toHaveCount(3);
});

for (const width of [320, 390]) {
  test(`mobile navigation works without JavaScript at ${width}px`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: "Primary", exact: true });
      const trigger = nav.getByRole("button", { name: "Open menu", exact: true });
      const playground = nav.getByRole("link", { name: "Playground", exact: true });
      await expect(playground).not.toBeVisible();
      await trigger.focus();
      await trigger.press("Enter");
      await expect(playground).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(playground).not.toBeVisible();
      await expect(trigger).toBeFocused();
    } finally {
      await context.close();
    }
  });
}

test("an early native menu opening survives delayed hydration", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  let release!: () => void;
  const scripts = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/_next/static/**/*.js", async route => {
    await scripts;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "commit" });
    const nav = page.getByRole("navigation", { name: "Primary", exact: true });
    const trigger = nav.getByRole("button", { name: "Open menu", exact: true });
    const playground = nav.getByRole("link", { name: "Playground", exact: true });
    await trigger.focus();
    await trigger.press("Enter");
    await expect(playground).toBeVisible();
    release();
    await expect(nav.getByRole("button", { name: "Close menu", exact: true })).toHaveAttribute("aria-expanded", "true");
    await expect(playground).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(playground).not.toBeVisible();
    await expect(trigger).toBeFocused();
  } finally {
    release();
  }
});

test("playground waits for hydration before accepting facts", async ({ page }) => {
  let release!: () => void;
  const scripts = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/_next/static/**/*.js", async route => {
    await scripts;
    await route.continue();
  });
  try {
    await page.goto("/playground", { waitUntil: "commit" });
    const memory = page.getByLabel("New memory", { exact: true });
    const query = page.getByLabel("Recall query", { exact: true });
    await expect(memory).toBeDisabled();
    await expect(query).toBeDisabled();
    release();
    await expect(memory).toBeEnabled();
    await query.fill("Where does Pranav live?");
    await memory.fill("   ");
    await page.getByRole("button", { name: "Store memory", exact: true }).click();
    await expect.poll(() => memory.evaluate((el: HTMLTextAreaElement) => el.validationMessage)).toContain("not just spaces");
    await expect(page.getByText("6 active memories · 0 open conflicts", { exact: true })).toBeVisible();
    await memory.fill("Pranav prefers short answers");
    await page.getByRole("button", { name: "Store memory", exact: true }).click();
    await expect(page.getByText("7 active memories · 0 open conflicts", { exact: true })).toBeVisible();
  } finally {
    release();
  }
});
