import type { MetadataRoute } from "next";
import { SITE_TAGLINE } from "../lib/site";

/**
 * Web app manifest. Without one, an installed shortcut to the site picks up the
 * page title and a screenshot for an icon; with one it gets the name, the brand
 * colours and the mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mnemo",
    short_name: "Mnemo",
    description: SITE_TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: "#F7F7F5",
    theme_color: "#F7F7F5",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
