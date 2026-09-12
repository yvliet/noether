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
          bgApp: 'var(--noether-bg-app)',
          bgTopBar: 'var(--noether-bg-topbar)',
          bgRibbon: 'var(--noether-bg-ribbon)',
          bgSidebar: 'var(--noether-bg-sidebar)',
          bgSidebarHover: 'var(--noether-bg-sidebar-hover)',
          bgSidebarActive: 'var(--noether-bg-sidebar-active)',
          bgMain: 'var(--noether-bg-main)',
          bgCard: 'var(--noether-bg-card)',
          bgCardHover: 'var(--noether-bg-card-hover)',
          bgPopover: 'var(--noether-bg-popover)',
          bgInput: 'var(--noether-bg-input)',
          bgInputFocus: 'var(--noether-bg-input-focus)',
          bgTabActive: 'var(--noether-bg-tab-active)',
          bgTabHover: 'var(--noether-bg-tab-hover)',
          bgStatusBar: 'var(--noether-bg-statusbar)',
          borderSubtle: 'var(--noether-border-subtle)',
          borderBase: 'var(--noether-border-base)',
          borderStrong: 'var(--noether-border-strong)',
          textPrimary: 'var(--noether-text-primary)',
          textSecondary: 'var(--noether-text-secondary)',
          textMuted: 'var(--noether-text-muted)',
          textFaint: 'var(--noether-text-faint)',
          accent: 'var(--noether-accent)',
          accentHover: 'var(--noether-accent-hover)',
          accentActive: 'var(--noether-accent-active)',
          accentSubtle: 'var(--noether-accent-subtle)',
        },
      },
      fontFamily: {
        brand: ['Outfit', 'var(--font-interface)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['var(--font-interface)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"'],
        interface: ['var(--font-interface)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"'],
        text: ['var(--font-text)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', '"Open Sans"', '"Helvetica Neue"', 'sans-serif'],
        prose: ['var(--font-text)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', '"Open Sans"', '"Helvetica Neue"', 'sans-serif'],
        mono: ['var(--font-monospace)', 'ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
        monospace: ['var(--font-monospace)', 'ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
