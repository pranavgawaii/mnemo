import { DocsHeading } from "@/components/docs/docs-heading";
import { ApiExplorer } from "@/components/docs/api-explorer";
import { AuthSection, DataModelSection } from "@/components/docs/documentation";
import { docsMetadata } from "@/lib/docs";

export const metadata = docsMetadata("/docs/api");
export default function ApiReferencePage() {
  return (
    <>
      <DocsHeading title="A small, explicit API.">
        Explore operations by resource. Parameters and response fields come from
        the API schema; the notes explain behavior that a schema alone cannot
        capture.
      </DocsHeading>
      <ApiExplorer />
      <AuthSection />
      <DataModelSection />
    </>
  );
}
