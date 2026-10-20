import type { MetadataRoute } from "next";
import { DOCS_URL, PLAYGROUND_URL, SITE_URL } from "../lib/site";

/**
 * XML sitemap. Three real routes: the landing page, the developer guide and the
 * playground. URLs are absolute, because a sitemap is read by crawlers with no
 * page context to resolve a relative path against.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}${DOCS_URL}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}${PLAYGROUND_URL}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
