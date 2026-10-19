import type { Metadata } from "next";
import { SiteNav } from "../../components/site-nav";
import { SiteFooter } from "../../components/site-footer";
import { MemoryConsole } from "../../components/memory-console";

export const metadata: Metadata = {
  title: "Playground | Mnemo",
  description:
    "An interactive console for Mnemo's memory: store a fact, search it by meaning, watch recall rank it, move the sliders behind the score, and resolve the conflicts the service flags. Runs entirely in your browser.",
};

const BADGES = [
  "Runs in your browser",
  "No API calls",
  "Similarity is illustrative",
];

const SPECS: { kicker: string; title: string; body: string; foot: string }[] = [
  {
    kicker: "Storage",
    title: "One table, one index",
    body: "Every memory and its 384-dimensional vector live in a single Postgres table with a pgvector index. There is no second store to keep in sync, and no managed vector database to pay for.",
    foot: "Postgres + pgvector · 384-d",
  },
  {
    kicker: "Ranking",
    title: "Relevance, not raw distance",
    body: "Candidates are scored by similarity × decay × importance, then sorted in Python. Freshness reorders comparable matches — it never overrides a clearly better one.",
    foot: "similarity × decay × importance",
  },
  {
    kicker: "Conflicts",
    title: "Flagged, never overwritten",
    body: "A cosine gate at 0.82 establishes that two memories are about the same thing; a negation-marker check then looks for a polarity flip on exactly one side. No LLM call is involved.",
    foot: "gate 0.82 · deterministic",
  },
  {
    kicker: "Resolution",
    title: "A human decides; nothing is erased",
    body: "Resolving names a winner. The loser becomes is_active = false, so it drops out of recall and listings while its row stays in the table. The audit trail survives.",
    foot: "POST /v1/contradictions/resolve",
  },
];

/**
 * A standalone playground, built on the same shell as the rest of the site —
 * `SiteNav`, the editorial light canvas, `SiteFooter` — but with its own
 * centrepiece: a memory console that stands in for the running service. Nothing
 * here touches the API; every number is computed from `lib/` on the client.
 */
export default function PlaygroundPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <a
        href="#console"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-[13px] focus:text-white"
      >
        Skip to the console
      </a>

      <SiteNav />

      <main id="main" className="relative z-10 w-full flex-1">
        {/* ------------------------------- masthead ------------------------------ */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grain opacity-60"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-48 left-1/2 h-[460px] w-[900px] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl"
          />
          <div className="relative mx-auto max-w-frame px-6 pb-14 pt-[128px] sm:pt-[140px]">
            <div className="flex flex-col gap-9 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[720px]">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-ink">
                  Playground
                </span>
                <h1 className="mt-5 text-[38px] font-medium leading-[1.03] tracking-[-0.035em] text-ink sm:text-[46px] lg:text-[52px]">
                  A memory service you can
                  <br className="hidden sm:block" />{" "}
                  <span
                    className="italic font-normal tracking-normal text-[110%]"
                    style={{ fontFamily: "var(--font-redaction), serif" }}
                  >
                    take apart
                  </span>
                  .
                </h1>
                <p className="mt-5 max-w-[560px] text-[15px] leading-[1.7] text-muted">
                  Store a fact, search it by meaning, move the sliders that decide
                  what ranks first, then try to contradict the store and resolve it.
                  Everything runs in your browser, against Mnemo&rsquo;s real
                  scoring maths.
                </p>
              </div>

              <div className="flex flex-col gap-4 lg:max-w-[300px] lg:items-end">
                <ul className="flex flex-wrap gap-2 lg:justify-end">
                  {BADGES.map((badge) => (
                    <li
                      key={badge}
                      className="rounded-full border border-line bg-white/80 px-3 py-1 font-mono text-[10.5px] text-muted"
                    >
                      {badge}
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] leading-[1.7] text-faint lg:text-right">
                  Six sample memories are seeded. The one approximation is
                  similarity: the live service embeds with all-MiniLM-L6-v2, into
                  Postgres + pgvector.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------- console ------------------------------- */}
        <section
          id="console"
          className="mx-auto max-w-frame scroll-mt-16 px-6 pb-20"
        >
          <MemoryConsole />
        </section>

        {/* ------------------------------- the real thing ------------------------- */}
        <section className="mx-auto max-w-frame px-6 pb-24">
          <div className="max-w-[640px]">
            <h2 className="text-[24px] font-medium tracking-[-0.025em] text-ink sm:text-[28px]">
              What the console is standing in for
            </h2>
            <p className="mt-3 text-[14.5px] leading-[1.75] text-muted">
              Four decisions shape every recall and every conflict. The console
              above runs the same logic; this is what runs in the service.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {SPECS.map((spec) => (
              <div
                key={spec.kicker}
                className="flex flex-col rounded-xl border border-line bg-white p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-accent-ink">
                  {spec.kicker}
                </span>
                <h3 className="mt-3 text-[16px] font-medium leading-snug tracking-[-0.01em] text-ink">
                  {spec.title}
                </h3>
                <p className="mt-2.5 text-[13px] leading-[1.7] text-muted">
                  {spec.body}
                </p>
                <p className="mt-auto border-t border-hairline pt-3.5 font-mono text-[10.5px] text-faint">
                  {spec.foot}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
