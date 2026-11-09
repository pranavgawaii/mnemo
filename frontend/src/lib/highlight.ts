import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("python", python);

export type CodeLanguage = "bash" | "json" | "python";

export function codeLanguage(code: string): CodeLanguage {
  if (/^\s*[\[{]/.test(code)) return "json";
  if (
    /^(?:from \S+ import |import \w|(?:async )?def |with \w|class \w)/m.test(
      code,
    )
  )
    return "python";
  return "bash";
}

export function highlightCode(code: string, language: CodeLanguage) {
  // highlight.js escapes source text before adding its own token spans.
  return hljs.highlight(code, { language, ignoreIllegals: true }).value;
}
