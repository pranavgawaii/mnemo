import type { Metadata } from "next";
import { SiteNav } from "../../components/site-nav";
import { SiteFooter } from "../../components/site-footer";
import { MemoryWorkbench } from "../../components/memory-workbench";

export const metadata: Metadata = {
  title: "Playground | Mnemo",
  description:
    "A hands-on workbench for Mnemo's memory: search six facts by meaning, age the whole store, flip between similarity and relevance, store a contradicting memory, and settle the conflict yourself. Everything runs in your browser.",
  alternates: { canonical: "/playground" },
  openGraph: {
    type: "article",
    url: "/playground",
    title: "Playground | Mnemo",
    description:
      "Search six facts by meaning, age the whole store, and settle the conflicts yourself. Everything runs in your browser.",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "Mnemo playground" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Playground | Mnemo",
    description:
      "Search six facts by meaning, age the whole store, and settle the conflicts yourself.",
    images: ["/og.png"],
  },
};

/**
 * The playground.
 *
 * One workbench, no chapters. The page exists to be touched: a field of memory
 * nodes around the query, a composer, a time slider and a conflict queue. The
 * only prose is the line under the title, because a playground should explain
 * itself by responding, not by describing itself first.
 */
export default function PlaygroundPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <a
        href="#workbench"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-[13px] focus:text-white"
      >
        Skip to the workbench
      </a>

      <SiteNav />

      <main className="relative w-full flex-1">
        <section className="relative isolate overflow-hidden border-b border-hairline">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grain opacity-70"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-36 h-[340px] w-[340px] rounded-full bg-accent/[0.07] blur-[100px]"
          />

          <div className="relative z-10 mx-auto max-w-frame px-6 pb-7 pt-[116px] sm:pt-[130px]">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-ink">
              Playground
            </span>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <h1 className="text-balance text-[34px] font-medium leading-[1.04] tracking-[-0.035em] text-ink sm:text-[42px]">
                Take{" "}
                <span
                  className="italic font-normal tracking-normal text-[110%]"
                  style={{ fontFamily: "var(--font-redaction), serif" }}
                >
                  memory
                </span>{" "}
                for a spin.
              </h1>

              <p className="max-w-[430px] text-balance text-[13.5px] leading-[1.7] text-muted lg:text-right">
                Six facts, one formula, no network. Search them, age them,
                contradict them, and settle the conflict yourself.
              </p>
            </div>
          </div>
        </section>

        <MemoryWorkbench />
      </main>

      <SiteFooter />
    </div>
  );
}
