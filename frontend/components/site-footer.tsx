import HalftoneWordmarkFooter, {
  type FooterColumn,
} from "./ui/halftone-wordmark-footer";
import { displayFont } from "../app/display-font";
import { ANCHORS, DOCS_URL, GITHUB_URL } from "../lib/site";

/**
 * Site footer. Wraps the halftone wordmark footer with Mnemo's own content:
 * the wordmark reads "mnemo", the link columns mirror the site anchors, and
 * the palette stays light to match the page (#F7F7F5 / near-black ink) with
 * the brand indigo as the accent.
 */
const columns: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: ANCHORS.howItWorks },
      { label: "Features", href: ANCHORS.features },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Developer guide", href: DOCS_URL },
      ...(GITHUB_URL ? [{ label: "GitHub", href: GITHUB_URL }] : []),
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <HalftoneWordmarkFooter
      wordmark="mnemo"
      label="Mnemo"
      meta="A persistent-memory service for AI agents"
      columns={columns}
      backToTop
      note={
        <>
          © {year} Mnemo · Built by{" "}
          <a
            href="https://pranavx.in"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pranav Gawai
          </a>
        </>
      }
      palette={{
        background: "#E8E8E2",
        ink: "#0A0A0F",
        warm: "#4F46E5",
      }}
      fontFamily={displayFont.style.fontFamily}
      fontWeight={800}
      monoFamily={displayFont.style.fontFamily}
      height="clamp(380px, 36vw, 480px)"
    />
  );
}
