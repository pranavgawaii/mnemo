"use client";

import { useEffect, useRef, useState } from "react";

/** Shared feedback for code and recalled context; rejected writes remain retryable. */
export function useClipboard(value: string) {
  const [feedback, setFeedback] = useState<{ value: string; ok: boolean; message: string } | null>(null);
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastMessage = useRef("");

  useEffect(() => {
    request.current++;
    setFeedback(null);
    return () => {
      request.current++;
      clearTimeout(timer.current);
    };
  }, [value]);

  async function copy() {
    const current = ++request.current;
    clearTimeout(timer.current);
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // Permission denial and insecure contexts use the same visible fallback.
    }
    if (current !== request.current) return;
    let message = ok ? "Copied" : "Copy failed. Select the text to copy it.";
    // VoiceOver can suppress a repeated message even after the region is cleared.
    if (message === lastMessage.current) message += "\u00a0";
    lastMessage.current = message;
    setFeedback({ value, ok, message });
    timer.current = setTimeout(() => setFeedback(null), 3000);
  }

  const current = feedback?.value === value ? feedback : null;
  return { copy, copied: current?.ok === true, message: current?.message ?? "" };
}
