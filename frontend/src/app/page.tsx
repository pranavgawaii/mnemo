import { SiteNav } from "@/components/layout/site-nav";
import Hero from "@/components/landing/hero.mdx";
import { AgentMemoryDemo } from "@/components/landing/agent-memory-demo";
import { MemoryPipeline } from "@/components/landing/memory-pipeline";
import { RetrievalEvidence } from "@/components/landing/retrieval-evidence";
import { GetStarted } from "@/components/landing/get-started";
import { SiteFooter } from "@/components/layout/site-footer";
import { StructuredData } from "@/components/layout/structured-data";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      <StructuredData />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-[13px] focus:text-white"
      >
        Skip to content
      </a>

      <SiteNav />

      <main id="main" className="flex-1 w-full relative z-10">
        <Hero />
        <AgentMemoryDemo />
        <MemoryPipeline />
        <RetrievalEvidence />
        <GetStarted />
      </main>

      <SiteFooter />
    </div>
  );
}
