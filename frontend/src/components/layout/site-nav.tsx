"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { usePathname } from "next/navigation";
import { NAV_CTA, NAV_LINKS, type NavLink } from "@/lib/site";

const linkClass =
  "link-underline w-fit text-[13.5px] font-medium text-muted hover:text-accent";

const brandClass =
  "flex items-center gap-2.5 text-ink hover:text-accent transition-colors";

/**
 * The docs call to action: the bar's only boxed element, so it carries the
 * primary-action weight for the whole header.
 *
 * It is built to read as a crafted control with no pointer anywhere near it:
 * an ink base with a top-lit gradient, a crisp 1px inset hairline, a lit top
 * edge and a two-layer shadow, plus a leading docs glyph so the pill says what
 * it does instead of being a coloured rectangle with a word in it.
 *
 * Hover stays inside the same palette, no accent wash. The pill lifts, its
 * shadow deepens and a short white sheen fades in across the top, which is
 * enough to feel alive without the button changing colour on the way in.
 * The sheen is a separate layer rather than a `background-color` change because
 * a gradient cannot be transitioned.
 */
const ctaClass =
  "group relative inline-flex h-9 shrink-0 items-center overflow-hidden rounded-full bg-[linear-gradient(180deg,#232331_0%,#0F0F18_55%,#0A0A0F_100%)] pl-3 pr-3.5 text-[13.5px] font-medium leading-none tracking-[-0.01em] text-[#FAFAFA] ring-1 ring-inset ring-white/15 shadow-[0_1px_2px_rgba(10,10,15,0.20),0_10px_24px_-12px_rgba(10,10,15,0.80),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.16,1,.3,1)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_62%)] before:opacity-0 before:transition-opacity before:duration-300 before:ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(10,10,15,0.26),0_14px_30px_-12px_rgba(10,10,15,0.85),inset_0_1px_0_rgba(255,255,255,0.26)] hover:before:opacity-100 active:translate-y-0 active:scale-[0.985] motion-reduce:transition-none motion-reduce:before:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100";

const ctaContentClass = "relative inline-flex items-center gap-[7px]";

const ctaIconClass =
  "h-[13px] w-[13px] shrink-0 text-white/75 transition-[transform,color] duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-px group-hover:text-white motion-reduce:transition-none motion-reduce:group-hover:translate-y-0";

const ctaArrowClass =
  "h-[11px] w-[11px] shrink-0 text-white/70 transition-[transform,color] duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-[2.5px] group-hover:text-white motion-reduce:transition-none motion-reduce:group-hover:translate-x-0";

function NavCta({ onClick }: { onClick?: () => void }) {
  return (
    <a href={NAV_CTA.href} onClick={onClick} className={ctaClass}>
      <span className={ctaContentClass}>
        <svg
          className={ctaIconClass}
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="2.9"
            y="1.7"
            width="8.2"
            height="10.6"
            rx="1.7"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <path
            d="M5.5 5.5h3M5.5 8.3h2.2"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
        {NAV_CTA.label}
        <svg
          className={ctaArrowClass}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.6 6h6.1M6.3 3.6L8.7 6l-2.4 2.4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </a>
  );
}

function NavItem({ link, onClick }: { link: NavLink; onClick?: () => void }) {
  const pathname = usePathname();
  const active = !link.external && pathname === link.href;
  return (
    <a
      href={link.href}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noopener noreferrer" : undefined}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`${linkClass} ${active ? "!text-ink" : ""}`}
    >
      {link.label}
    </a>
  );
}

function GitHubLink() {
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;
  useEffect(() => {
    if (!open) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") setDismissed(true);
    }
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open]);
  const github = NAV_LINKS.find((link) => link.external)!;
  return (
    <a
      href={github.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="GitHub"
      aria-describedby={tooltipId}
      onMouseEnter={() => {
        setHovered(true);
        setDismissed(false);
      }}
      onMouseLeave={() => {
        setHovered(false);
        if (!focused) setDismissed(false);
      }}
      onFocus={() => {
        setFocused(true);
        setDismissed(false);
      }}
      onBlur={() => {
        setFocused(false);
        if (!hovered) setDismissed(false);
      }}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:text-accent-ink focus-visible:text-accent-ink motion-reduce:transition-none"
    >
      {/* Primer Octicons GitHub mark (MIT); see docs/licenses/primer-octicons.txt. */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-[19px] w-[19px]"
      >
        <path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656" />
      </svg>
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!open}
        className={`absolute left-1/2 top-full z-10 w-max -translate-x-1/2 pt-2 text-center transition-[opacity,transform] duration-150 motion-reduce:transition-none ${open ? "visible translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0"}`}
      >
        <span className="block rounded border border-line bg-background px-2 py-1 text-[11px] font-medium leading-4 text-ink">
          GitHub
          <span className="sr-only">Opens in a new tab</span>
        </span>
      </span>
    </a>
  );
}

/** A translucent, constant-height header with one clear navigation hierarchy. */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      menuButton.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-black/[0.07]">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-frame items-center justify-between gap-4 px-5 sm:px-6"
      >
        <a href="/" className={brandClass} aria-label="Mnemo home">
          <LogoMark className="h-[25px] w-[25px]" />
          <span className="text-[19px] font-semibold tracking-tight">
            Mnemo
          </span>
        </a>
        <div className="flex items-center gap-2 md:gap-5">
          <div className="hidden items-center gap-4 md:flex">
            <NavItem link={NAV_LINKS[0]} />
            <GitHubLink />
          </div>
          <NavCta onClick={() => setOpen(false)} />
          <button
            type="button"
            ref={menuButton}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
            className="-mr-2 grid h-11 w-11 place-items-center rounded-lg text-ink transition-colors hover:bg-black/[0.04] md:hidden"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d={open ? "M5 5l10 10M15 5L5 15" : "M3 6h14M3 13h14"}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </nav>
      {open && (
        <div
          id={menuId}
          className="border-t border-line bg-background px-6 py-5 md:hidden"
        >
          <div className="flex flex-col gap-5">
            {NAV_LINKS.map((link) => (
              <NavItem
                key={link.href}
                link={link}
                onClick={() => setOpen(false)}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
