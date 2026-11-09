import { SiteNav } from "@/components/layout/site-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { DocsPagination } from "@/components/docs/docs-pagination";
import { DocsProgress } from "@/components/docs/docs-progress";
import { DocsToc } from "@/components/docs/docs-toc";
import { LegacyDocLinks } from "@/components/docs/legacy-doc-links";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <SiteNav />
      <DocsProgress />
      <LegacyDocLinks />
      <main id="main" className="relative w-full flex-1">
        <div className="mx-auto max-w-frame px-6 pb-12 pt-24 sm:pb-16 lg:pt-28">
          <div className="grid items-start gap-9 lg:grid-cols-[204px_minmax(0,1fr)] xl:gap-16">
            <DocsToc />
            <article className="min-w-0">
              {children}
              <DocsPagination />
            </article>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
