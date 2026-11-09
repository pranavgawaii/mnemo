import { expect, test } from "@playwright/test";

const docs = [
  ["/docs", "Your first memory."],
  ["/docs/concepts", "A memory you can inspect."],
  ["/docs/api", "A small, explicit API."],
  ["/docs/evaluation", "The results, including the trade-offs."],
] as const;

test("landing keeps its hero and walks through an agent memory example", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Give your AI agents",
  );
  await expect(page.locator("main > section")).toHaveCount(5);
  await expect(
    page
      .getByRole("link", { name: "Try the playground", exact: true })
      .locator("svg"),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("link", { name: "View on GitHub", exact: true })
      .locator("svg"),
  ).toHaveCount(0);
  await expect(page.locator("h1 p, h2 p, h3 p")).toHaveCount(0);
  const demo = page.locator("#agent-example");
  await demo.getByRole("button", { name: "Recall the fact" }).click();
  await expect(demo.getByRole("status")).toContainText(
    "Recalled: Pranav lives in Bengaluru",
  );
  await demo.getByRole("button", { name: "Introduce a change" }).click();
  await expect(demo.getByRole("status")).toContainText(
    "Both facts remain active",
  );
  await demo.getByRole("button", { name: "Keep the new fact" }).click();
  await expect(demo.getByText("Kept in history · inactive")).toBeVisible();
  await demo.getByRole("button", { name: "Replay example" }).click();
  await expect(
    demo.getByRole("button", { name: "Recall the fact" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [route, heading] of docs) {
  test(`${route} has its own document, canonical and navigation`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    const nav = page.getByRole("navigation", {
      name: "Documentation",
      exact: true,
    });
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(nav.locator(`a[href="${route}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${route}$`),
    );
  });
}

test("quickstart includes usable store and search requests and copy controls", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs");
  await expect(page.locator("#first-memory pre").first()).toContainText(
    "X-API-Key: dev-local-key-change-me",
  );
  await expect(page.locator("#first-recall pre").first()).toContainText(
    "/v1/memories/search",
  );
  await page.getByRole("button", { name: "Copy Store a memory" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Pranav lives in Bengaluru");
});

test("API reference exposes corrected PATCH fields, pagination and public metrics", async ({
  page,
  request,
}) => {
  await page.goto("/docs/api");
  await page
    .getByRole("tab", { name: "PATCH /v1/memories/{memory_id}", exact: true })
    .click();
  const panel = page.locator("#api-panel");
  for (const field of ["tags", "metadata", "expires_at"])
    await expect(panel.getByText(field, { exact: true }).first()).toBeVisible();
  await expect(panel).toContainText("Explicit expires_at=null clears TTL");
  await page
    .getByRole("tab", { name: "GET /v1/memories", exact: true })
    .click();
  await expect(panel.getByText("next_cursor", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Operations", exact: true }).click();
  await page.getByRole("tab", { name: "GET /metrics", exact: true }).click();
  await expect(panel).toContainText("No authentication · 200 · text/plain");
  const response = await request.get("/openapi.json");
  expect(response.ok()).toBe(true);
  const schema = await response.json();
  expect(
    Object.values(schema.paths).reduce(
      (total: number, path) =>
        total +
        Object.keys(path as object).filter((key) =>
          ["get", "post", "patch", "delete"].includes(key),
        ).length,
      0,
    ),
  ).toBe(27);
});

test("API tabs support keyboard navigation", async ({ page }) => {
  await page.goto("/docs/api");
  const memories = page.getByRole("tab", { name: "Memories", exact: true });
  await memories.focus();
  await memories.press("ArrowRight");
  const conflicts = page.getByRole("tab", { name: "Conflicts", exact: true });
  await expect(conflicts).toBeFocused();
  await expect(conflicts).toHaveAttribute("aria-selected", "true");
});

for (const [oldHash, destination] of [
  ["architecture", "/docs/concepts#architecture"],
  ["api", "/docs/api#api"],
  ["evaluation", "/docs/evaluation#evaluation"],
  ["playground", "/playground"],
  ["ranking-calculator", "/playground#ranking-calculator"],
] as const) {
  test(`legacy docs bookmark ${oldHash} still works`, async ({ page }) => {
    await page.goto(`/docs#${oldHash}`);
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    if (oldHash === "ranking-calculator")
      await expect(page.getByLabel("Memory A similarity")).toBeVisible();
  });
}

test("recall waits for submit and Enter keeps the page in place", async ({
  page,
}) => {
  await page.goto("/playground");
  const input = page.getByLabel("Recall query");
  await input.fill("Can he eat ice cream?");
  await expect(
    page.getByText("For “Where does Pranav live?”", { exact: true }),
  ).toBeVisible();
  await input.press("Enter");
  await expect(
    page.getByRole("status", { name: "Workbench status" }),
  ).toHaveText("Recall scored 6 active memories.");
  await expect(
    page.getByText("For “Can he eat ice cream?”", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/playground$/);
});

test("playground stores, reviews, preserves history and resets", async ({
  page,
}) => {
  await page.goto("/playground");
  await page.getByRole("button", { name: "Use a sample conflict" }).click();
  await expect(page.getByLabel("New memory")).toBeFocused();
  await page.getByRole("button", { name: "Store memory", exact: true }).click();
  await expect(
    page.getByText("7 active memories · 1 open conflict", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep new", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Review complete", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#change-feedback")).toBeFocused();
  await expect(
    page.getByRole("status", { name: "Workbench status" }),
  ).toContainText("The losing memory is inactive");
  await expect(page.locator("#workbench ol")).toContainText(
    "Pranav no longer lives in Bengaluru",
  );
  await expect(
    page
      .locator("#workbench ol")
      .getByText("Pranav lives in Bengaluru", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Open review & history/ }).click();
  const history = page.getByRole("dialog", {
    name: "Review and history",
    exact: true,
  });
  await expect(
    history.getByRole("button", {
      name: "Pranav lives in Bengaluru",
      exact: true,
    }),
  ).toBeVisible();
  await history
    .getByRole("button", { name: "Close Review and history", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.locator("#change-feedback")).toHaveCount(0);
  await expect(
    page.getByRole("status", { name: "Workbench status" }),
  ).toHaveText("Playground reset to six sample memories.");
  await expect(
    page.getByRole("button", { name: "Keep new", exact: true }),
  ).toHaveCount(0);
});

test("visible scoring controls change scores and reset", async ({ page }) => {
  await page.goto("/playground");
  await expect(page.getByLabel("Advance all memories")).toBeVisible();
  const inspect = page.getByRole("button", {
    name: "Inspect fact: Pranav lives in Bengaluru",
    exact: true,
  });
  await inspect.click();
  const score = page.getByText(/similarity × .* decay × .* weight =/);
  const original = await score.textContent();
  await page
    .getByRole("button", { name: "Close Memory inspector", exact: true })
    .click();
  await page.getByRole("button", { name: "+30d", exact: true }).click();
  await inspect.click();
  await expect(score).not.toHaveText(original!);
  await page.getByLabel("Importance", { exact: true }).selectOption("5");
  await expect(score).toContainText("1.100 weight");
  await page
    .getByRole("button", { name: "Close Memory inspector", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Similarity only", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Similarity only", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByLabel("Advance all memories")).toHaveValue("0");
  await expect(
    page.getByRole("button", { name: "Base relevance", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("conflict experiment deep link opens both disclosures", async ({
  page,
}) => {
  await page.goto("/playground#contradiction-checker");
  await expect(
    page.getByLabel("Existing memory", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Incoming memory", { exact: true })
    .fill("Pranav lives in Bengaluru");
  await expect(page.locator("#contradiction-checker")).toContainText(
    "not flagged",
  );
});

test("Escape closes the mobile menu and returns focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .locator("header")
    .getByRole("link", { name: "Playground", exact: true })
    .filter({ visible: true })
    .focus();
  await page.keyboard.press("Escape");
  const open = page.getByRole("button", { name: "Open menu" });
  await expect(open).toHaveAttribute("aria-expanded", "false");
  await expect(open).toBeFocused();
});

for (const width of [320, 390]) {
  test(`all routes fit ${width}px and the composer appears before advanced visuals`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/", ...docs.map(([path]) => path), "/playground"]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        route,
      ).toBeLessThanOrEqual(1);
    }
    await expect(page.getByLabel("New memory")).toBeInViewport({ ratio: 1 });
    await expect(
      page.locator('svg[aria-label^="Memory field"]'),
    ).not.toBeVisible();
  });
}

test("docs contents follow scrolling in both directions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/docs");
  await page.evaluate(() => document.fonts.ready);
  const nav = page.getByRole("navigation", { name: "On this page" });
  const links = await nav
    .getByRole("link")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href")!),
    );
  for (const href of [...links, ...links.toReversed()]) {
    await page.evaluate((hash) => {
      const section = document.getElementById(hash.slice(1))!;
      window.scrollTo({
        top:
          section.getBoundingClientRect().top +
          scrollY -
          parseFloat(getComputedStyle(section).scrollMarginTop),
        behavior: "instant",
      });
    }, href);
    await expect(nav.locator(`a[href="${href}"]`)).toHaveAttribute(
      "aria-current",
      "location",
    );
  }
});

test("agent transfer respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Recall the fact", exact: true })
    .click();
  await expect(page.locator(".agent-transfer")).toHaveCSS(
    "animation-name",
    "none",
  );
});

for (const width of [320, 390, 768, 1280]) {
  test(`benchmark metrics fit without horizontal scrolling at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/docs/evaluation");
    const region = page.getByRole("region", { name: "Retrieval benchmark" });
    const size = await region.evaluate((element) => ({
      width: element.clientWidth,
      content: element.scrollWidth,
    }));
    expect(size.content).toBeLessThanOrEqual(size.width + 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    for (const value of [
      "74.0%",
      "94.0%",
      "0.841",
      "72.0%",
      "92.0%",
      "0.824",
      "70.0%",
      "90.0%",
      "0.809",
    ]) {
      await expect(
        region.getByText(value, { exact: true }).filter({ visible: true }),
      ).toBeVisible();
    }
    if (width < 640)
      await expect(
        region.getByRole("heading", { name: "Raw cosine", exact: true }),
      ).toBeVisible();
    else await expect(region.getByRole("table")).toBeVisible();
  });
}

for (const width of [320, 390]) {
  test(`all four docs destinations are visible without sideways scrolling at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/docs");
    const nav = page.getByRole("navigation", {
      name: "Documentation",
      exact: true,
    });
    for (const name of [
      "Get started",
      "Concepts",
      "API reference",
      "Evaluation",
    ]) {
      const link = nav.getByRole("link", { name, exact: true });
      await expect(link).toBeInViewport({ ratio: 1 });
      const box = await link.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
  });
}

test("quickstart switches both examples to the documented Python SDK", async ({
  page,
}) => {
  await page.goto("/docs");
  await page.getByRole("radio", { name: "Python SDK", exact: true }).check();
  await expect(page.locator("#first-memory pre").first()).toContainText(
    "memory, conflicts = client.add_memory",
  );
  await page.locator("#python-sdk-setup summary").click();
  await expect(page.locator("#python-sdk-setup pre")).toContainText(
    "pip install -e ./sdk",
  );
  await expect(page.locator("#first-recall pre").first()).toContainText(
    "result = client.search",
  );
  await page
    .getByText("See a complete search response · 200", { exact: true })
    .click();
  await expect(page.locator("#first-recall pre").last()).toContainText(
    '"relevance_score": 0.85',
  );
  await page
    .getByRole("radio", { name: "Python SDK", exact: true })
    .press("ArrowLeft");
  await expect(
    page.getByRole("radio", { name: "cURL", exact: true }),
  ).toBeChecked();
  await expect(page.locator("#first-memory pre").first()).toContainText(
    "curl -sS",
  );
});

test("playground explains scores and gives a useful empty state", async ({
  page,
}) => {
  await page.goto("/playground");
  await expect(page.locator("#workbench ol > li")).toHaveCount(1);
  const result = page
    .locator("#workbench ol")
    .getByRole("button", { name: /Pranav lives in Bengaluru/ });
  await result.click();
  await expect(result).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText(
      "Scores explain this browser example; they are not probabilities or live model measurements.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close Memory inspector", exact: true })
    .click();
  await page
    .getByLabel("Recall query")
    .fill("How does quantum entanglement work?");
  await page.getByLabel("Recall query").press("Enter");
  await expect(
    page.getByRole("heading", { name: "No close match in these sample facts" }),
  ).toBeVisible();
  await page
    .getByLabel("New memory")
    .fill("Quantum entanglement connects these particles");
  await page.getByRole("button", { name: "Store memory", exact: true }).click();
  await expect(page.locator("#workbench ol")).toContainText(
    "Quantum entanglement connects these particles",
  );
});

test("whitespace cannot create a fake empty memory", async ({ page }) => {
  await page.goto("/playground");
  await page.getByLabel("New memory").fill("   ");
  await page.getByRole("button", { name: "Store memory", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Workbench status" }),
  ).toHaveText("Enter a fact before storing it.");
  await expect(page.getByLabel("New memory")).toBeFocused();
  await expect(
    page.getByText("6 active memories · 0 open conflicts", { exact: true }),
  ).toBeVisible();
});

test("mobile API operation selection reaches PATCH without scrolling past endpoint tabs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/api");
  const select = page.getByLabel("Operation", { exact: true });
  await expect(select).toBeVisible();
  const option = select.getByRole("option", {
    name: "PATCH /v1/memories/{memory_id}",
    exact: true,
  });
  await select.selectOption((await option.getAttribute("value"))!);
  await expect(page.locator("#api-panel")).toContainText(
    "Explicit expires_at=null clears TTL",
  );
  await expect(
    page.getByRole("tablist", { name: "Endpoints", exact: true }),
  ).not.toBeVisible();
});

test("GitHub icon has a name on hover and keyboard focus without a duplicate Docs link", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary", exact: true });
  await expect(
    nav.getByRole("link", { name: "Docs", exact: true }),
  ).toHaveCount(0);
  await expect(
    nav.getByRole("link", { name: "Playground", exact: true }),
  ).toBeVisible();
  const github = nav.getByRole("link", { name: "GitHub", exact: true });
  const tooltip = nav.getByRole("tooltip", { name: /GitHub/ });
  await github.hover();
  await expect(tooltip).toBeVisible();
  await tooltip.hover();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).not.toBeVisible();
  await page.mouse.move(0, 100);
  await expect(tooltip).not.toBeVisible();
  await github.focus();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("GitHub");
  await github.press("Escape");
  await expect(tooltip).not.toBeVisible();
  await expect(github).toBeFocused();
});

for (const [scenario, existing, incoming] of [
  [
    "Location",
    "Pranav lives in Bengaluru",
    "Pranav no longer lives in Bengaluru",
  ],
  [
    "Learning",
    "Pranav is learning Rust on weekends",
    "Pranav is no longer learning Rust on weekends",
  ],
  [
    "Routine",
    "Pranav runs 5 kilometres three mornings a week",
    "Pranav no longer runs 5 kilometres three mornings a week",
  ],
] as const) {
  for (const keepNew of [true, false]) {
    test(`${scenario} scenario preserves the chosen ${keepNew ? "new" : "existing"} fact and explains the change`, async ({
      page,
    }) => {
      await page.goto("/playground");
      const scenarios = page.getByRole("group", { name: "Sample scenarios" });
      await scenarios
        .getByRole("button", { name: scenario, exact: true })
        .click();
      await expect(
        scenarios.getByRole("button", { name: scenario, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByLabel("New memory")).toHaveValue(incoming);
      await expect(
        page.getByText("6 active memories · 0 open conflicts", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Store memory", exact: true })
        .click();
      await expect(
        page.getByText("7 active memories · 1 open conflict", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: keepNew ? "Keep new" : "Keep existing",
          exact: true,
        })
        .click();
      const feedback = page.getByRole("region", {
        name: "Review complete",
        exact: true,
      });
      await expect(feedback).toBeFocused();
      await expect(feedback).toContainText("Before review · both active");
      await expect(feedback).toContainText("After review · one active");
      await expect(feedback.locator("p.line-through")).toHaveText(
        keepNew ? existing : incoming,
      );
      const context = page.locator("#workbench ol");
      await expect(context).toContainText(keepNew ? incoming : existing);
      await expect(
        context.getByText(keepNew ? existing : incoming, { exact: true }),
      ).toHaveCount(0);
      await scenarios
        .getByRole("button", {
          name: scenario === "Location" ? "Learning" : "Location",
          exact: true,
        })
        .click();
      await expect(feedback).toHaveCount(0);
      await expect(
        page.getByText("6 active memories · 0 open conflicts", { exact: true }),
      ).toBeVisible();
    });
  }
}

test("agent integration guide exposes the adapter and model boundary without adding a docs page", async ({
  page,
}) => {
  await page.goto("/docs#agent-integration");
  const guide = page.locator("#agent-integration");
  await expect(
    guide.getByRole("heading", { name: "4. Connect your agent", exact: true }),
  ).toBeVisible();
  await guide
    .getByText("Python adapter · retrieve, review, generate", { exact: true })
    .click();
  await expect(guide.locator("pre").first()).toContainText(
    "def answer_with_memory",
  );
  await expect(guide.locator("pre").first()).toContainText(
    "return generate(prompt)",
  );
  await expect(guide.locator("pre").last()).toContainText(
    "generate=your_model_call",
  );
  await expect(
    page
      .getByRole("navigation", { name: "Documentation", exact: true })
      .getByRole("link"),
  ).toHaveCount(4);
});

test("architecture separates deployment boundaries from the keyboard-accessible user flow", async ({
  page,
}) => {
  await page.goto("/docs/concepts#architecture");
  const map = page.getByRole("tab", { name: "System map", exact: true });
  await expect(
    page.getByRole("img", { name: /Mnemo deployment and data paths/ }),
  ).toBeVisible();
  await map.focus();
  await map.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "User flow", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  for (const name of ["Remember flow", "Recall flow", "Review flow"])
    await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  await map.click();
  const panel = page.getByRole("tabpanel", { name: "System map", exact: true });
  await expect(
    panel
      .getByText("Mnemo · one Python API process", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    panel
      .getByText("PostgreSQL + pgvector", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test("retrieval summary follows empty results, review and reset without duplicating context", async ({
  page,
}) => {
  await page.goto("/playground");
  const visual = page.getByRole("figure", {
    name: "Retrieval trace",
    exact: true,
  });
  await expect(
    visual.getByText("6 active facts", { exact: true }),
  ).toBeVisible();
  await expect(visual.getByText("1 returned", { exact: true })).toBeVisible();
  await page
    .getByLabel("Recall query")
    .fill("How does quantum entanglement work?");
  await page.getByLabel("Recall query").press("Enter");
  await expect(visual.getByText("0 returned", { exact: true })).toBeVisible();
  await page
    .getByRole("group", { name: "Sample scenarios" })
    .getByRole("button", { name: "Location", exact: true })
    .click();
  await page.getByRole("button", { name: "Store memory", exact: true }).click();
  await expect(
    visual.getByText("7 active facts", { exact: true }),
  ).toBeVisible();
  await expect(visual.getByText("2 returned", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Keep new", exact: true }).click();
  await visual
    .getByRole("button", { name: "Inspect Handoff stage", exact: true })
    .click();
  const trace = page.getByRole("dialog", {
    name: "Retrieval trace",
    exact: true,
  });
  await expect(
    trace.getByRole("heading", {
      name: "1 fact is ready for your application",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    trace.getByRole("button", { name: /^Active fact:/ }),
  ).toHaveCount(0);
  await trace
    .getByRole("button", { name: "Close Retrieval trace", exact: true })
    .click();
  await page.getByRole("button", { name: /Open review & history/ }).click();
  const review = page.getByRole("dialog", {
    name: "Review and history",
    exact: true,
  });
  await review
    .getByRole("button", { name: "Pranav lives in Bengaluru", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Memory inspector", exact: true }),
  ).toContainText("Inactive · history");
  await page
    .getByRole("button", { name: "Close Memory inspector", exact: true })
    .click();
  await review
    .getByRole("button", { name: "Close Review and history", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(visual.getByText("1 returned", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Open review & history/ }),
  ).toContainText("0 inactive");
});

test("footer links stay reachable on every page and back-to-top interrupts scrolling", async ({
  page,
}) => {
  for (const route of ["/", ...docs.map(([path]) => path), "/playground"]) {
    await page.goto(route);
    const footer = page.getByRole("contentinfo");
    const report = footer.getByRole("link", {
      name: "Report an issue",
      exact: true,
    });
    await report.scrollIntoViewIfNeeded();
    await expect(report).toBeInViewport({ ratio: 1 });
    const top = footer.getByRole("button", {
      name: "Back to top ↑",
      exact: true,
    });
    await top.click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  }
});

test("wheel easing yields to anchors and live reduced-motion preferences", async ({
  page,
}) => {
  await page.goto("/docs/concepts");
  await expect(page.locator("html")).toHaveClass(/lenis/);
  await page.mouse.move(800, 300);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(150);
  const nav = page.getByRole("navigation", {
    name: "On this page",
    exact: true,
  });
  await nav.getByRole("link", { name: "Limitations", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("#limitations")
        .evaluate((element) =>
          Math.abs(
            element.getBoundingClientRect().top -
              parseFloat(getComputedStyle(element).scrollMarginTop),
          ),
        ),
    )
    .toBeLessThan(3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await nav.getByRole("link", { name: "Architecture", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("#architecture")
        .evaluate((element) =>
          Math.abs(
            element.getBoundingClientRect().top -
              parseFloat(getComputedStyle(element).scrollMarginTop),
          ),
        ),
    )
    .toBeLessThan(3);
});

test("mobile footer keeps credits clear of the wordmark and every link reachable", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const footer = page.getByRole("contentinfo");
    const top = footer.getByRole("button", {
      name: "Back to top ↑",
      exact: true,
    });
    await top.scrollIntoViewIfNeeded();
    for (const name of [
      "Quickstart",
      "Evaluation",
      "Report an issue",
      "Pranav Gawai",
    ])
      await expect(
        footer.getByRole("link", { name, exact: true }),
      ).toBeInViewport({ ratio: 1 });
    const credit = await footer
      .getByRole("link", { name: "Pranav Gawai", exact: true })
      .boundingBox();
    const frame = await footer.boundingBox();
    expect(
      frame!.y + frame!.height - credit!.y - credit!.height,
    ).toBeGreaterThan(64);
    await top.click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  }
});

for (const width of [320, 390, 1280]) {
  test(`landing example keeps its frame through every stage at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const demo = page.locator("#agent-example");
    const initial = await demo.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    const nextTop = await page
      .locator("#how-it-works")
      .evaluate((element) => element.getBoundingClientRect().top + scrollY);
    for (const action of [
      "Recall the fact",
      "Introduce a change",
      "Keep the new fact",
      "Replay example",
    ]) {
      if (width < 640) {
        const button = await demo
          .getByRole("button", { name: action, exact: true })
          .boundingBox();
        const hint = await demo
          .getByText("You control the next step", { exact: true })
          .boundingBox();
        expect(hint!.y).toBeGreaterThanOrEqual(button!.y + button!.height);
      }
      await demo.getByRole("button", { name: action, exact: true }).click();
      expect(
        await demo.evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
      ).toBeCloseTo(initial, 0);
      expect(
        await page
          .locator("#how-it-works")
          .evaluate((element) => element.getBoundingClientRect().top + scrollY),
      ).toBeCloseTo(nextTop, 0);
    }
  });

  test(`docs language switches preserve both request frames at ${width}px`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/docs");
    await page.evaluate(() => document.fonts.ready);
    const sizes = () =>
      page.evaluate(() =>
        ["first-memory", "first-recall"].map(
          (id) => document.getElementById(id)!.getBoundingClientRect().height,
        ),
      );
    const original = await sizes();
    await page.getByRole("radio", { name: "Python SDK", exact: true }).check();
    expect(await sizes()).toEqual(original);
    await page
      .getByRole("button", { name: "Copy Store a memory", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("client.add_memory");
    await page.getByRole("radio", { name: "cURL", exact: true }).check();
    await expect(
      page.getByRole("button", { name: "Copy Store a memory", exact: true }),
    ).toHaveText("Copy");
    expect(await sizes()).toEqual(original);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });

  test(`playground preserves its frame through input, review and inspection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/playground");
    await page.evaluate(() => document.fonts.ready);
    const height = () =>
      page
        .locator("#workbench")
        .evaluate((element) => element.getBoundingClientRect().height);
    const initial = await height();
    await page
      .getByRole("group", { name: "Sample scenarios" })
      .getByRole("button", { name: "Preferences", exact: true })
      .click();
    expect(await height()).toBeCloseTo(initial, 0);
    await page
      .getByRole("button", { name: "Store memory", exact: true })
      .click();
    expect(await height()).toBeCloseTo(initial, 0);
    await page.getByRole("button", { name: "Keep new", exact: true }).click();
    expect(await height()).toBeCloseTo(initial, 0);
    const resultBottom = await page
      .locator("#change-feedback")
      .evaluate((element) => element.getBoundingClientRect().bottom);
    const reviewButtonTop = await page
      .getByRole("button", { name: /Open review & history/ })
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(resultBottom).toBeLessThanOrEqual(reviewButtonTop);
    await page
      .getByRole("button", { name: "Inspect Query stage", exact: true })
      .click();
    const trace = page.getByRole("dialog", {
      name: "Retrieval trace",
      exact: true,
    });
    const traceHeight = await trace.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    for (const name of ["Query", "Candidates", "Rank", "Handoff"]) {
      await trace.getByRole("tab", { name, exact: true }).click();
      expect(await height()).toBeCloseTo(initial, 0);
      expect(
        await trace.evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
      ).toEqual(traceHeight);
    }
    await trace
      .getByRole("button", { name: "Close Retrieval trace", exact: true })
      .click();
    await page
      .getByLabel("New memory")
      .fill(
        "Pranav lives in Pune. " + "A detailed confirmed fact. ".repeat(30),
      );
    await page
      .getByRole("button", { name: "Store memory", exact: true })
      .click();
    expect(await height()).toBeCloseTo(initial, 0);
    await page.getByRole("button", { name: "+90d", exact: true }).click();
    await page
      .getByRole("button", { name: "Similarity only", exact: true })
      .click();
    expect(await height()).toBeCloseTo(initial, 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
}

test("retrieval trace supports keyboard stages, inspection and reduced-motion replay", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/playground");
  await page
    .getByRole("group", { name: "Sample scenarios" })
    .getByRole("button", { name: "Preferences", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inspect Query stage", exact: true })
    .click();
  const trace = page.getByRole("dialog", {
    name: "Retrieval trace",
    exact: true,
  });
  await expect(
    trace.getByRole("tabpanel", { name: "Query", exact: true }),
  ).toContainText("What food does Pranav like?");
  await trace
    .getByRole("tab", { name: "Query", exact: true })
    .press("ArrowRight");
  await expect(
    trace.getByRole("tab", { name: "Candidates", exact: true }),
  ).toBeFocused();
  await expect(
    trace
      .getByRole("tabpanel", { name: "Candidates", exact: true })
      .getByRole("button"),
  ).toHaveCount(6);
  await trace.getByRole("tab", { name: "Rank", exact: true }).click();
  await trace
    .getByRole("tabpanel", { name: "Rank", exact: true })
    .getByRole("button")
    .first()
    .click();
  const inspector = page.getByRole("dialog", {
    name: "Memory inspector",
    exact: true,
  });
  await expect(inspector).toContainText("Pranav is lactose intolerant");
  const score = inspector.getByText(/similarity × .* decay × .* weight =/);
  const previousScore = await score.textContent();
  await inspector.getByLabel("Importance", { exact: true }).selectOption("1");
  await expect(score).not.toHaveText(previousScore!);
  await inspector
    .getByRole("button", { name: "Close Memory inspector", exact: true })
    .click();
  await expect(
    trace
      .getByRole("tabpanel", { name: "Rank", exact: true })
      .getByRole("button", { name: /lactose intolerant/ }),
  ).toBeFocused();
  await trace
    .getByRole("button", { name: "Replay trace", exact: true })
    .click();
  await expect(
    trace.getByRole("tab", { name: "Handoff", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("replay can be stopped, tabs remain stable and closing returns focus", async ({
  page,
}) => {
  await page.goto("/playground");
  const trigger = page.getByRole("button", {
    name: "Inspect retrieval",
    exact: true,
  });
  await trigger.click();
  const trace = page.getByRole("dialog", {
    name: "Retrieval trace",
    exact: true,
  });
  await trace
    .getByRole("button", { name: "Replay trace", exact: true })
    .click();
  const stop = trace.getByRole("button", { name: "Stop replay", exact: true });
  await expect(stop).toBeFocused();
  await stop.click();
  await trace.getByRole("tab", { name: "Candidates", exact: true }).click();
  await expect(
    trace.getByRole("tab", { name: "Candidates", exact: true }),
  ).toBeFocused();
  await expect(
    trace
      .getByRole("tabpanel", { name: "Candidates", exact: true })
      .getByRole("button"),
  ).toHaveCount(6);
  await page.keyboard.press("Escape");
  await expect(trace).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

for (const width of [320, 390, 1280]) {
  test(`docs explorers keep stable frames when content changes at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/docs/api");
    const api = page.locator("#api-panel");
    const original = await api.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    await api
      .getByText("Request and response example", { exact: true })
      .click();
    expect(
      await api.evaluate((element) => element.getBoundingClientRect().height),
    ).toEqual(original);
    const note = api.getByText(/Default duplicate mode accepts the write/);
    await note.scrollIntoViewIfNeeded();
    await expect(note).toBeInViewport();
    if (width >= 1024)
      await page
        .getByRole("tab", {
          name: "DELETE /v1/memories/{memory_id}",
          exact: true,
        })
        .click();
    else {
      const select = page.getByLabel("Operation", { exact: true });
      const option = select.getByRole("option", {
        name: "DELETE /v1/memories/{memory_id}",
        exact: true,
      });
      await select.selectOption((await option.getAttribute("value"))!);
    }
    expect(await api.evaluate((element) => element.scrollTop)).toEqual(0);
    expect(
      await api.evaluate((element) => element.getBoundingClientRect().height),
    ).toEqual(original);
    await page.getByRole("tab", { name: "Operations", exact: true }).click();
    expect(
      await api.evaluate((element) => element.getBoundingClientRect().height),
    ).toEqual(original);
    await page.goto("/docs/concepts");
    const figure = page.getByRole("figure", {
      name: "Mnemo system architecture",
      exact: true,
    });
    const mapHeight = await figure.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    await page.getByRole("tab", { name: "User flow", exact: true }).click();
    expect(
      await figure.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toEqual(mapHeight);
    const lifecycle = page.locator("#life-panel");
    const lifecycleHeight = await lifecycle.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    for (const name of ["Flagged", "Resolved", "Inactive", "Active"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      expect(
        await lifecycle.evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
      ).toEqual(lifecycleHeight);
    }
  });
}

for (const width of [320, 390, 1280]) {
  test(`main playground has no nested vertical scrolling and expanded details stay readable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/playground");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const innerScrollers = await page
      .locator("#workbench > div:first-child *")
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            return (
              element.getClientRects().length > 0 &&
              element.scrollHeight > element.clientHeight + 1 &&
              /auto|scroll/.test(style.overflowY)
            );
          })
          .map(
            (element) => element.getAttribute("aria-label") || element.tagName,
          ),
      );
    expect(innerScrollers).toEqual([]);
    const text =
      "Pranav lives in Pune. " + "A detailed confirmed fact. ".repeat(30);
    await page.getByLabel("Recall query").fill("Where does Pranav live?");
    await page.getByLabel("Recall query").press("Enter");
    await page.getByLabel("New memory").fill(text);
    await page
      .getByRole("button", { name: "Store memory", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: `Inspect fact: ${text.trim()}`,
        exact: true,
      })
      .click();
    const inspector = page.getByRole("dialog", {
      name: "Memory inspector",
      exact: true,
    });
    await expect(inspector.getByText(text.trim(), { exact: true })).toHaveText(
      text.trim(),
    );
    const note = inspector.getByText(
      "Scores explain this browser example; they are not probabilities or live model measurements.",
      { exact: true },
    );
    await note.scrollIntoViewIfNeeded();
    await expect(note).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(inspector).not.toBeVisible();
    await expect(
      page.getByRole("button", {
        name: `Inspect fact: ${text.trim()}`,
        exact: true,
      }),
    ).toBeFocused();
  });
}

test("ranking feedback explains a real promotion and compares unchanged orders honestly", async ({
  page,
}) => {
  await page.goto("/playground");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  const context = page.getByRole("region", {
    name: "Context matches",
    exact: true,
  });
  await expect(context.getByRole("button").first()).toHaveAccessibleName(
    /lactose intolerant/,
  );
  await page.getByRole("button", { name: "+90d", exact: true }).click();
  const comparison = page.getByRole("status", {
    name: "Ranking comparison",
    exact: true,
  });
  await expect(comparison).toContainText("The order changed");
  await expect(comparison).toContainText("Pranav is allergic to peanuts");
  await expect(comparison).toContainText("#2");
  await expect(comparison).toContainText("#1");
  await expect(comparison).toContainText("Time: +0 → +90 days");
  await expect(context.getByRole("button").first()).toHaveAccessibleName(
    /allergic to peanuts/,
  );
  await page.getByRole("button", { name: "+1y", exact: true }).click();
  await expect(comparison).toContainText("Order unchanged for these facts");
  await page
    .getByRole("button", { name: "Similarity only", exact: true })
    .click();
  await expect(comparison).toContainText(
    "age and importance no longer affect the order",
  );
});

test("handoff copies exactly the visible context without repeating the facts", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/playground");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  const facts = await page
    .getByRole("region", { name: "Context matches", exact: true })
    .locator("ol li button > span:nth-child(2) > span:first-child")
    .allTextContents();
  await page
    .getByRole("button", { name: "Inspect Handoff stage", exact: true })
    .click();
  const handoff = page.getByRole("dialog", {
    name: "Retrieval trace",
    exact: true,
  });
  await expect(
    handoff
      .getByRole("tabpanel", { name: "Handoff", exact: true })
      .getByRole("list"),
  ).toHaveCount(0);
  await handoff
    .getByRole("button", { name: "Copy recalled context", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(facts.join("\n"));
});

test("highlighted examples preserve exact source when copied", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs");
  const example = page.locator("#first-memory pre code").first();
  const original = await example.textContent();
  await expect(example).toHaveClass(/language-bash/);
  expect(await example.locator(".hljs-string").count()).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Copy Store a memory", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(original);
  await page.getByRole("radio", { name: "Python SDK", exact: true }).check();
  await expect(example).toHaveClass(/language-python/);
  expect(await example.locator(".hljs-keyword").count()).toBeGreaterThan(0);
  const python = await example.textContent();
  await page
    .getByRole("button", { name: "Copy Store a memory", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(python);
  await page
    .getByText("See a complete store response · 201", { exact: true })
    .click();
  await expect(
    page.locator("#first-memory pre code.language-json"),
  ).toBeVisible();
});

for (const width of [320, 390, 1280]) {
  test(`expanded architecture remains stable, readable and keyboard accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/docs/concepts");
    const preview = page.locator(".architecture-panel");
    expect(
      await preview.evaluate(
        (element) => element.scrollHeight - element.clientHeight,
      ),
    ).toBeLessThanOrEqual(1);
    await page.getByRole("tab", { name: "User flow", exact: true }).click();
    expect(
      await preview.evaluate(
        (element) => element.scrollHeight - element.clientHeight,
      ),
    ).toBeLessThanOrEqual(1);
    await page.getByRole("tab", { name: "System map", exact: true }).click();
    const trigger = page.getByRole("button", {
      name: "Expand architecture",
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole("dialog", {
      name: "System architecture",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const size = await dialog.boundingBox();
    if (width === 1280) {
      const diagram = dialog.getByRole("img", {
        name: /Mnemo deployment and data paths/,
      });
      const fittedHeight = (await diagram.boundingBox())!.height;
      await dialog
        .getByRole("button", { name: "Read larger", exact: true })
        .click();
      expect((await diagram.boundingBox())!.height).toBeGreaterThan(
        fittedHeight,
      );
      await dialog
        .getByRole("button", { name: "Fit diagram", exact: true })
        .click();
      expect((await diagram.boundingBox())!.height).toEqual(fittedHeight);
    }
    await dialog.getByRole("tab", { name: "User flow", exact: true }).click();
    await expect(
      dialog.getByRole("region", { name: "Recall flow", exact: true }),
    ).toBeVisible();
    expect((await dialog.boundingBox())!.height).toEqual(size!.height);
    await dialog
      .getByRole("tab", { name: "User flow", exact: true })
      .press("ArrowLeft");
    await expect(
      dialog.getByRole("tab", { name: "System map", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
}

test("API operations have an expanded reading surface with examples and complete notes", async ({
  page,
}) => {
  await page.goto("/docs/api");
  await page
    .getByRole("button", { name: "Expand operation", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add Memory", exact: true });
  await expect(dialog).toContainText("Default duplicate mode accepts");
  await dialog
    .getByText("Request and response example", { exact: true })
    .click();
  await expect(dialog.locator("code.language-json")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Close Add Memory", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Expand operation", exact: true }),
  ).toBeFocused();
});
