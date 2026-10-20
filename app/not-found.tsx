import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "../components/site-nav";
import { SiteFooter } from "../components/site-footer";
import { DOCS_URL, PLAYGROUND_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Page not found | Mnemo",
  description: "That address doesn't resolve to anything Mnemo stores.",
};

/**
 * Custom not-found page.
 *
 * Besides giving a mistyped URL somewhere to land, this replaces Next's
 * built-in `HTTPAccessErrorFallback`. That fallback injects a `<style>` node
 * with `dangerouslySetInnerHTML`, and dark-mode browser extensions (Dark
 * Reader and friends) stamp a class onto every `<style>` they find *before*
 * React hydrates. The extra attribute then trips a hydration mismatch that we
 * cannot suppress, because the node belongs to Next rather than to this app.
 * Rendering our own page removes that node from the tree entirely.
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <SiteNav />

      <main id="main" className="relative z-10 flex w-full flex-1 items-center">
        <section className="relative w-full overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grain opacity-60"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-48 left-1/2 h-[460px] w-[900px] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl"
          />

          <div className="relative mx-auto max-w-frame px-6 pb-24 pt-[128px] sm:pt-[140px]">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-ink">
              404
            </span>

            <h1 className="mt-5 max-w-[620px] text-[38px] font-medium leading-[1.03] tracking-[-0.035em] text-ink sm:text-[46px] lg:text-[52px]">
              This page isn&rsquo;t in{" "}
              <span
                className="italic font-normal tracking-normal text-[110%]"
                style={{ fontFamily: "var(--font-redaction), serif" }}
              >
                memory
              </span>
              .
            </h1>

            <p className="mt-5 max-w-[520px] text-[15px] leading-[1.7] text-muted">
              The address doesn&rsquo;t resolve to anything Mnemo stores. Nothing
              was lost. The console and the documentation are both still a
              click away.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={PLAYGROUND_URL}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#18181B] px-5 py-2.5 text-[14px] font-medium text-[#FAFAFA] shadow-[0_4px_14px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-white/10 transition-all hover:-translate-y-[1px] hover:bg-[#27272A] hover:shadow-md"
              >
                Open the playground
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </a>
              <a
                href={DOCS_URL}
                className="inline-flex items-center gap-2 rounded-[8px] border border-line bg-white px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md"
              >
                Read the docs
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
