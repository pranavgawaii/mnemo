import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-redaction)', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        background: '#F7F7F5',
        foreground: '#0A0A0F',
        ink: '#0A0A0F',
        muted: '#5E6472',
        faint: '#69707E',
        line: '#E5E5E5',
        hairline: '#EFEFEC',
        accent: {
          DEFAULT: '#4F46E5',
          soft: '#EEF0FF',
          ink: '#3730A3',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(10,10,15,0.04), 0 8px 24px -12px rgba(10,10,15,0.10)',
        lift: '0 1px 2px rgba(10,10,15,0.05), 0 20px 40px -24px rgba(10,10,15,0.18)',
      },
      maxWidth: {
        frame: '1200px',
      },
    },
  },
  plugins: [],
}
export default config
