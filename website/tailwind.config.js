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
        noether: {
          bgApp: 'var(--noether-bg-app, #141414)',
          bgSidebar: 'var(--noether-bg-sidebar, #151515)',
          bgSidebarHover: 'var(--noether-bg-sidebar-hover, #1f1f1f)',
          bgSidebarActive: 'var(--noether-bg-sidebar-active, #272727)',
          bgMain: 'var(--noether-bg-main, #1c1c1c)',
          bgCard: 'var(--noether-bg-card, #222222)',
          bgCardHover: 'var(--noether-bg-card-hover, #2a2a2a)',
          bgInput: 'var(--noether-bg-input, #181818)',
          borderSubtle: 'var(--noether-border-subtle, #202020)',
          borderBase: 'var(--noether-border-base, #292929)',
          borderStrong: 'var(--noether-border-strong, #383838)',
          textPrimary: 'var(--noether-text-primary, #ffffff)',
          textSecondary: 'var(--noether-text-secondary, #dcddde)',
          textMuted: 'var(--noether-text-muted, #888888)',
          textFaint: 'var(--noether-text-faint, #555555)',
          accent: 'var(--noether-accent, #eb584d)',
          accentHover: 'var(--noether-accent-hover, #d94338)',
          accentActive: 'var(--noether-accent-active, #b83228)',
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
