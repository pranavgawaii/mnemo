import { DocsSection } from "./docs-section";
import { ANCHORS } from "@/lib/site";

export function RetrievalSection() {
  return (
    <DocsSection
      id="retrieval"
      title="Retrieval is a policy, not a promise"
      intro="Mnemo embeds a query, retrieves vector candidates and ranks the resulting pool. A higher cosine similarity can be outranked when other signals change."
    >
      <div className="rounded-xl border border-line bg-white p-5 sm:p-7">
        <p className="text-[12px] text-muted">Base scoring</p>
        <p className="mt-3 break-words text-[20px] font-medium leading-relaxed tracking-tight text-ink sm:text-[25px]">
          similarity × decay(age) × importance
        </p>
        <dl className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-3">
          <div>
            <dt className="text-[12px] font-medium text-ink">Similarity</dt>
            <dd className="mt-1 text-[13px]">
              Cosine similarity from local, L2-normalized 384-dimensional MiniLM
              embeddings.
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-ink">Decay</dt>
            <dd className="mt-1 text-[13px]">
              180-day half-life with a 0.7 floor. The floor is reached after
              about 93 days.
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-ink">Importance</dt>
            <dd className="mt-1 text-[13px]">
              Ratings 1–5 map to weights 0.90–1.10. A rating of 3 is neutral.
            </dd>
          </div>
        </dl>
      </div>
      <p>
        For example, an older memory with similarity 0.90 can score 0.63, while
        a fresh memory with similarity 0.80 scores 0.80 at neutral importance.
        The recency penalty is bounded; the winning semantic match is not
        guaranteed.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="border-t border-line pt-4">
          <h3 className="font-medium text-ink">
            The default search adds keyword evidence
          </h3>
          <p className="mt-2 text-[13px]">
            A keyword weight of 0.25 boosts the base score using normalized
            full-text rank. Set <code>keyword_weight=0</code> to disable it.
            Optional MMR selection trades relevance for diversity.
          </p>
        </div>
        <div className="border-t border-line pt-4">
          <h3 className="font-medium text-ink">
            Candidate selection limits recall
          </h3>
          <p className="mt-2 text-[13px]">
            Vector search over-fetches limit × 4. An HNSW index is configured;
            PostgreSQL chooses the query plan. Ranking cannot recover a fact
            absent from the candidate pool.
          </p>
        </div>
      </div>
      <p>
        Decay changes retrieval scores; it does not delete facts. Expiry is a
        separate, optional setting. Explore the{" "}
        <a
          href={ANCHORS.rankingCalculator}
          className="text-accent-ink underline underline-offset-4"
        >
          base-score calculator
        </a>{" "}
        or inspect the{" "}
        <a
          href={ANCHORS.evaluation}
          className="text-accent-ink underline underline-offset-4"
        >
          measured comparison
        </a>
        .
      </p>
    </DocsSection>
  );
}

export function AuthSection() {
  return (
    <DocsSection
      id="auth"
      title="Authentication & access"
      intro="Send X-API-Key on every v1 request. Missing or invalid keys return 401; insufficient scope returns 403."
    >
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-left text-[13px]">
          <caption className="sr-only">API operation scopes</caption>
          <thead className="bg-background">
            <tr>
              <th className="px-5 py-3 font-medium text-ink">Scope</th>
              <th className="px-5 py-3 font-medium text-ink">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr>
              <td className="px-5 py-3 font-mono text-[12px]">read</td>
              <td className="px-5 py-3">
                Memory reads, search and conflict listing.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 font-mono text-[12px]">write</td>
              <td className="px-5 py-3">
                Memory mutations and explicit conflict resolution.
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 font-mono text-[12px]">admin</td>
              <td className="px-5 py-3">
                All scopes, including namespace administration, keys, events and
                webhooks.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>MNEMO_API_KEY</code> is the bootstrap key with all scopes. Issued
        keys are hashed in the database; their plaintext is returned once.
        Optional rate limiting uses a fixed per-minute window and returns 429
        with Retry-After when exceeded.
      </p>
      <div className="rounded-xl border border-line bg-accent-soft/40 p-5 text-[13px] leading-relaxed">
        <strong className="font-medium text-ink">
          Single-tenant by design in this version.
        </strong>{" "}
        Namespaces are retrieval buckets. Keys are not tenant-bound, and
        namespaces are not a database security boundary. A key's permitted
        operations can apply across namespaces.
      </div>
    </DocsSection>
  );
}

