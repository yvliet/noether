# Foundations

The Foundations layer defines core color palettes, typography scales, elevation shadows, border radii, and accent states across the Flint desktop application.


## 1. Surface & Background Tokens

---

Flint structures background tokens across a depth hierarchy:

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--flint-bg-app` | `#141414` | `#f8fafc` | Outermost application shell and frame background. |
| `--flint-bg-topbar` | `#0d0d0d` | `#f1f5f9` | Title bar and draggable window region. |
| `--flint-bg-ribbon` | `#111111` | `#e2e8f0` | Left vertical Action Rail / Ribbon icon strip. |
| `--flint-bg-sidebar` | `#151515` | `#f1f5f9` | Left and right collapsible navigation sidebars. |
| `--flint-bg-sidebar-hover` | `#1f1f1f` | `#e2e8f0` | Hover state for tree items and sidebar tabs. |
| `--flint-bg-sidebar-active` | `#272727` | `#cbd5e1` | Selected active state for tree items. |
| `--flint-bg-main` | `#1c1c1c` | `#ffffff` | Primary editor and reading canvas. |
| `--flint-bg-card` | `#222222` | `#f8fafc` | Settings cards, callouts, and info panels. |
| `--flint-bg-card-hover` | `#2a2a2a` | `#f1f5f9` | Hover state for interactive cards. |
| `--flint-bg-popover` | `#232323` | `#ffffff` | Floating dropdown menus and context menus. |
| `--flint-bg-statusbar` | `#1f1f1f` | `#f1f5f9` | Bottom status bar strip. |


## 2. Border Tokens

---

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--flint-border-subtle` | `#202020` | `#e2e8f0` | Faint divider lines, tab group separators, and outline guides. |
| `--flint-border-base` | `#292929` | `#cbd5e1` | Standard component borders and card outlines. |
| `--flint-border-strong` | `#383838` | `#94a3b8` | Emphasized dividers, active borders, and modal edges. |


## 3. Typography & Text Colors

---

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--flint-text-primary` | `#ffffff` | `#0f172a` | Primary body text, headings, and active labels. |
| `--flint-text-secondary` | `#dcddde` | `#334155` | Secondary text, file tree items, and subtitles. |
| `--flint-text-muted` | `#888888` | `#64748b` | Muted captions, timestamps, and hotkey hints. |
| `--flint-text-faint` | `#555555` | `#94a3b8` | Placeholders and disabled elements. |


## 4. Accent & Brand Palette

---

The default Flint brand accent is flame orange (`#ea580c`):

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-accent` | `#ea580c` | Primary brand accent color. |
| `--flint-accent-hover` | `#c2410c` | Hover state for primary controls. |
| `--flint-accent-active` | `#9a3412` | Pressed / active state for accent buttons. |
| `--flint-accent-subtle` | `rgba(234, 88, 12, 0.15)` | Subtle background tint for active selections. |


## 5. Elevation & Box Shadows

---

| Token | Default Value | Description |
| :--- | :--- | :--- |
| `--flint-shadow-1` | `0 1px 3px 0 rgba(0, 0, 0, 0.25)` | Subtle card elevation and dropdown buttons. |
| `--flint-shadow-2` | `0 4px 16px 0 rgba(0, 0, 0, 0.40)` | Floating popovers and search palettes. |
| `--flint-shadow-3` | `0 8px 32px 0 rgba(0, 0, 0, 0.60)` | Modal dialogs and graph overlays. |


## 6. System Font Stacks

---

```css
/* UI and navigation controls */
--font-interface: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";

/* Long-form document reading and writing */
--font-text: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;

/* Monospace code blocks and inline syntax */
--font-monospace: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
```
