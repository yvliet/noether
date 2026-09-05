/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        flint: {
          bgApp: 'var(--flint-bg-app, #141414)',
          bgSidebar: 'var(--flint-bg-sidebar, #151515)',
          bgSidebarHover: 'var(--flint-bg-sidebar-hover, #1f1f1f)',
          bgSidebarActive: 'var(--flint-bg-sidebar-active, #272727)',
          bgMain: 'var(--flint-bg-main, #1c1c1c)',
          bgCard: 'var(--flint-bg-card, #222222)',
          bgCardHover: 'var(--flint-bg-card-hover, #2a2a2a)',
          bgInput: 'var(--flint-bg-input, #181818)',
          borderSubtle: 'var(--flint-border-subtle, #202020)',
          borderBase: 'var(--flint-border-base, #292929)',
          borderStrong: 'var(--flint-border-strong, #383838)',
          textPrimary: 'var(--flint-text-primary, #ffffff)',
          textSecondary: 'var(--flint-text-secondary, #dcddde)',
          textMuted: 'var(--flint-text-muted, #888888)',
          textFaint: 'var(--flint-text-faint, #555555)',
          accent: 'var(--flint-accent, #ea580c)',
          accentHover: 'var(--flint-accent-hover, #c2410c)',
          accentActive: 'var(--flint-accent-active, #9a3412)',
        },
      },
      fontFamily: {
        sans: ['var(--font-interface, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif)'],
        mono: ['var(--font-monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)'],
      },
    },
  },
  plugins: [],
};
