import { DocsHeading } from "@/components/docs/docs-heading";
import { ArchitectureExplorer } from "@/components/docs/architecture-explorer";
import { LifecycleExplorer } from "@/components/docs/lifecycle-explorer";
import {
  LimitationsSection,
  RetrievalSection,
} from "@/components/docs/documentation";
import { docsMetadata } from "@/lib/docs";

export const metadata = docsMetadata("/docs/concepts");
export default function ConceptsPage() {
  return (
    <>
      <DocsHeading title="A memory you can inspect.">
        One database stores facts, vectors and review records. Here is how
        retrieval works, what a conflict flag means, and where the system stops.
      </DocsHeading>
      <ArchitectureExplorer />
      <RetrievalSection />
      <LifecycleExplorer />
      <LimitationsSection />
    </>
  );
}
