/**
 * Repository URL. Defaults to this project's repository so the GitHub links
 * and "View on GitHub" CTAs are always present; override with
 * `NEXT_PUBLIC_GITHUB_URL` when pointing at a fork or mirror.
 */
export const GITHUB_URL =
  process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/pranavgawaii/mnemo";

/** Entry point for the four-page developer documentation. */
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

/** Public support destination; no placeholder email address. */
export const CONTACT_URL = `${GITHUB_URL}/issues`;

/** One-line pitch, reused by metadata, structured data and the OG card. */
export const SITE_TAGLINE = "Persistent memory API for AI agents";

export type NavLink = { label: string; href: string; external?: boolean };

/** Primary navigation. */
export const NAV_LINKS: NavLink[] = [
  { label: "Playground", href: PLAYGROUND_URL },
  { label: "GitHub", href: GITHUB_URL, external: true },
];

type Cta = { label: string; href: string; external: boolean };

/** Primary hero action: experience the browser simulation. */
export const PRIMARY_CTA: Cta = {
  label: "Try the playground",
  href: PLAYGROUND_URL,
  external: false,
};

/** Secondary hero action: inspect the source. */
export const SECONDARY_CTA: Cta = {
  label: "View on GitHub",
  href: GITHUB_URL,
  external: true,
};

/** One navbar entry for the documentation. */
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
  features: "/#how-it-works",
  principle: "/#evidence",
  // Docs page
  docs: DOCS_URL,
  overview: `${DOCS_URL}#overview`,
  quickstart: `${DOCS_URL}#quickstart`,
  architecture: `${DOCS_URL}/concepts#architecture`,
  retrieval: `${DOCS_URL}/concepts#retrieval`,
  contradictions: `${DOCS_URL}/concepts#contradictions`,
  dataModel: `${DOCS_URL}/api#data-model`,
  api: `${DOCS_URL}/api#api`,
  auth: `${DOCS_URL}/api#auth`,
  evaluation: `${DOCS_URL}/evaluation#evaluation`,
  limitations: `${DOCS_URL}/concepts#limitations`,
  troubleshooting: `${DOCS_URL}#troubleshooting`,
  playground: PLAYGROUND_URL,
  // Optional experiments live in the playground.
  rankingCalculator: `${PLAYGROUND_URL}#ranking-calculator`,
  contradictionChecker: `${PLAYGROUND_URL}#contradiction-checker`,
} as const;
