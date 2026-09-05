# CSS Variables & Design Tokens

Flint's visual architecture is built entirely on standard CSS Custom Properties (design tokens). Every UI component inherits from these tokens, including sidebars, modals, tabs, tree nodes, and editor blocks.

Theme designers and extension authors should always utilize these tokens rather than hardcoding hex values. This ensures that custom views adapt smoothly when users switch between dark and light themes or configure custom accent colors.


## 1. Background Surface Tokens

---

Flint uses a layered hierarchy of background tokens to convey visual depth and structure without clutter.

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--flint-bg-app` | `#141414` | `#f8fafc` | The outermost application viewport background. |
| `--flint-bg-topbar` | `#0d0d0d` | `#f1f5f9` | Window title bar and window control draggable zone. |
| `--flint-bg-ribbon` | `#111111` | `#e2e8f0` | The far-left Action Rail / Ribbon icon strip. |
| `--flint-bg-sidebar` | `#151515` | `#f1f5f9` | Left and right collapsible navigation panels. |
| `--flint-bg-sidebar-hover` | `#1f1f1f` | `#e2e8f0` | Hover state for tree items, navigation tabs, and file rows. |
| `--flint-bg-sidebar-active` | `#272727` | `#cbd5e1` | Selected active state for tree items and navigation tabs. |
| `--flint-bg-main` | `#1c1c1c` | `#ffffff` | Primary editor reading canvas and main document area. |
| `--flint-bg-card` | `#222222` | `#f8fafc` | Settings cards, callout boxes, and informational panels. |
| `--flint-bg-card-hover` | `#2a2a2a` | `#f1f5f9` | Interactive hover state for cards and list items. |
| `--flint-bg-popover` | `#232323` | `#ffffff` | Floating dropdown menus, tooltips, and context menus. |
| `--flint-bg-input` | `#181818` | `#ffffff` | Text inputs, search boxes, and editable textareas. |
| `--flint-bg-input-focus` | `#222222` | `#ffffff` | Focused input background state. |
| `--flint-bg-tab-active` | `#1c1c1c` | `#ffffff` | Active document tab in the split tab bar. |
| `--flint-bg-tab-hover` | `#232323` | `#f1f5f9` | Hovered inactive tab in the split tab bar. |
| `--flint-bg-statusbar` | `#1f1f1f` | `#f1f5f9` | Bottom status bar strip. |

### Usage Example

```css
.my-custom-plugin-card {
  background-color: var(--flint-bg-card);
  border: 1px solid var(--flint-border-base);
  color: var(--flint-text-primary);
  border-radius: 8px;
  padding: 16px;
}

.my-custom-plugin-card:hover {
  background-color: var(--flint-bg-card-hover);
  border-color: var(--flint-border-strong);
}
```


## 2. Border Tokens

---

Borders establish subtle separation between split panes, cards, and input fields.

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-border-subtle` | `#202020` | Faint divider lines, tab group separators, and outline guidelines. |
| `--flint-border-base` | `#292929` | Standard component borders, card edges, and input outlines. |
| `--flint-border-strong` | `#383838` | Emphasized dividers, active input borders, and modal window borders. |


## 3. Typography & Text Tokens

---

Flint relies on high-contrast, accessible typography tokens with clear hierarchy.

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-text-primary` | `#ffffff` | Primary body copy, document headings, active labels, and button text. |
| `--flint-text-secondary` | `#dcddde` | Secondary document text, descriptions, and file tree node titles. |
| `--flint-text-muted` | `#888888` | Muted labels, timestamps, keyboard shortcuts, and meta captions. |
| `--flint-text-faint` | `#555555` | Placeholders, disabled states, and collapsed folder counts. |


## 4. Accent & Link Tokens

---

The default Flint brand accent is a vivid flame orange (`#ea580c`), used for primary call-to-actions, Wikilinks, active tab indicators, and graph focal points.

