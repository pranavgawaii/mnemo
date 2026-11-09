"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { DocsSection } from "./docs-section";
import { CodeBlock } from "@/components/ui/code-block";
import {
  PYTHON_SEARCH,
  PYTHON_STORE,
  SEARCH_MEMORY,
  STORE_MEMORY,
} from "@/lib/api/examples";
import responses from "@/lib/api/example-responses.json";

export function QuickstartRequests() {
  const [language, setLanguage] = useState<"curl" | "python">("curl");
  return (
    <>
      <DocsSection
        id="first-memory"
        title="2. Store a fact"
        intro="Use cURL with no client installation, or the typed Python SDK. Both examples call the same local API with its development key."
      >
        <fieldset className="min-w-0">
          <legend className="mb-3 text-[12px] font-medium text-muted">
            Example language
          </legend>
          <div className="inline-flex rounded-lg border border-line bg-white p-1">
            {(
              [
                ["curl", "cURL"],
                ["python", "Python SDK"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`relative flex min-h-9 cursor-pointer items-center rounded-md px-4 text-[13px] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${language === value ? "bg-ink text-white" : "text-muted hover:bg-background"}`}
              >
                <input
                  type="radio"
                  name="example-language"
                  value={value}
                  checked={language === value}
                  onChange={() => setLanguage(value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <a
          href="#python-sdk-setup"
          className="w-fit text-[12px] text-accent-ink underline underline-offset-4"
        >
          Python SDK setup
        </a>
        <CodeBlock
          key={`store-${language}`}
          label="Store a memory"
          code={language === "curl" ? STORE_MEMORY : PYTHON_STORE}
          reserveCode={[STORE_MEMORY, PYTHON_STORE]}
        />
        <details className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <summary className="cursor-pointer text-[13px] font-medium text-ink">
            See a complete store response · 201
          </summary>
          <p className="my-4 text-[13px] leading-relaxed text-muted">
            Illustrative JSON that matches the API schema. IDs, timestamps and
            returned conflicts depend on the stored data.
          </p>
          <CodeBlock
            label="Example store response"
            code={JSON.stringify(responses.store, null, 2)}
          />
        </details>
        <p>
          The response includes <code>memory</code>, any new{" "}
          <code>contradictions</code>, and <code>deduplicated_of</code>. Default
          duplicate mode accepts and reports a similar memory; rejection mode
          returns 409.
        </p>
      </DocsSection>
      <DocsSection
        id="first-recall"
        title="3. Recall it"
        intro="Search the same namespace with a question. Your application uses the returned facts as context when generating an answer."
      >
        <CodeBlock
          key={`search-${language}`}
          label="Search memories"
          code={language === "curl" ? SEARCH_MEMORY : PYTHON_SEARCH}
          reserveCode={[SEARCH_MEMORY, PYTHON_SEARCH]}
        />
        <details className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <summary className="cursor-pointer text-[13px] font-medium text-ink">
            See a complete search response · 200
          </summary>
          <p className="my-4 text-[13px] leading-relaxed text-muted">
            Illustrative JSON. Each hit contains a memory and its scores; actual
            values depend on the model, query, corpus and ranking settings.
          </p>
          <CodeBlock
            label="Example search response"
            code={JSON.stringify(responses.search, null, 2)}
          />
        </details>
        <p>
          Read <code>hits</code> to inspect the returned memory, cosine
          similarity, relevance score and age. Mnemo returns context; your
          application decides how to use it.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            [
              "/playground",
              "Try the browser demo",
              "Store a change and review both sides.",
            ],
            [
              "#agent-integration",
              "Connect your agent",
              "Pass retrieved facts into your model.",
            ],
          ].map(([href, title, text]) => (
            <a
              key={href}
              href={href}
              className="group rounded-xl border border-line bg-white p-5 transition-colors hover:border-accent/35"
            >
              <span className="flex items-center justify-between gap-3 text-[14px] font-medium text-ink">
                {title}
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
                />
              </span>
              <span className="mt-2 block text-[13px] leading-relaxed text-muted">
                {text}
              </span>
            </a>
          ))}
        </div>
      </DocsSection>
    </>
  );
}
