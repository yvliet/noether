# Foundations

The Foundations layer defines core color palettes, typography scales, elevation shadows, border radii, and accent states across the Noether desktop application.


## 1. Surface & Background Tokens

---

Noether structures background tokens across a depth hierarchy:

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--noether-bg-app` | `#141414` | `#f8fafc` | Outermost application shell and frame background. |
| `--noether-bg-topbar` | `#0d0d0d` | `#f1f5f9` | Title bar and draggable window region. |
| `--noether-bg-ribbon` | `#111111` | `#e2e8f0` | Left vertical Action Rail / Ribbon icon strip. |
| `--noether-bg-sidebar` | `#151515` | `#f1f5f9` | Left and right collapsible navigation sidebars. |
| `--noether-bg-sidebar-hover` | `#1f1f1f` | `#e2e8f0` | Hover state for tree items and sidebar tabs. |
| `--noether-bg-sidebar-active` | `#272727` | `#cbd5e1` | Selected active state for tree items. |
| `--noether-bg-main` | `#1c1c1c` | `#ffffff` | Primary editor and reading canvas. |
| `--noether-bg-card` | `#222222` | `#ffffff` | Settings cards, callouts, and info panels. |
| `--noether-bg-card-hover` | `#282828` | `#f4f4f5` | Hover state for interactive cards. |
| `--noether-bg-popover` | `#242424` | `#ffffff` | Floating dropdown menus and context menus. |
| `--noether-bg-statusbar` | `#1f1f1f` | `#f1f5f9` | Bottom status bar strip. |


## 2. Interactive Surface & Button Tokens

---

Noether's theme compiler (`generateCssVariables()`) automatically normalizes and derives interactive surface tokens across lighting modes. When themes do not specify custom button tints, Noether derives appropriate translucency values ensuring crisp contrast:

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--noether-btn-hover-bg` | `rgba(255, 255, 255, 0.1)` | `rgba(0, 0, 0, 0.08)` | Hover background tint for ghost buttons and action icons. |
| `--noether-btn-active-bg` | `rgba(255, 255, 255, 0.2)` | `rgba(0, 0, 0, 0.15)` | Active / pressed background tint for buttons and interactive controls. |
| `--noether-bg-card` | `#222222` | `#ffffff` | Elevated card surface for containers, settings sections, and canvas cards. |
| `--noether-bg-card-hover` | `#282828` | `#f4f4f5` | Hover elevation tint for clickable cards and list items. |
| `--noether-bg-popover` | `#242424` | `#ffffff` | Floating popover, tooltip, and context menu background surface. |


## 3. Border Tokens

---

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--noether-border-subtle` | `#202020` | `#e2e8f0` | Faint divider lines, tab group separators, and outline guides. |
| `--noether-border-base` | `#292929` | `#cbd5e1` | Standard component borders and card outlines. |
| `--noether-border-strong` | `#383838` | `#94a3b8` | Emphasized dividers, active borders, and modal edges. |


## 4. Typography & Text Colors

---

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--noether-text-primary` | `#ffffff` | `#0f172a` | Primary body text, headings, and active labels. |
| `--noether-text-secondary` | `#dcddde` | `#334155` | Secondary text, file tree items, and subtitles. |
| `--noether-text-muted` | `#888888` | `#64748b` | Muted captions, timestamps, and hotkey hints. |
| `--noether-text-faint` | `#555555` | `#94a3b8` | Placeholders and disabled elements. |


## 5. Accent & Brand Palette

---

The default Noether brand accent is flame orange (`#eb584d`):

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-accent` | `#eb584d` | Primary brand accent color. |
| `--noether-accent-hover` | `#d94338` | Hover state for primary controls. |
| `--noether-accent-active` | `#b83228` | Pressed / active state for accent buttons. |
| `--noether-accent-subtle` | `rgba(235, 88, 77, 0.15)` | Subtle background tint for active selections. |


## 6. Elevation & Box Shadows

---

| Token | Default Value | Description |
| :--- | :--- | :--- |
| `--noether-shadow-1` | `0 1px 3px 0 rgba(0, 0, 0, 0.25)` | Subtle card elevation and dropdown buttons. |
| `--noether-shadow-2` | `0 4px 16px 0 rgba(0, 0, 0, 0.40)` | Floating popovers and search palettes. |
| `--noether-shadow-3` | `0 8px 32px 0 rgba(0, 0, 0, 0.60)` | Modal dialogs and graph overlays. |


## 7. System Font Stacks

---

```css
/* UI and navigation controls */
--font-interface: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";

/* Long-form document reading and writing */
--font-text: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;

/* Monospace code blocks and inline syntax */
--font-monospace: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
```