const TABLES = [
  [
    "memories",
    "Facts, embeddings, importance, tags, metadata and optional expiry.",
  ],
  [
    "contradictions",
    "Flagged pairs, review status, winner and resolution time.",
  ],
  ["namespaces", "Optional per-namespace scoring overrides."],
  ["api_keys", "Key hashes, prefixes, scopes and per-key rate limits."],
  ["rate_limit_counters", "Per-key request counts for fixed time windows."],
  [
    "audit_log",
    "Memory, conflict and import events with request and actor context.",
  ],
  ["jobs", "Outbox payloads, attempts, schedule and worker leases."],
  ["webhooks", "Subscriptions and signing secrets."],
];
export function DataModelSection() {
  return (
    <DocsSection
      id="data-model"
      title="Data model"
      intro="Eight tables share one PostgreSQL database. This is a storage overview; response schemas are available in the OpenAPI download."
    >
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <dl className="divide-y divide-line">
          {TABLES.map(([name, purpose]) => (
            <div
              key={name}
              className="grid gap-1 px-5 py-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-5"
            >
              <dt className="break-all font-mono text-[12px] text-ink">
                {name}
              </dt>
              <dd className="text-[13px]">{purpose}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p>
        A memory's <code>is_active</code> flag controls soft deletion. Inactive
        rows remain fetchable by ID and appear in namespace exports. Content
        edits happen in place: retaining rows and audit events does not provide
        immutable versions of earlier text.
      </p>
      <p>
        Conflict records have their own <code>open</code> or{" "}
        <code>resolved</code> status. Webhook jobs commit with the event that
        created them; delivery is at least once, so receivers deduplicate stable
        event IDs.
      </p>
    </DocsSection>
  );
}

export function LimitationsSection() {
  return (
    <DocsSection id="limitations" title="Know the boundaries">
      <div className="divide-y divide-line border-y border-line">
        {[
          [
            "Conflict flags are heuristic",
            "The default detector checks five nearby active, non-expired facts. It handles a source-matched relocation and explicit from/to changes to favourite cuisine, learning goals and running routines. These narrow rules require the same subject and recorded previous value. Other pairs use the similarity gate and English negation markers. Uncertain plans and compatible additions are not automatic replacements; other changed names, dates and numbers can be missed. Precision and recall are not yet benchmarked.",
          ],
          [
            "Long text has a shorter embedding",
            "The full text is stored, but the default model truncates embedding input beyond 256 word pieces. This service does not automatically chunk long documents.",
          ],
          [
            "History is not immutable versioning",
            "Soft deletion preserves rows, while PATCH replaces existing content. Previous text values are not retained as separate versions.",
          ],
          [
            "Evaluation is a starting point",
            "The current in-sample benchmark contains 60 memories and 50 queries. It does not establish agent answer quality, tenant isolation or performance at scale.",
          ],
        ].map(([title, body]) => (
          <div key={title} className="py-5">
            <h3 className="font-medium text-ink">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
      <p>
        Read{" "}
        <a
          href={ANCHORS.auth}
          className="text-accent-ink underline underline-offset-4"
        >
          the access model
        </a>{" "}
        before sharing a deployment, and keep raw cosine as a baseline when
        evaluating ranking changes.
      </p>
    </DocsSection>
  );
}
