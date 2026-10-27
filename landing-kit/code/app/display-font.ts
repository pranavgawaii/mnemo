import { Outfit } from "next/font/google";

/**
 * Outfit carries the structure: headings, body, nav, buttons.
 * Redaction 35 is wired separately with `next/font/local` in the root layout.
 */
export const displayFont = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});
