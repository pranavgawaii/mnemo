"use client";

import { useState } from "react";
import { LogoMark } from "./logo";
import { NAV_CTA, NAV_LEFT, NAV_LINKS, NAV_RIGHT, type NavLink } from "../lib/site";

const linkClass =
  "link-underline w-fit text-[13.5px] font-medium text-muted hover:text-accent";

const wordmarkClass =
  "text-[19px] font-semibold tracking-tight text-ink hover:text-accent transition-colors";

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
  return (
    <a
      href={link.href}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={linkClass}
    >
      {link.label}
    </a>
  );
}

/**
 * Minimal full-width bar. Fixed, solid, constant height. It has no scroll
 * listener at all: nothing about it changes while the page scrolls.
 *
 * Layout, left to right: the wordmark and two links, the centred logo with two
 * links beside it, then the docs call to action in the far corner.
 */
export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background border-b border-black/[0.07]">
      <nav aria-label="Primary" className="max-w-frame mx-auto h-16 px-6">
        {/* Desktop */}
        <div className="hidden h-full lg:grid lg:grid-cols-[1fr_auto_1fr] items-center">
          {/* Far left: the wordmark */}
          <a href="/" className={wordmarkClass}>
            Mnemo
          </a>

          {/* Centre: one tight run: links, the logo, then the remaining links */}
          <div className="flex items-center gap-8">
            {NAV_LEFT.map((link) => (
              <NavItem key={link.href} link={link} />
            ))}
            <a
              href="/"
              aria-label="Mnemo home"
              className="flex items-center text-ink hover:text-accent transition-colors"
            >
              <LogoMark className="h-[24px] w-[24px]" />
            </a>
            {NAV_RIGHT.map((link) => (
              <NavItem key={link.href} link={link} />
            ))}
          </div>

          {/* Far right: the call to action */}
          <div className="flex items-center justify-end">
            <NavCta />
          </div>
        </div>

        {/* Mobile */}
        <div className="flex h-full items-center justify-between lg:hidden">
          <a href="/" className={brandClass} aria-label="Mnemo home">
            <LogoMark className="h-[26px] w-[26px]" />
            <span className="text-[19px] font-semibold tracking-tight">
              Mnemo
            </span>
          </a>

          <div className="flex items-center gap-2">
            <NavCta onClick={() => setOpen(false)} />

            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-lg text-ink hover:bg-black/[0.04] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                {open ? (
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M3 6h14M3 13h14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div className="lg:hidden border-t border-black/[0.07] bg-background px-6 py-5">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <NavItem key={link.href} link={link} onClick={() => setOpen(false)} />
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
