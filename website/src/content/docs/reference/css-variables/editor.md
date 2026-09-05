# Editor Variables

CSS variables and styling rules for the TipTap 2.x and ProseMirror Live Preview editor engine, markdown typography, selection highlights, and code blocks.


## 1. Document Canvas & Sizing

---

| Token | Default Value | Description |
| :--- | :--- | :--- |
| `--flint-bg-main` | `#1c1c1c` | Background of the active editor reading canvas. |
| `--editor-font-size` | `16px` | Configurable base typography size. |
| `--editor-line-height` | `1.75` | Proportional line height for readability. |
| `--editor-max-width` | `760px` | Centered reading view column width. |


## 2. Selection & Cursor Tokens

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-selection-bg` | `#4a4e57` | Background highlight for selected text. |
| `--flint-selection-text` | `#ffffff` | Foreground color of selected text. |
| `--flint-caret-color` | `var(--flint-accent)` | Blinking text insertion cursor color. |


## 3. Headings & Markdown Typography

---

| Token | Dark Default | Sizing | Description |
| :--- | :--- | :--- | :--- |
| `--flint-h1-color` | `#ffffff` | `2.0em / font-bold` | Level 1 document headings (`#`). |
| `--flint-h2-color` | `#ffffff` | `1.5em / font-semibold`| Level 2 section headings (`##`). |
| `--flint-h3-color` | `#f0f0f0` | `1.25em / font-semibold`| Level 3 subsection headings (`###`). |
| `--flint-h4-color` | `#d4d4d4` | `1.1em / font-semibold`| Level 4 headings (`####`). |


## 4. Code Blocks & Monospace Syntax

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-code-bg` | `#242424` | Background for inline \`code\` and fenced code blocks. |
| `--flint-code-text` | `#e5e7eb` | Monospaced text color. |
| `--flint-code-border` | `1px solid var(--flint-border-base)` | Code block boundary border. |


## 5. Wikilinks & Internal References

---

| Token | Value | Description |
| :--- | :--- | :--- |
| `--flint-link-color` | `var(--flint-accent)` | Internal `[[Wikilinks]]` and external anchors. |
| `--flint-link-hover` | `var(--flint-accent-hover)` | Hovered link state. |
| `--flint-link-visited`| `var(--flint-accent)` | Persistent visited link color. |
| `--flint-link-decoration-color` | `var(--flint-border-strong)` | Underline decoration color. |


## 6. Folding Gutters & Placeholders

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-fold-chevron` | `#666666` | Fold chevron icon color. |
| `--flint-fold-chevron-hover` | `#ffffff` | Hovered fold chevron color. |
| `--flint-fold-ellipsis-bg` | `#262626` | Background of collapsed placeholder badge (`...`). |
| `--flint-fold-ellipsis-text` | `#999999` | Text of collapsed placeholder badge. |
