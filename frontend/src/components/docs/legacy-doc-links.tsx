"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ANCHORS } from "@/lib/site";

const DESTINATIONS: Record<string, string> = {
  architecture: ANCHORS.architecture,
  retrieval: ANCHORS.retrieval,
  contradictions: ANCHORS.contradictions,
  "data-model": ANCHORS.dataModel,
  api: ANCHORS.api,
  auth: ANCHORS.auth,
  evaluation: ANCHORS.evaluation,
  limitations: ANCHORS.limitations,
  playground: "/playground",
  "ranking-calculator": ANCHORS.rankingCalculator,
  "contradiction-checker": ANCHORS.contradictionChecker,
};

/** Preserve bookmarks from the former single-page guide. */
export function LegacyDocLinks() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname !== "/docs") return;
    const redirect = () => {
      const destination = DESTINATIONS[window.location.hash.slice(1)];
      if (destination) router.replace(destination);
    };
    redirect();
    window.addEventListener("hashchange", redirect);
    return () => window.removeEventListener("hashchange", redirect);
  }, [pathname, router]);
  return null;
}
