import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

/**
 * Crawler rules. The marketing pages are meant to be indexed, so everything is
 * allowed; the only thing worth declaring beyond that is where the sitemap
 * lives and which host is canonical.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
