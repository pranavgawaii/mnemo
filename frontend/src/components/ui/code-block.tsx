"use client";

import { useMemo } from "react";
import { Check, Copy } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import { CopyFeedback } from "./copy-feedback";
import {
  codeLanguage,
  highlightCode,
  type CodeLanguage,
} from "@/lib/highlight";

export function CodeBlock({
  code,
  label = "Terminal",
  reserveCode = [],
  language,
}: {
  code: string;
  label?: string;
  reserveCode?: readonly string[];
  language?: CodeLanguage;
}) {
  const { copy, copied, message } = useClipboard(code);
  const syntax = language ?? codeLanguage(code);
  const highlighted = useMemo(
    () => highlightCode(code, syntax),
    [code, syntax],
  );
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5 text-[12px] text-muted">
        <span className="min-w-0 break-words">{label}</span>
        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy ${label}`}
            className="inline-flex min-h-9 w-[76px] shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-ink transition-colors hover:bg-background"
          >
            {copied ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            )}{" "}
            Copy
          </button>
          <CopyFeedback message={message} />
        </div>
      </div>
      <div className="grid min-w-0">
        {reserveCode.map((variant, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="invisible col-start-1 row-start-1 min-w-0 select-none overflow-hidden whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-[1.85] sm:whitespace-pre sm:break-normal sm:p-5 sm:text-[12.5px]"
          >
            {variant}
          </div>
        ))}
        <pre className="col-start-1 row-start-1 min-w-0 overflow-x-auto whitespace-pre-wrap break-words p-4 font-mono sm:whitespace-pre sm:break-normal text-[12px] sm:text-[12.5px] leading-[1.85] text-ink sm:p-5">
          <code
            translate="no"
            className={`code-highlight language-${syntax}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
}