| Token | Default Value | Description |
| :--- | :--- | :--- |
| `--flint-accent` | `#ea580c` | Primary brand accent color. |
| `--flint-accent-hover` | `#c2410c` | Hover state for primary buttons and interactive accents. |
| `--flint-accent-active` | `#9a3412` | Pressed / active state for accent controls. |
| `--flint-accent-subtle` | `rgba(234, 88, 12, 0.15)` | Subtle accent tint for selections and highlights. |
| `--flint-accent-gradient` | `linear-gradient(135deg, #ea580c 0%, #f97316 100%)` | Gradient accent for hero elements. |
| `--flint-link-color` | `var(--flint-accent)` | Color of internal `[[Wikilinks]]` and external anchors. |
| `--flint-link-hover` | `var(--flint-accent-hover)` | Hover state for links. |
| `--flint-link-visited` | `var(--flint-accent)` | Visited link color. |
| `--flint-link-decoration-color`| `var(--flint-border-strong)` | Underline decoration color for links. |

### Link Customization Attributes

Flint supports workspace-wide and per-theme link overrides via root attributes:

- `[data-no-link-accent="true"]` / `.flint-no-link-accent`: Removes the colored accent from links, rendering them in standard secondary text color with an underline.
- `[data-blue-links="true"]` / `.flint-blue-links`: Switches links to classic web blue (`#58a6ff` in dark mode, `#0000ee` in light mode).
- `[data-color-link-underline="true"]` / `.flint-color-link-underline`: Forces link underlines to match link text color.


## 5. Selection & Code Tokens

---

Tokens governing code blocks, inline monospaced snippets, and text selections.

| Token | Default Value | Description |
| :--- | :--- | :--- |
| `--flint-selection-bg` | `#4a4e57` | Background highlight for selected text in editor and inputs. |
| `--flint-selection-text` | `#ffffff` | Foreground color of selected text. |
| `--flint-code-bg` | `#242424` | Background for inline code \`code\` and fenced code blocks. |
| `--flint-code-text` | `#e5e7eb` | Monospace code text color. |


## 6. Elevation & Shadow Tokens

---

Natural, unbloated box shadows for floating panels, dropdown menus, and modal dialogs.

| Token | Default Value | Description |
| :--- | :--- | :--- |
| `--flint-shadow-1` | `0 1px 3px 0 rgba(0, 0, 0, 0.25)` | Subtle elevation for cards, dropdown buttons, and toolbars. |
| `--flint-shadow-2` | `0 4px 16px 0 rgba(0, 0, 0, 0.40)` | Floating popovers, context menus, and search palettes. |
| `--flint-shadow-3` | `0 8px 32px 0 rgba(0, 0, 0, 0.60)` | Modal dialog backdrops, image lightboxes, and graph overlays. |


## 7. Native System Font Stacks

---

Flint avoids downloading heavy external web fonts, prioritizing native system font stacks for zero layout shifts and instant startup:

```css
/* UI and navigation controls */
--font-interface: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";

/* Long-form document reading and writing */
--font-text: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;

/* Monospace code blocks and inline syntax */
--font-monospace: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

/* Configurable editor base sizing */
--editor-font-size: 16px;
```


## 8. Theme Authoring & Overrides

---

To build a custom theme for Flint, create a `styles.css` file inside `<hearth>/.flint/themes/<theme-name>/`. You only need to declare the tokens you wish to override:

```css
/* Example: Nordic Frost Theme */
:root {
  --flint-bg-app: #242933;
  --flint-bg-sidebar: #2e3440;
  --flint-bg-main: #3b4252;
  --flint-bg-card: #434c5e;
  --flint-border-base: #4c566a;
  
  --flint-accent: #88c0d0;
  --flint-accent-hover: #81a1c1;
  --flint-text-primary: #eceff4;
  --flint-text-secondary: #d8dee9;
}
```

For complete instructions on testing and packaging themes, read [[Build Your First Theme]]. To see how these variables style Flint's native UI elements, check [[Flint UI Components]].
