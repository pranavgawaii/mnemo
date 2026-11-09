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
          The first memory request loads the local embedding model and can take
          longer.
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
              "A long first request",
              "The embedding model loads lazily. Docker downloads its files during the image build, but loading them into memory still takes time.",
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
