import { DocsSection } from "./docs-section";
import { CodeBlock } from "@/components/ui/code-block";
import { AGENT_HANDOFF, AGENT_INTEGRATION } from "@/lib/api/examples";

export function AgentIntegration() {
  return (
    <DocsSection
      id="agent-integration"
      title="4. Connect your agent"
      intro="Search before each answer. Your app supplies confirmed facts and calls its model; Mnemo returns the context."
    >
      <ol className="grid gap-4 sm:grid-cols-3">
        {[
          [
            "Save confirmed facts",
            "Call add_memory when the user confirms a fact, rather than saving every model reply.",
          ],
          [
            "Retrieve for the question",
            "Search the same namespace across sessions. Decide how your app handles conflicts and empty results.",
          ],
          [
            "Generate with context",
            "Give your model the retrieved facts as data, separate from its system instructions.",
          ],
        ].map(([title, body], index) => (
          <li key={title} className="border-t border-line pt-3">
            <h3 className="text-[13px] font-medium text-ink">
              <span className="mr-2 text-accent-ink">{index + 1}</span>
              {title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {body}
            </p>
          </li>
        ))}
      </ol>
      <p>
        Copy <code>answer_with_memory</code> from the adapter below, then
        connect it to your server-side agent. <code>your_model_call</code> is
        your own function that accepts a prompt and returns an answer.
      </p>
      <CodeBlock label="Connect your model" code={AGENT_HANDOFF} />
      <details className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <summary className="cursor-pointer text-[13px] font-medium text-ink">
          Python adapter · retrieve, review, generate
        </summary>
        <div className="mt-4 space-y-4">
          <p>
            Install the Python SDK from the quickstart above. This adapter uses
            your existing model function, with no provider-specific SDK
            required.
          </p>
          <CodeBlock label="Agent memory adapter" code={AGENT_INTEGRATION} />
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-muted">
            <li>
              Open conflict: pause generation and ask for review. This is the
              adapter’s conservative policy, not an API restriction.
            </li>
            <li>
              No hits: return a no-context message without calling the model.
            </li>
            <li>
              Hits returned: ask the model to use relevant evidence and abstain
              if it cannot answer. Evaluate this behavior with your own model.
            </li>
          </ul>
        </div>
      </details>
      <p>
        Keep the API key on your server. Namespaces filter facts; they do not
        isolate users’ access. The adapter pauses for any open conflict in its
        namespace. See the{" "}
        <a
          href="/docs/concepts#contradictions"
          className="text-accent-ink underline underline-offset-4"
        >
          conflict review guide
        </a>
        .
      </p>
    </DocsSection>
  );
}
