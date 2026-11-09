import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { DOC_PAGES } from "@/lib/docs";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", ...DOC_PAGES.map((page) => page.href), "/playground"].map(
    (path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "weekly",
      priority: path === "/" ? 1 : path === "/docs" ? 0.8 : 0.6,
    }),
  );
}
