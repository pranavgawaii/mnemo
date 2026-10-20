/**
 * Repository URL. Defaults to this project's repository so the GitHub links
 * and "View on GitHub" CTAs are always present; override with
 * `NEXT_PUBLIC_GITHUB_URL` when pointing at a fork or mirror.
 */
export const GITHUB_URL =
  process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/pranavgawaii/mnemo";

/** Dedicated technical documentation + interactive tools page. */
export const DOCS_URL = "/docs";

/** Standalone interactive playground: its own page, its own bar. */
export const PLAYGROUND_URL = "/playground";

/**
 * Canonical origin for the deployed site. Read from an explicit
 * `NEXT_PUBLIC_SITE_URL` when set, otherwise from the domain Vercel assigns the
 * project, and finally from the local dev server. `metadataBase`, the sitemap,
 * robots and the structured data all build on this, so no canonical URL ever
 * points at a guessed domain.
 */
const VERCEL_HOST =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? null;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (VERCEL_HOST ? `https://${VERCEL_HOST}` : "http://localhost:3005");

/** Contact address shown in the footer. */
export const CONTACT_EMAIL = "mnemo@2026";

/** One-line pitch, reused by metadata, structured data and the OG card. */
export const SITE_TAGLINE = "Persistent memory API for AI agents";

export type NavLink = { label: string; href: string; external?: boolean };

/** Links that sit on the left, beside the wordmark. */
export const NAV_LEFT: NavLink[] = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
];

/** Links that sit beside the centred logo. */
export const NAV_RIGHT: NavLink[] = [
  { label: "Playground", href: PLAYGROUND_URL },
  { label: "GitHub", href: GITHUB_URL, external: true },
];

/** Flat list, used by the mobile menu. */
export const NAV_LINKS: NavLink[] = [...NAV_LEFT, ...NAV_RIGHT];

type Cta = { label: string; href: string; external: boolean };

/**
 * Primary call to action. Points at the repository by default; set
 * `NEXT_PUBLIC_GITHUB_URL` to override it.
 */
export const PRIMARY_CTA: Cta = {
  label: "View on GitHub",
  href: GITHUB_URL,
  external: true,
};

/** Secondary call to action shown next to the primary one. */
export const SECONDARY_CTA: Cta = {
  label: "Explore the docs",
  href: DOCS_URL,
  external: false,
};

/**
 * The navbar's right-hand button. Points at the docs on purpose: the repo now
 * already has its own link in the nav, so the call to action stays focused.
 */
export const NAV_CTA: Cta = {
  label: "Read docs",
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
  // The playground is one workbench now, so both tools live on the same page.
  rankingCalculator: PLAYGROUND_URL,
  contradictionChecker: PLAYGROUND_URL,
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
