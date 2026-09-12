# Publish & Theme CSS Variables

Tokens and asset guidelines for theme distribution, marketplace previews, banner cards, and export styles.


## 1. Marketplace Preview Cards

---

When themes or extensions appear in the Noether Community Marketplace, cards format using these CSS tokens:

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-market-card-bg` | `#1c1c1c` | Background of marketplace item card. |
| `--noether-market-card-border` | `#2d2d2d` | Border around item card. |
| `--noether-market-card-hover` | `#242424` | Hover background. |
| `--noether-market-tag-bg` | `#292929` | Background of classification pill tags. |
| `--noether-market-tag-text` | `#b8b8b8` | Tag text color. |


## 2. Banner Image Standards

---

Themes and extensions can bundle a `banner.png` image for marketplace display:

- **Dimensions**: `800 x 500 px` (16:10 aspect ratio) or `400 x 250 px` thumbnail.
- **Format**: High-DPI PNG or optimized WebP.
- **Placement**: Placed in the root directory or `assets/banner.png`.


## 3. Print & PDF Export Styling

---

Noether includes clean `@media print` rules:

```css
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .titlebar,
  .sidebar-container,
  .statusbar,
  .action-rail {
    display: none !important;
  }
}
```
