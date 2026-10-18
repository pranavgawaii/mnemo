"use client";

import { useState } from "react";
import { LogoMark } from "./logo";
import { GITHUB_URL, NAV_LINKS, PRIMARY_CTA } from "../lib/site";

const linkClass =
  "text-[13.5px] font-medium text-muted hover:text-ink transition-colors";

/**
 * Minimal full-width bar. Fixed, solid, constant height. It has no scroll
 * listener at all — nothing about it changes while the page scrolls.
 */
export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background border-b border-black/[0.07]">
      <nav
        aria-label="Primary"
        className="max-w-frame mx-auto h-[76px] px-6 flex items-center"
      >
        <div className="flex-1 flex items-center">
          <a
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Mnemo home"
          >
            <LogoMark className="h-[26px] w-[26px] text-ink" />
            <span className="text-[19px] font-semibold tracking-tight text-ink">
              Mnemo
            </span>
          </a>
        </div>

        <div className="hidden md:flex items-center gap-9">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-end gap-5">
          {GITHUB_URL && PRIMARY_CTA.external && (
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden md:inline-flex ${linkClass}`}
            >
              GitHub
            </a>
          )}

          <a
            href={PRIMARY_CTA.href}
            target={PRIMARY_CTA.external ? "_blank" : undefined}
            rel={PRIMARY_CTA.external ? "noopener noreferrer" : undefined}
            className="hidden md:inline-flex items-center rounded-[10px] bg-[#18181B] px-4 py-[9px] text-[13.5px] font-medium text-[#FAFAFA] hover:bg-[#27272A] transition-colors shadow-[0_1px_2px_rgba(10,10,15,0.10),inset_0_1px_0_rgba(255,255,255,0.10)]"
          >
            {PRIMARY_CTA.label}
          </a>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-9 h-9 -mr-1.5 flex items-center justify-center rounded-lg text-ink hover:bg-black/[0.04] transition-colors"
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
      </nav>

      {open && (
        <div className="md:hidden border-t border-black/[0.07] bg-background px-6 py-5">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-[15px] font-medium text-ink"
              >
                {link.label}
              </a>
            ))}
            {GITHUB_URL && (
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="text-[15px] font-medium text-ink"
              >
                GitHub
              </a>
            )}
            <a
              href={PRIMARY_CTA.href}
              target={PRIMARY_CTA.external ? "_blank" : undefined}
              rel={PRIMARY_CTA.external ? "noopener noreferrer" : undefined}
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex justify-center rounded-[10px] bg-[#18181B] px-4 py-2.5 text-[14px] font-medium text-[#FAFAFA]"
            >
              {PRIMARY_CTA.label}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
