"use client";

import { Maximize2 } from "lucide-react";
import { ExpandedView } from "@/components/ui/expanded-view";
import { CodeBlock } from "@/components/ui/code-block";
import { SEARCH_MEMORY, STORE_MEMORY } from "@/lib/api/examples";
import examples from "@/lib/api/example-responses.json";
import { useState } from "react";
import { DocsSection } from "./docs-section";
import { useTabList } from "@/hooks/use-tabs";
import {
  API_RESOURCES,
  ENDPOINTS,
  type Field,
  type Resource,
} from "@/lib/api/endpoints";

function FieldList({ title, fields }: { title: string; fields: Field[] }) {
  return (
    <div>
      <h4 className="text-[12px] font-medium text-ink">{title}</h4>
      {fields.length ? (
        <dl className="mt-3 divide-y divide-hairline">
          {fields.map((field) => (
            <div
              key={`${field.location}-${field.name}`}
              className="py-3 first:pt-0"
            >
              <dt className="flex flex-wrap items-center gap-2">
                <code className="text-[12px] text-ink">{field.name}</code>
                <span className="break-all text-[11px] text-muted">
                  {field.type}
                </span>
                {field.location !== "response" && (
                  <span className="text-[11px] text-muted">
                    {field.location}
                    {field.required ? " · required" : ""}
                  </span>
                )}
              </dt>
              <dd className="mt-1 text-[13px] leading-[1.7] text-muted">
                {field.note}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-[12px] text-muted">No fields.</p>
      )}
    </div>
  );
}

export function ApiExplorer() {
  const [group, setGroup] = useState<Resource>("memories");
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const endpoints = ENDPOINTS.filter((endpoint) => endpoint.resource === group);
  const endpoint = endpoints[active] ?? endpoints[0];
  const example =
    endpoint.method === "POST" && endpoint.path === "/v1/memories"
      ? { request: STORE_MEMORY, response: examples.store }
      : endpoint.method === "POST" && endpoint.path === "/v1/memories/search"
        ? { request: SEARCH_MEMORY, response: examples.search }
        : null;
  const groupIndex = API_RESOURCES.findIndex(
    (resource) => resource.key === group,
  );
  function selectGroup(index: number) {
    setGroup(API_RESOURCES[index].key);
    setActive(0);
  }
  const groups = useTabList({
    count: API_RESOURCES.length,
    active: groupIndex,
    onChange: selectGroup,
  });
  const tabs = useTabList({
    count: endpoints.length,
    active,
    onChange: setActive,
  });
  const operationDetails = (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed">{endpoint.description}</p>
      {example && (
        <details className="rounded-lg border border-line p-4">
          <summary className="cursor-pointer text-[13px] font-medium text-ink">
            Request and response example
          </summary>
          <div className="mt-4 space-y-4">
            <CodeBlock label="cURL request" code={example.request} />
            <p className="text-[12px] text-muted">
              Illustrative response. Actual IDs, dates and scores vary.
            </p>
            <CodeBlock
              label="JSON response"
              code={JSON.stringify(example.response, null, 2)}
            />
          </div>
        </details>
      )}
      <FieldList title="Request" fields={endpoint.sends} />
      <div className="border-t border-line pt-5">
        <FieldList title="Response fields" fields={endpoint.gets} />
      </div>
      {endpoint.notes && (
        <p className="rounded-lg bg-accent-soft/60 p-4 text-[12px] leading-relaxed text-accent-ink">
          {endpoint.notes}
        </p>
      )}
    </div>
  );
  return (
    <DocsSection
      id="api"
      title="Explore an operation"
      intro={`${ENDPOINTS.length} operations: 24 authenticated v1 operations and three public operational endpoints. Choose a resource, then an operation.`}
    >
      <div
        role="tablist"
        aria-label="API resources"
        onKeyDown={groups.onKeyDown}
        className="flex flex-wrap gap-2"
      >
        {API_RESOURCES.map((resource, index) => (
          <button
            key={resource.key}
            ref={groups.register(index)}
            type="button"
            role="tab"
            id={`resource-${resource.key}`}
            aria-selected={group === resource.key}
            aria-controls="resource-panel"
            tabIndex={group === resource.key ? 0 : -1}
            onClick={() => selectGroup(index)}
            className={`rounded-lg border px-3 py-2 text-[12px] transition-colors ${group === resource.key ? "border-accent/25 bg-accent-soft text-accent-ink" : "border-line bg-white text-muted hover:text-ink"}`}
          >
            {resource.label}
          </button>
        ))}
      </div>
      <div
        id="resource-panel"
        role="tabpanel"
        aria-labelledby={`resource-${group}`}
        className="grid min-w-0 gap-5 lg:grid-cols-[245px_minmax(0,1fr)]"
      >
        <div className="lg:hidden">
          <label
            htmlFor="api-operation"
            className="mb-2 block text-[12px] font-medium text-muted"
          >
            Operation
          </label>
          <select
            id="api-operation"
            name="operation"
            value={active}
            onChange={(event) => setActive(Number(event.target.value))}
            className="min-h-11 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-[12px] text-ink"
          >
            {endpoints.map((operation, index) => (
              <option key={operation.method + operation.path} value={index}>
                {operation.method} {operation.path}
              </option>
            ))}
          </select>
        </div>
        <div
          role="tablist"
          aria-label="Endpoints"
          aria-orientation="vertical"
          onKeyDown={tabs.onKeyDown}
          className="hidden min-w-0 flex-col gap-1.5 lg:flex"
        >
          {endpoints.map((operation, index) => (
            <button
              key={operation.method + operation.path}
              ref={tabs.register(index)}
              type="button"
              role="tab"
              id={`api-tab-${index}`}
              tabIndex={active === index ? 0 : -1}
              aria-selected={active === index}
              aria-controls="api-panel"
              onClick={() => setActive(index)}
              className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors ${active === index ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-faint/40"}`}
            >
              <span className="w-11 shrink-0 font-mono text-[10px]">
                {operation.method}
              </span>
              <span className="min-w-0 break-all font-mono text-[11px]">
                {operation.path}
              </span>
            </button>
          ))}
        </div>
        <div
          key={`${group}-${active}`}
          id="api-panel"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`api-tab-${active}`}
          data-lenis-prevent
          className="h-[640px] min-w-0 scroll-stable overflow-y-auto rounded-xl border border-line bg-white"
        >
          <div className="sticky top-0 z-10 border-b border-line bg-background p-5">
            <p className="break-all font-mono text-[12px] font-medium text-ink">
              {endpoint.method} {endpoint.path}
            </p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h3 className="text-[17px] font-medium text-ink">
                {endpoint.summary}
              </h3>
              <button
                type="button"
                aria-label="Expand operation"
                aria-haspopup="dialog"
                onClick={() => setExpanded(true)}
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[12px] text-muted hover:text-accent-ink"
              >
                <Maximize2 aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">Expand</span>
              </button>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              {endpoint.scope === "public"
                ? "No authentication"
                : `${endpoint.scope} scope`}{" "}
              · {endpoint.status} · {endpoint.mediaType}
            </p>
          </div>
          <div className="p-5">{operationDetails}</div>
        </div>
      </div>
      <ExpandedView
        open={expanded}
        onClose={() => setExpanded(false)}
        title={endpoint.summary}
        description={`${endpoint.method} ${endpoint.path} · ${endpoint.scope} scope · ${endpoint.status}`}
      >
        <div className="mx-auto max-w-3xl">{operationDetails}</div>
      </ExpandedView>
      <p className="text-[12px]">
        Nested models and complete constraints are available in the{" "}
        <a
          href="/openapi.json"
          className="text-accent-ink underline underline-offset-4"
        >
          downloadable OpenAPI schema
        </a>
        . Your locally running API also serves its schema and interactive
        reference at port 8000.
      </p>
    </DocsSection>
  );
}
