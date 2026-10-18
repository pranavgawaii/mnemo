import type { Metadata } from "next";
import localFont from "next/font/local";
import { displayFont } from "./display-font";
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
  title: "Mnemo — Persistent memory API for AI agents",
  description:
    "Mnemo gives AI agents persistent recall: pgvector semantic search, time-decay ranking, and deterministic contradiction detection with a soft-delete audit trail.",
  openGraph: {
    title: "Mnemo — Persistent memory API for AI agents",
    description:
      "Semantic recall, time-decay ranking, and deterministic contradiction detection. Built with FastAPI, PostgreSQL and pgvector.",
    type: "website",
  },
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
          {/* Without JS the scroll-reveal never fires — keep content visible. */}
          <style>{`[data-reveal="pending"]{opacity:1 !important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
