import type { Metadata } from "next";

export const DOC_PAGES = [
  {
    href: "/docs",
    title: "Get started",
    description:
      "Run Mnemo, store your first fact and retrieve it through the authenticated API.",
    sections: [
      { id: "quickstart", label: "Run the service" },
      { id: "first-memory", label: "Store a fact" },
      { id: "first-recall", label: "Recall it" },
      { id: "agent-integration", label: "Connect your agent" },
      { id: "live-api-setup", label: "Live API demo" },
      { id: "troubleshooting", label: "Troubleshooting" },
    ],
  },
  {
    href: "/docs/concepts",
    title: "Concepts",
    description:
      "Understand the architecture, retrieval policy, conflict review and limitations.",
    sections: [
      { id: "architecture", label: "Architecture" },
      { id: "retrieval", label: "Retrieval & ranking" },
      { id: "contradictions", label: "Conflict review" },
      { id: "limitations", label: "Limitations" },
    ],
  },
  {
    href: "/docs/api",
    title: "API reference",
    description:
      "Explore the API contracts, authentication model and memory data model.",
    sections: [
      { id: "api", label: "Endpoints" },
      { id: "auth", label: "Authentication" },
      { id: "data-model", label: "Data model" },
    ],
  },
  {
    href: "/docs/evaluation",
    title: "Evaluation",
    description:
      "Inspect the measured retrieval results, methodology and remaining evaluation gaps.",
    sections: [
      { id: "evaluation", label: "Results" },
      { id: "reproduce", label: "Reproduce the run" },
      { id: "next-experiments", label: "Next experiments" },
    ],
  },
] as const;

export function docsMetadata(href: string): Metadata {
  const page = DOC_PAGES.find((page) => page.href === href)!;
  const title = `${page.title} | Mnemo`;
  return {
    title,
    description: page.description,
    alternates: { canonical: href },
    openGraph: {
      type: "article",
      title,
      description: page.description,
      url: href,
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Mnemo documentation",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.description,
      images: ["/og.png"],
    },
  };
}
