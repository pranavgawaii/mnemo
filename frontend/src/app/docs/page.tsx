import { QuickstartRequests } from "@/components/docs/quickstart-requests";
import { AgentIntegration } from "@/components/docs/agent-integration";
import { DocsHeading } from "@/components/docs/docs-heading";
import { DocsSection } from "@/components/docs/docs-section";
import { CodeBlock } from "@/components/ui/code-block";
import { INSTALL_SDK, LOCAL_SETUP, START_SERVICE } from "@/lib/api/examples";
import { docsMetadata } from "@/lib/docs";

export const metadata = docsMetadata("/docs");

export default function GetStartedPage() {
  return (
    <>
      <DocsHeading title="Your first memory.">
        Run Mnemo locally, send it a fact, then retrieve that fact through the
        API. Your application supplies the memories; Mnemo stores and searches
        them.
      </DocsHeading>
      <DocsSection
        id="quickstart"
        title="1. Run the service"
        intro="You need Git, Docker and Docker Compose. The API and PostgreSQL start together; database migrations run on boot."
      >
        <CodeBlock label="Start Mnemo" code={START_SERVICE} />
        <p>
          In another terminal, check{" "}
          <code className="text-ink">curl http://localhost:8000/health</code>.
          The response is <code className="text-ink">{`{"status":"ok"}`}</code>.
          Docker loads and validates the local embedding model before serving
          requests. The first image build downloads the model files.
        </p>
        <details className="rounded-xl border border-line bg-white px-5 py-4">
          <summary className="cursor-pointer text-[13px] font-medium text-ink">
            Using an existing PostgreSQL database instead?
          </summary>
          <div className="mt-4 space-y-4">
            <p>
              Use PostgreSQL with the pgvector extension installed. From the
              cloned repository, create a Python environment and configure the
              database connection:
            </p>
            <CodeBlock label="Local Python setup" code={LOCAL_SETUP} />
          </div>
        </details>
      </DocsSection>
      <details
        id="python-sdk-setup"
        className="mt-8 scroll-mt-24 rounded-xl border border-line bg-white p-4 sm:p-5"
      >
        <summary className="cursor-pointer text-[13px] font-medium text-ink">
          Python SDK setup · optional for cURL users
        </summary>
        <div className="mt-4">
          <CodeBlock label="Install the Python SDK" code={INSTALL_SDK} />
        </div>
      </details>
      <QuickstartRequests />
      <AgentIntegration />
      <DocsSection id="live-api-setup" title="Optional live API demo">
        <p>
          Browser demo works immediately without a backend. To use real writes,
          embeddings and database reads, run both the API and website on your
          computer. No new hosting is needed; the public website cannot reach
          your laptop’s localhost.
        </p>
        <CodeBlock
          label="Live demo configuration"
          code={`# frontend/.env.local — server-only, never NEXT_PUBLIC_\nMNEMO_DEMO_API_URL=http://127.0.0.1:8000\nMNEMO_DEMO_API_KEY=your-api-key`}
        />
        <p>
          First start the API using the quickstart. Set its key above, then run
          the frontend commands below. If it is already running, restart it to
          load the new environment. Open the local playground and choose Live
          API; its availability badge checks the connection and key permissions.
        </p>
        <CodeBlock label="Start the local website" code={"# From the repository root, in a second terminal:\ncd frontend\npnpm install --frozen-lockfile\npnpm dev\n# Open http://localhost:3005/playground"} />
        <p>
          The key stays on the Next.js server. This walkthrough returns context;
          it does not call a generation model. For automatic key setup, see the{" "}
          <a href="https://github.com/pranavgawaii/mnemo/blob/main/docs/deployment.md#connect-the-live-api-walkthrough" className="text-accent-ink underline underline-offset-4">local deployment guide</a>.
        </p>
        <p>
          Each run creates a separate namespace with synthetic facts that expire
          after 15 minutes. Rows can remain in history. The server permits only
          the fixed walkthrough, keeps the key private and signs the run’s
          record IDs. For a public deployment, use a dedicated read/write key
          with backend rate limiting enabled.
        </p>
        <a
          href="/playground"
          className="text-accent-ink underline underline-offset-4"
        >
          Open the playground
        </a>
      </DocsSection>
      <DocsSection id="troubleshooting" title="If something goes wrong">
        <div className="divide-y divide-line rounded-xl border border-line bg-white px-5">
          {[
            [
              "401: check your API key",
              "Send X-API-Key with MNEMO_API_KEY or an active issued key. The bootstrap development key is dev-local-key-change-me. Missing permissions return 403.",
            ],
            [
              "Database or vector extension unavailable",
              "Wait for Docker's database health check. For local Python, verify DATABASE_URL, install pgvector and run alembic upgrade head.",
            ],
            [
              "Model loading takes time",
              "Docker warms the encoder during startup. Direct Python starts load it on first use unless EMBEDDING_WARMUP=true. Check API logs if startup or the first request is slow.",
            ],
          ].map(([title, body]) => (
            <details key={title} className="py-4">
              <summary className="cursor-pointer text-[13px] font-medium text-ink">
                {title}
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed">{body}</p>
            </details>
          ))}
        </div>
        <p>
          For response fields and per-operation scopes, open the{" "}
          <a
            href="/docs/api"
            className="text-accent-ink underline underline-offset-4"
          >
            API reference
          </a>
          .
        </p>
      </DocsSection>
    </>
  );
}
