import { DocsSection } from "./docs-section";
import { CodeBlock } from "@/components/ui/code-block";
import { AGENT_HANDOFF, AGENT_INTEGRATION } from "@/lib/api/examples";

export function AgentIntegration() {
  return (
    <DocsSection
      id="agent-integration"
      title="4. Connect your agent"
      intro="Retrieve context before generating an answer. Mnemo handles memory; the model you already use handles the reply."
    >
      <ol className="grid gap-4 sm:grid-cols-3">
        {[
          [
            "Save confirmed facts",
            "Use add_memory after the user confirms a fact. Do not store every generated answer as truth.",
          ],
          [
            "Retrieve for the question",
            "Search the same namespace. Handle empty results and open conflicts before calling your model.",
          ],
          [
            "Generate with context",
            "Pass retrieved text as data to your model. Keep its system instructions separate from memory content.",
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
      <details className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <summary className="cursor-pointer text-[13px] font-medium text-ink">
          Python adapter · retrieve, review, generate
        </summary>
        <div className="mt-4 space-y-4">
          <p>
            Install the SDK from the Python quickstart above. Copy this function
            into your server-side agent code. It accepts a generation function,
            so it does not require a particular model SDK.
          </p>
          <CodeBlock label="Agent memory adapter" code={AGENT_INTEGRATION} />
          <p>
            Supply your existing model function as <code>your_model_call</code>.
            It receives a prompt string and returns the generated answer. That
            function belongs to your application; it is not a Mnemo SDK method.
          </p>
          <CodeBlock label="Connect your model" code={AGENT_HANDOFF} />
        </div>
      </details>
      <p>
        This example pauses generation if any conflict is open in the client’s
        namespace. That is an application policy, not a search API restriction.
        An empty result skips generation; unrelated hits ask the model to say it
        lacks evidence. This prompt does not guarantee grounded answers—evaluate
        your model’s responses on your own questions.
      </p>
      <p>
        Keep the API key on your server. Reuse the same namespace across
        sessions; namespaces filter facts and do not provide per-user access
        isolation. For explicit winner selection, see the{" "}
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
