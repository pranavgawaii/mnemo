"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoAvailability } from "@/lib/api/live-demo";

export function useDemoAvailability() {
  const [availability, setAvailability] = useState<DemoAvailability | null>(null);
  const [checking, setChecking] = useState(true);
  const pending = useRef<AbortController | null>(null);
  const check = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setChecking(true);
    try {
      const response = await fetch("/api/demo", {
        cache: "no-store",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8_000)]),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!["available", "unavailable", "unconfigured"].includes(data.status)) throw new Error();
      if (!controller.signal.aborted) setAvailability(data);
    } catch {
      if (!controller.signal.aborted) setAvailability({
        enabled: true, status: "unavailable", reason: "unreachable", checkedAt: new Date().toISOString(),
      });
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }, []);
  useEffect(() => {
    void check();
    window.addEventListener("focus", check);
    return () => {
      pending.current?.abort();
      window.removeEventListener("focus", check);
    };
  }, [check]);
  return { availability, setAvailability, checking, check };
}
