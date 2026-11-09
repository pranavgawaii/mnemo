import { Bot, MessagesSquare, Workflow } from "lucide-react";

/** Application patterns, rather than badges implying provider integrations. */
export function AgentUseCases() {
  return (
    <ul
      aria-label="Agent application patterns"
      className="mt-6 flex flex-wrap gap-x-4 gap-y-3 text-[11px] text-muted"
    >
      {[
        { icon: MessagesSquare, label: "Chat assistant" },
        { icon: Bot, label: "Tool-using agent" },
        { icon: Workflow, label: "Custom workflow" },
      ].map(({ icon: Symbol, label }) => {
        return (
          <li key={label} className="flex items-center gap-1.5">
            <Symbol aria-hidden="true" className="h-4 w-4 text-accent-ink" />
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
