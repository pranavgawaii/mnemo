import HalftoneWordmarkFooter, {
  type FooterColumn,
} from "./ui/halftone-wordmark-footer";
import { LogoMark } from "./logo";
import { displayFont } from "../app/display-font";
import { ANCHORS, CONTACT_EMAIL, DOCS_URL, GITHUB_URL, PLAYGROUND_URL } from "../lib/site";

/**
 * Site footer. Wraps the halftone wordmark footer with Mnemo's own content:
 * the wordmark reads "mnemo", the brand line carries the logo mark beside the
 * name, the link columns mirror the site anchors, and the palette stays light
 * to match the page (#F7F7F5 / near-black ink) with the brand indigo as the
 * accent.
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
  {
    title: "Contact",
    links: [
      { label: "Playground", href: PLAYGROUND_URL },
      { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <HalftoneWordmarkFooter
      wordmark="mnemo"
      label={
        <>
          <LogoMark className="h-6 w-6 shrink-0" />
          Mnemo
        </>
      }
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
