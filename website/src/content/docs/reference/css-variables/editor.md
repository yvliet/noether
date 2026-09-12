# Editor Variables

CSS variables and styling rules for the TipTap 2.x and ProseMirror Live Preview editor engine, markdown typography, selection highlights, and code blocks.


## 1. Document Canvas & Sizing

---

| Token | Default Value | Description |
| :--- | :--- | :--- |
| `--noether-bg-main` | `#1c1c1c` | Background of the active editor reading canvas. |
| `--editor-font-size` | `16px` | Configurable base typography size. |
| `--editor-line-height` | `1.75` | Proportional line height for readability. |
| `--editor-max-width` | `760px` | Centered reading view column width. |


## 2. Selection & Cursor Tokens

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-selection-bg` | `#4a4e57` | Background highlight for selected text. |
| `--noether-selection-text` | `#ffffff` | Foreground color of selected text. |
| `--noether-caret-color` | `var(--noether-accent)` | Blinking text insertion cursor color. |


## 3. Headings & Markdown Typography

---

| Token | Dark Default | Sizing | Description |
| :--- | :--- | :--- | :--- |
| `--noether-h1-color` | `#ffffff` | `2.0em / font-bold` | Level 1 document headings (`#`). |
| `--noether-h2-color` | `#ffffff` | `1.5em / font-semibold`| Level 2 section headings (`##`). |
| `--noether-h3-color` | `#f0f0f0` | `1.25em / font-semibold`| Level 3 subsection headings (`###`). |
| `--noether-h4-color` | `#d4d4d4` | `1.1em / font-semibold`| Level 4 headings (`####`). |


## 4. Code Blocks & Monospace Syntax

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-code-bg` | `#242424` | Background for inline \`code\` and fenced code blocks. |
| `--noether-code-text` | `#e5e7eb` | Monospaced text color. |
| `--noether-code-border` | `1px solid var(--noether-border-base)` | Code block boundary border. |


## 5. Wikilinks & Internal References

---

| Token | Value | Description |
| :--- | :--- | :--- |
| `--noether-link-color` | `var(--noether-accent)` | Internal `[[Wikilinks]]` and external anchors. |
| `--noether-link-hover` | `var(--noether-accent-hover)` | Hovered link state. |
| `--noether-link-visited`| `var(--noether-accent)` | Persistent visited link color. |
| `--noether-link-decoration-color` | `var(--noether-border-strong)` | Underline decoration color. |


## 6. Folding Gutters & Placeholders

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-fold-chevron` | `#666666` | Fold chevron icon color. |
| `--noether-fold-chevron-hover` | `#ffffff` | Hovered fold chevron color. |
| `--noether-fold-ellipsis-bg` | `#262626` | Background of collapsed placeholder badge (`...`). |
| `--noether-fold-ellipsis-text` | `#999999` | Text of collapsed placeholder badge. |
