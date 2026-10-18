import { SiteNav } from "../components/site-nav";
import { Hero } from "../components/hero";
import { PipelineMarquee } from "../components/pipeline-marquee";
import { ProductExplainer } from "../components/product-explainer";
import { HowItWorks } from "../components/how-it-works";
import { Differentiator } from "../components/differentiator";
import { PrincipleQuote } from "../components/principle-quote";
import { FinalCta } from "../components/final-cta";
import { SiteFooter } from "../components/site-footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-[13px] focus:text-white"
      >
        Skip to content
      </a>

      <SiteNav />

      <main id="main" className="flex-1 w-full relative z-10">
        <Hero />
        <PipelineMarquee />
        <ProductExplainer />
        <HowItWorks />
        <Differentiator />
        <PrincipleQuote />
        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}
