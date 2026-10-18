import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteNav } from "../../components/site-nav";
import { SiteFooter } from "../../components/site-footer";
import { DocsProgress } from "../../components/docs-progress";
import { DocsToc } from "../../components/docs-toc";
import {
  AuthSection,
  DataModelSection,
  LimitationsSection,
  QuickstartSection,
  RetrievalSection,
  TroubleshootingSection,
} from "../../components/documentation";
import { ArchitectureExplorer } from "../../components/architecture-explorer";
import { ApiExplorer } from "../../components/api-explorer";
import { LifecycleExplorer } from "../../components/lifecycle-explorer";
import { MemoryPlayground } from "../../components/memory-playground";
import { RankingExplorer } from "../../components/ranking-explorer";
import { ContradictionExplainer } from "../../components/contradiction-explainer";
import { Evaluation } from "../../components/evaluation";

export const metadata: Metadata = {
  title: "Developer guide · Mnemo",
  description:
    "How Mnemo works, how to run it, its retrieval and ranking, the data model, the REST API, and interactive tools.",
};

/**
 * A chapter break between groups of sections. The heavy top rule and the note
 * are what keep the page from reading as one continuous run of identical
 * sections; the first section under it drops its own hairline (globals.css).
 */
function Chapter({
  label,
  note,
  children,
}: {
  label: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="docs-chapter mt-16 first:mt-0">
      <div className="border-t-2 border-ink pb-7 pt-4">
        <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.2em] text-ink">
          {label}
        </h2>
        <p className="mt-2 max-w-[620px] text-[13.5px] leading-[1.7] text-muted">
          {note}
        </p>
      </div>
      {children}
    </div>
  );
}

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
        <div className="mx-auto max-w-frame px-6 pb-20 pt-[100px]">
          <div className="grid items-start gap-10 lg:grid-cols-[204px_minmax(0,1fr)] xl:gap-14">
            <DocsToc />

            <article className="min-w-0">
              <div id="overview" className="scroll-mt-[100px]">
                <h1 className="text-[30px] font-medium tracking-[-0.03em] text-ink md:text-[36px]">
                  Developer guide
                </h1>
                <p className="mt-3 max-w-[680px] text-[15px] leading-[1.7] text-muted">
                  Mnemo is a persistent-memory service for AI agents. Everything
                  below is taken from the repository — how it works, how to run
                  it, the exact REST contracts, and the trade-offs behind it.
                </p>
              </div>

              <div className="mt-14">
                <Chapter
                  label="Getting started"
                  note="Run Mnemo locally — a one-command Docker stack, or a Python environment against your own Postgres."
                >
                  <QuickstartSection />
                </Chapter>

                <Chapter
                  label="Concepts"
                  note="How the service is put together, how recall is ranked, and how conflicts are handled."
                >
                  <ArchitectureExplorer />
                  <RetrievalSection />
                  <LifecycleExplorer />
                </Chapter>

                <Chapter
                  label="Reference"
                  note="The exact tables, routes and access model — the parts you look up rather than read."
                >
                  <DataModelSection />
                  <ApiExplorer />
                  <AuthSection />
                </Chapter>

                <Chapter
                  label="Guides"
                  note="What the benchmark measures, what this version does not do, and how to get unstuck."
                >
                  <Evaluation />
                  <LimitationsSection />
                  <TroubleshootingSection />
                </Chapter>

                <Chapter
                  label="Interactive"
                  note="Browser-side simulations of the real logic. Nothing here touches the API."
                >
                  <MemoryPlayground />
                  <RankingExplorer />
                  <ContradictionExplainer />
                </Chapter>
              </div>
            </article>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
