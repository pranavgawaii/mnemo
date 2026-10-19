export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL ?? null;

/** Dedicated technical documentation + interactive tools page. */
export const DOCS_URL = "/docs";

/** Standalone interactive playground — its own page, its own bar. */
export const PLAYGROUND_URL = "/playground";

export type NavLink = { label: string; href: string; external?: boolean };

/** Links that sit on the left, beside the wordmark. */
export const NAV_LEFT: NavLink[] = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
];

/** Links that sit beside the centred logo. */
export const NAV_RIGHT: NavLink[] = [
  { label: "Playground", href: PLAYGROUND_URL },
  ...(GITHUB_URL
    ? [{ label: "GitHub", href: GITHUB_URL, external: true }]
    : []),
];

/** Flat list, used by the mobile menu. */
export const NAV_LINKS: NavLink[] = [...NAV_LEFT, ...NAV_RIGHT];

type Cta = { label: string; href: string; external: boolean };

/**
 * Primary call to action. Points at the repository when one is configured,
 * otherwise falls back to the documentation page — no placeholder URL is
 * invented.
 */
export const PRIMARY_CTA: Cta = GITHUB_URL
  ? { label: "View on GitHub", href: GITHUB_URL, external: true }
  : { label: "Read the docs", href: DOCS_URL, external: false };

/** Secondary call to action shown next to the primary one. */
export const SECONDARY_CTA: Cta = {
  label: "Explore the docs",
  href: DOCS_URL,
  external: false,
};

/**
 * Cross-page anchors. Root-absolute paths so they resolve correctly from both
 * the landing page and the docs page.
 */
export const ANCHORS = {
  // Landing page
  top: "/#top",
  howItWorks: "/#how-it-works",
  features: "/#features",
  principle: "/#principle",
  // Docs page
  docs: DOCS_URL,
  overview: `${DOCS_URL}#overview`,
  quickstart: `${DOCS_URL}#quickstart`,
  architecture: `${DOCS_URL}#architecture`,
  retrieval: `${DOCS_URL}#retrieval`,
  contradictions: `${DOCS_URL}#contradictions`,
  dataModel: `${DOCS_URL}#data-model`,
  api: `${DOCS_URL}#api`,
  auth: `${DOCS_URL}#auth`,
  evaluation: `${DOCS_URL}#evaluation`,
  limitations: `${DOCS_URL}#limitations`,
  troubleshooting: `${DOCS_URL}#troubleshooting`,
  playground: PLAYGROUND_URL,
  rankingCalculator: `${PLAYGROUND_URL}#ranking-calculator`,
  contradictionChecker: `${PLAYGROUND_URL}#contradiction-checker`,
} as const;

export interface DocNavGroup {
  group: string;
  items: { id: string; label: string }[];
}

/** Documentation table of contents, grouped; shared by the sidebar. */
export const DOC_NAV: DocNavGroup[] = [
  {
    group: "Getting started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "quickstart", label: "Local setup" },
    ],
  },
  {
    group: "Concepts",
    items: [
      { id: "architecture", label: "How it's built" },
      { id: "retrieval", label: "Retrieval & ranking" },
      { id: "contradictions", label: "Contradictions" },
    ],
  },
  {
    group: "Reference",
    items: [
      { id: "data-model", label: "Data model" },
      { id: "api", label: "REST API" },
      { id: "auth", label: "Auth & namespaces" },
    ],
  },
  {
    group: "Guides",
    items: [
      { id: "evaluation", label: "Evaluation" },
      { id: "limitations", label: "Limitations" },
      { id: "troubleshooting", label: "Troubleshooting" },
    ],
  },
  {
    group: "Interactive",
    items: [
      { id: "playground", label: "Memory playground" },
      { id: "ranking-calculator", label: "Ranking calculator" },
      { id: "contradiction-checker", label: "Contradiction checker" },
    ],
  },
];
