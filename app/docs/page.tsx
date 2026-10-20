import type { Metadata } from "next";
import { SiteNav } from "../../components/site-nav";
import { SiteFooter } from "../../components/site-footer";
import { DocsProgress } from "../../components/docs-progress";
import { DocsToc } from "../../components/docs-toc";
import DocsGuide from "../../components/docs-guide.mdx";

export const metadata: Metadata = {
  title: "Developer guide | Mnemo",
  description:
    "How Mnemo works, how to run it, its retrieval and ranking, the data model, the REST API, and interactive tools.",
  alternates: { canonical: "/docs" },
  openGraph: {
    type: "article",
    url: "/docs",
    title: "Developer guide | Mnemo",
    description:
      "How Mnemo works, how to run it, its retrieval and ranking, the data model, the REST API, and interactive tools.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Mnemo developer guide" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Developer guide | Mnemo",
    description:
      "How Mnemo works, how to run it, its retrieval and ranking, the data model, the REST API, and interactive tools.",
    images: ["/og.png"],
  },
};

export default function DocsPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-[13px] focus:text-white"
      >
        Skip to content
      </a>

      <SiteNav />
      <DocsProgress />

      <main id="main" className="relative z-10 w-full flex-1">
        <div className="mx-auto max-w-frame px-6 pb-20 pt-[88px]">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[204px_minmax(0,1fr)] xl:gap-14">
            <DocsToc />

            <article className="min-w-0">
              <DocsGuide />
            </article>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
