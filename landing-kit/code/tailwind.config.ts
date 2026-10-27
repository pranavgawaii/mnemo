import type { Config } from "tailwindcss";

/**
 * Landing Kit theme.
 *
 * These are the exact tokens behind the Mnemo / Specboard editorial landing
 * style. Merge `theme.extend` into an existing config rather than replacing it
 * if the destination project already has a design system.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        serif: ["var(--font-redaction)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        background: "#F7F7F5",
        foreground: "#0A0A0F",
        ink: "#0A0A0F",
        muted: "#5E6472",
        faint: "#69707E",
        line: "#E5E5E5",
        hairline: "#EFEFEC",
        accent: {
          DEFAULT: "#4F46E5",
          soft: "#EEF0FF",
          ink: "#3730A3",
        },
        success: {
          DEFAULT: "#22C55E",
          ink: "#15803D",
        },
        danger: {
          DEFAULT: "#EF4444",
          ink: "#B91C1C",
        },
        warning: {
          DEFAULT: "#F59E0B",
          ink: "#B45309",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(10,10,15,0.04), 0 8px 24px -12px rgba(10,10,15,0.10)",
        lift: "0 1px 2px rgba(10,10,15,0.05), 0 20px 40px -24px rgba(10,10,15,0.18)",
      },
      maxWidth: {
        frame: "1200px",
      },
      letterSpacing: {
        display: "-0.035em",
        heading: "-0.02em",
      },
    },
  },
  plugins: [],
};

export default config;
