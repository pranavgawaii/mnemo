import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { displayFont } from "./display-font";
import { ScrollManager } from "../components/scroll-manager";
import { SITE_TAGLINE, SITE_URL } from "../lib/site";
// @ts-ignore
import "./globals.css";

const redaction = localFont({
  src: [
    {
      path: "../public/fonts/Redaction35-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Redaction35-Italic.otf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-redaction",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Mnemo | Persistent memory API for AI agents",
  description:
    "Mnemo gives AI agents persistent recall: pgvector semantic search, time-decay ranking, and deterministic contradiction detection with a soft-delete audit trail.",
  applicationName: "Mnemo",
  category: "technology",
  keywords: [
    "AI agent memory",
    "pgvector",
    "semantic search",
    "vector database alternative",
    "FastAPI",
    "PostgreSQL",
    "retrieval ranking",
    "contradiction detection",
  ],
  authors: [{ name: "Pranav Gawai", url: "https://pranavx.in" }],
  creator: "Pranav Gawai",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Mnemo",
    locale: "en_US",
    title: "Mnemo | Persistent memory API for AI agents",
    description: `${SITE_TAGLINE}. Semantic recall, time-decay ranking, and deterministic contradiction detection, built with FastAPI, PostgreSQL and pgvector.`,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Mnemo: persistent memory for AI agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mnemo | Persistent memory API for AI agents",
    description: `${SITE_TAGLINE}. Semantic recall, time-decay ranking, and deterministic contradiction detection.`,
    images: ["/og.png"],
  },
};

/** The canvas is light-only; declaring it stops mobile browsers inventing
 *  a dark form-controls theme over the warm grey. */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#F7F7F5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${displayFont.className} ${displayFont.variable} ${redaction.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased bg-background text-ink"
        suppressHydrationWarning
      >
        <noscript>
          {/* Without JS the scroll-reveal never fires, so keep content visible. */}
          <style suppressHydrationWarning>{`[data-reveal="pending"]{opacity:1 !important}`}</style>
        </noscript>
        <ScrollManager />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
