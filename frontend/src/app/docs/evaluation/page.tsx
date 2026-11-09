import { DocsHeading } from "@/components/docs/docs-heading";
import { DocsSection } from "@/components/docs/docs-section";
import { EvaluationEvidence } from "@/components/docs/evaluation-evidence";
import { Evaluation } from "@/components/docs/evaluation";
import { CodeBlock } from "@/components/ui/code-block";
import { docsMetadata } from "@/lib/docs";
import { GITHUB_URL } from "@/lib/site";

export const metadata = docsMetadata("/docs/evaluation");
export default function EvaluationPage() {
  return (
    <>
      <DocsHeading title="The results, including the trade-offs.">
        A ranking policy needs evidence. This local comparison measures
        retrieval on a small, hand-labelled dataset and reports where the
        simpler baseline wins.
      </DocsHeading>
      <Evaluation />
      <EvaluationEvidence />
      <DocsSection
        id="reproduce"
        title="Reproduce the comparison"
        intro="Use a development database with migrations applied. This command resets the dedicated benchmark namespace, runs all three modes and writes the public snapshot."
      >
        <CodeBlock
          label="Run the benchmark"
          code={"cd backend\nPYTHONPATH=. python benchmark/report.py"}
        />
        <p>
          The snapshot records the dataset hash, model, environment, settings
          and measurement time. Results can differ across environments. Inspect
          the{" "}
          <a
            href={`${GITHUB_URL}/tree/main/backend/benchmark`}
            className="text-accent-ink underline underline-offset-4"
          >
            dataset and runner
          </a>{" "}
          before drawing conclusions.
        </p>
        <p>The following commands create temporary synthetic namespaces. Use a disposable local database/API and a read/write key in <code>MNEMO_API_KEY</code>. Lifecycle and conflict runners archive their own rows; retained history is not physically purged.</p>
        <CodeBlock label="Run the additional evaluations" code={"# In the backend Python environment:\npip install -e ../sdk\nPYTHONPATH=. python -m benchmark.holdout --output /tmp/holdout.json\npython -m evaluation.lifecycle --output /tmp/lifecycle.json\npython -m evaluation.conflicts --output /tmp/conflicts.json"} />
        <p>The conflict runner retains false positives and misses. Request or cleanup errors make the run incomplete and return a failing exit code; a completed measurement is not a claim of perfect accuracy. Evaluate your own prepared facts with the read-only <code>python -m evaluation.run</code> command described in the <a href={`${GITHUB_URL}/blob/main/docs/agent-context.md#evaluate-selection-on-your-own-labels`} className="text-accent-ink underline underline-offset-4">labelled context guide</a>.</p>
      </DocsSection>
      <DocsSection id="next-experiments" title="What remains to be measured">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Held-out users and later sessions, with development data kept
            separate from test data.
          </li>
          <li>
            Conflict precision and recall, including numeric updates and
            agreeing negatives.
          </li>
          <li>
            The same agent with and without memory: grounded answers, stale
            answers and abstention.
          </li>
          <li>
            Retrieval quality versus latency across embedding models, keyword
            weights and optional rerankers.
          </li>
          <li>
            Load tests with larger corpora, recorded hardware, concurrency and
            failure rates.
          </li>
        </ul>
        <p>
          None of these are established by the current snapshot. The project
          uses a pretrained embedding model; it does not claim a newly trained
          model or production-scale results.
        </p>
      </DocsSection>
    </>
  );
}
