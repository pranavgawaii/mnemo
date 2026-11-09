import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { STORE_MEMORY } from "@/lib/api/examples";
import { GITHUB_URL } from "@/lib/site";

export function GetStarted() {
  return (
    <section
      id="get-started"
      className="scroll-mt-20 pb-10 pt-16 md:pb-14 md:pt-24"
    >
      <div className="mx-auto grid max-w-frame items-start gap-10 px-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <div>
          <h2 className="text-balance text-[32px] font-medium leading-[1.15] tracking-[-0.03em] text-ink md:text-[40px]">
            Start with one fact.
          </h2>
          <p className="mt-5 max-w-[370px] text-[14px] leading-[1.8] text-muted">
            Run Mnemo locally, then send this request. The guide takes you from
            your first fact to passing context into your agent.
          </p>
          <a
            href="/docs#quickstart"
            className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#27272A]"
          >
            Run Mnemo locally{" "}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-fit text-[12px] text-muted underline decoration-line underline-offset-4 hover:text-ink"
          >
            Inspect the source on GitHub
          </a>
        </div>
        <CodeBlock label="Store your first fact" code={STORE_MEMORY} />
      </div>
    </section>
  );
}
