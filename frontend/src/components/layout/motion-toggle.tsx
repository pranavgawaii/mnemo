"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";

const eventName = "mnemo:motion-preference";
const storageKey = "mnemo:motion-paused";
const subscribe = (update: () => void) => {
  window.addEventListener(eventName, update);
  return () => window.removeEventListener(eventName, update);
};
const getSnapshot = () => document.documentElement.dataset.motionPaused === "true";
const getServerSnapshot = () => false;

/** Keep decorative motion optional, including for people without an OS preference. */
export function MotionToggle({ showText = false }: { showText?: boolean }) {
  const paused = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "true") {
        document.documentElement.dataset.motionPaused = "true";
        window.dispatchEvent(new Event(eventName));
      }
    } catch {
      // The control still works when browser storage is unavailable.
    }
  }, []);
  const label = paused ? "Resume animations" : "Pause animations";
  const Icon = paused ? Play : Pause;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = !paused;
        document.documentElement.dataset.motionPaused = String(next);
        try { sessionStorage.setItem(storageKey, String(next)); } catch { /* Optional persistence. */ }
        window.dispatchEvent(new Event(eventName));
      }}
      className={`inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md text-muted transition-colors hover:text-accent-ink ${showText ? "w-fit text-[13px]" : ""}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {showText && label}
    </button>
  );
}
