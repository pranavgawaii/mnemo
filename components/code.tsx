import type { ReactNode } from "react";

export function Code({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[12px] bg-black/[0.04] px-1.5 py-0.5 rounded text-ink">
      {children}
    </span>
  );
}
