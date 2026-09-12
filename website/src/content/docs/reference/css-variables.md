# CSS Variables & Design Tokens

Noether's visual architecture is built entirely on standard CSS Custom Properties (design tokens). Every UI component inherits from these tokens, including sidebars, modals, tabs, tree nodes, and editor blocks.

Theme designers and extension authors should always utilize these tokens rather than hardcoding hex values. This ensures that custom views adapt smoothly when users switch between dark and light themes or configure custom accent colors.


## 1. Background Surface Tokens

---

Noether uses a layered hierarchy of background tokens to convey visual depth and structure without clutter.

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--noether-bg-app` | `#141414` | `#f8fafc` | The outermost application viewport background. |
| `--noether-bg-topbar` | `#0d0d0d` | `#f1f5f9` | Window title bar and window control draggable zone. |
| `--noether-bg-ribbon` | `#111111` | `#e2e8f0` | The far-left Action Rail / Ribbon icon strip. |
| `--noether-bg-sidebar` | `#151515` | `#f1f5f9` | Left and right collapsible navigation panels. |
| `--noether-bg-sidebar-hover` | `#1f1f1f` | `#e2e8f0` | Hover state for tree items, navigation tabs, and file rows. |
| `--noether-bg-sidebar-active` | `#272727` | `#cbd5e1` | Selected active state for tree items and navigation tabs. |
| `--noether-bg-main` | `#1c1c1c` | `#ffffff` | Primary editor reading canvas and main document area. |
| `--noether-bg-card` | `#222222` | `#f8fafc` | Settings cards, callout boxes, and informational panels. |
| `--noether-bg-card-hover` | `#2a2a2a` | `#f1f5f9` | Interactive hover state for cards and list items. |
| `--noether-bg-popover` | `#232323` | `#ffffff` | Floating dropdown menus, tooltips, and context menus. |
| `--noether-bg-input` | `#181818` | `#ffffff` | Text inputs, search boxes, and editable textareas. |
| `--noether-bg-input-focus` | `#222222` | `#ffffff` | Focused input background state. |
| `--noether-bg-tab-active` | `#1c1c1c` | `#ffffff` | Active document tab in the split tab bar. |
| `--noether-bg-tab-hover` | `#232323` | `#f1f5f9` | Hovered inactive tab in the split tab bar. |
| `--noether-bg-statusbar` | `#1f1f1f` | `#f1f5f9` | Bottom status bar strip. |

### Usage Example

```css
.my-custom-extension-card {
  background-color: var(--noether-bg-card);
  border: 1px solid var(--noether-border-base);
  color: var(--noether-text-primary);
  border-radius: 8px;
  padding: 16px;
}

.my-custom-extension-card:hover {
  background-color: var(--noether-bg-card-hover);
  border-color: var(--noether-border-strong);
}
```


## 2. Border Tokens

---

Borders establish subtle separation between split panes, cards, and input fields.

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-border-subtle` | `#202020` | Faint divider lines, tab group separators, and outline guidelines. |
| `--noether-border-base` | `#292929` | Standard component borders, card edges, and input outlines. |
| `--noether-border-strong` | `#383838` | Emphasized dividers, active input borders, and modal window borders. |


## 3. Typography & Text Tokens

---

Noether relies on high-contrast, accessible typography tokens with clear hierarchy.

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-text-primary` | `#ffffff` | Primary body copy, document headings, active labels, and button text. |
| `--noether-text-secondary` | `#dcddde` | Secondary document text, descriptions, and file tree node titles. |
| `--noether-text-muted` | `#888888` | Muted labels, timestamps, keyboard shortcuts, and meta captions. |
| `--noether-text-faint` | `#555555` | Placeholders, disabled states, and collapsed folder counts. |


## 4. Accent & Link Tokens

---

The default Noether brand accent is a vivid flame orange (`#eb584d`), used for primary call-to-actions, Wikilinks, active tab indicators, and graph focal points.

| Token | Default Value | Description |
| :--- | :--- | :--- |
| `--noether-accent` | `#eb584d` | Primary brand accent color. |
| `--noether-accent-hover` | `#d94338` | Hover state for primary buttons and interactive accents. |
| `--noether-accent-active` | `#b83228` | Pressed / active state for accent controls. |
| `--noether-accent-subtle` | `rgba(235, 88, 77, 0.15)` | Subtle accent tint for selections and highlights. |
| `--noether-accent-gradient` | `linear-gradient(135deg, #eb584d 0%, #d94338 100%)` | Gradient accent for hero elements. |
| `--noether-link-color` | `var(--noether-accent)` | Color of internal `[[Wikilinks]]` and external anchors. |
| `--noether-link-hover` | `var(--noether-accent-hover)` | Hover state for links. |
| `--noether-link-visited` | `var(--noether-accent)` | Visited link color. |
| `--noether-link-decoration-color`| `var(--noether-border-strong)` | Underline decoration color for links. |

### Link Customization Attributes

Noether supports workspace-wide and per-theme link overrides via root attributes:

- `[data-no-link-accent="true"]` / `.noether-no-link-accent`: Removes the colored accent from links, rendering them in standard secondary text color with an underline.
- `[data-blue-links="true"]` / `.noether-blue-links`: Switches links to classic web blue (`#58a6ff` in dark mode, `#0000ee` in light mode).
- `[data-color-link-underline="true"]` / `.noether-color-link-underline`: Forces link underlines to match link text color.


## 5. Selection & Code Tokens

---

Tokens governing code blocks, inline monospaced snippets, and text selections.

| Token | Default Value | Description |
| :--- | :--- | :--- |
| `--noether-selection-bg` | `#4a4e57` | Background highlight for selected text in editor and inputs. |
| `--noether-selection-text` | `#ffffff` | Foreground color of selected text. |
| `--noether-code-bg` | `#242424` | Background for inline code \`code\` and fenced code blocks. |
| `--noether-code-text` | `#e5e7eb` | Monospace code text color. |


## 6. Elevation & Shadow Tokens

---

Natural, unbloated box shadows for floating panels, dropdown menus, and modal dialogs.

| Token | Default Value | Description |
| :--- | :--- | :--- |
| `--noether-shadow-1` | `0 1px 3px 0 rgba(0, 0, 0, 0.25)` | Subtle elevation for cards, dropdown buttons, and toolbars. |
| `--noether-shadow-2` | `0 4px 16px 0 rgba(0, 0, 0, 0.40)` | Floating popovers, context menus, and search palettes. |
| `--noether-shadow-3` | `0 8px 32px 0 rgba(0, 0, 0, 0.60)` | Modal dialog backdrops, image lightboxes, and graph overlays. |


## 7. Native System Font Stacks

---

Noether avoids downloading heavy external web fonts, prioritizing native system font stacks for zero layout shifts and instant startup:

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

To build a custom theme for Noether, create a `styles.css` file inside `<vault>/.noether/themes/<theme-name>/`. You only need to declare the tokens you wish to override:

```css
/* Example: Nordic Frost Theme */
:root {
  --noether-bg-app: #242933;
  --noether-bg-sidebar: #2e3440;
  --noether-bg-main: #3b4252;
  --noether-bg-card: #434c5e;
  --noether-border-base: #4c566a;
  
  --noether-accent: #88c0d0;
  --noether-accent-hover: #81a1c1;
  --noether-text-primary: #eceff4;
  --noether-text-secondary: #d8dee9;
}
```

For complete instructions on testing and packaging themes, read [[Build Your First Theme]]. To see how these variables style Noether's native UI elements, check [[Noether UI Components]].
