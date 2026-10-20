import {
  DOCS_URL,
  GITHUB_URL,
  PLAYGROUND_URL,
  SITE_TAGLINE,
  SITE_URL,
} from "../lib/site";

/**
 * JSON-LD for the landing page. This is what turns the page from "a URL a
 * crawler found" into an entity it can describe: a named website, a piece of
 * software with a licence and a price of zero, and the person who wrote it.
 *
 * Written as one `@graph` so the nodes can reference each other by `@id`
 * instead of repeating themselves, and rendered from a server component, so the
 * emitted string is identical on both sides of hydration.
 */
export function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Mnemo",
        description: SITE_TAGLINE,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#author` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: "Mnemo",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        description:
          "A persistent-memory service for AI agents: pgvector semantic search, time-decay ranking, and deterministic contradiction detection with a soft-delete audit trail.",
        url: SITE_URL,
        softwareHelp: `${SITE_URL}${DOCS_URL}`,
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        ...(GITHUB_URL ? { codeRepository: GITHUB_URL } : {}),
        author: { "@id": `${SITE_URL}/#author` },
        sameAs: GITHUB_URL ? [GITHUB_URL] : undefined,
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#author`,
        name: "Pranav Gawai",
        url: "https://pranavx.in",
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: "Mnemo | Persistent memory API for AI agents",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#software` },
        primaryImageOfPage: `${SITE_URL}/og.png`,
        hasPart: [
          { "@type": "WebPage", name: "Developer guide", url: `${SITE_URL}${DOCS_URL}` },
          { "@type": "WebPage", name: "Playground", url: `${SITE_URL}${PLAYGROUND_URL}` },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
