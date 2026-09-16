# Live Preview Editor & Markdown

Noether includes a fast Live Preview Markdown editor built on TipTap and ProseMirror. It gives you the visual clarity of formatted text while preserving standard Markdown files on disk.

## 1. Live Preview and Source Mode
---

Noether provides two editing modes:

1. **Live Preview (Default)**: Markdown formatting renders interactively as you type. Elements like `**bold**`, `# headings`, tables, and math equations display with live styling, and reveal their markdown syntax when your cursor moves over them.
2. **Source Mode**: Displays raw, unrendered CommonMark text in monospaced font, useful for editing complex frontmatter blocks or inspecting raw syntax.

To switch modes, open the document options menu (`...`) in the top right of the editor or press `Ctrl+Shift+M`.

## 2. Formatting & Keyboard Shortcuts
---

Noether supports standard CommonMark formatting and desktop keyboard shortcuts:

| Formatting Element | Markdown Syntax | Keyboard Shortcut |
| :--- | :--- | :--- |
| **Bold** | `**text**` or `__text__` | `Ctrl+B` |
| *Italic* | `*text*` or `_text_` | `Ctrl+I` |
| ~~Strikethrough~~ | `~~text~~` | `Ctrl+Shift+X` |
| ==Highlight== | `==text==` | `Ctrl+Shift+H` |
| `Inline Code` | `` `code` `` | `Ctrl+E` |
| **Heading 1-6** | `# H1` through `###### H6` | `Ctrl+Alt+1..6` |
| **Bullet List** | `- Item` | `Ctrl+Shift+8` |
| **Numbered List** | `1. Item` | `Ctrl+Shift+7` |
| **Task Checklist** | `- [ ] Task` | `Ctrl+Shift+9` |
| **Blockquote** | `> Quote` | `Ctrl+Shift+.` |
| **Horizontal Rule** | `---` | Auto-converted on enter |
| **Wikilink** | `[[Note Title]]` | Type `[[` |

### Auto-Pairing Characters

Typing opening characters like `(`, `[`, `{`, `"`, or `` ` `` around selected text automatically wraps the selection. You can toggle auto-pairing behavior in **Settings (`Ctrl+,`) → Editor**.

## 3. Math Formulas ($KaTeX$)
---

Noether includes built-in LaTeX math rendering powered by KaTeX:

- **Inline Math**: Wrap expressions in single dollar signs: `$E = mc^2$` renders as $E = mc^2$.
- **Display Math Blocks**: Wrap multi-line formulas in double dollar signs:

```latex
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

<details>
<summary><b>LaTeX Math Cheat Sheet & Common Formulas</b></summary>

| Mathematical Expression | LaTeX Syntax | Rendered Output |
| :--- | :--- | :--- |
| **Fractions** | `\frac{a}{b}` | $\frac{a}{b}$ |
| **Square Root** | `\sqrt{x^2 + y^2}` | $\sqrt{x^2 + y^2}$ |
| **Summation** | `\sum_{i=1}^n i` | $\sum_{i=1}^n i$ |
| **Limits** | `\lim_{x \to 0} \frac{\sin x}{x} = 1` | $\lim_{x \to 0} \frac{\sin x}{x} = 1$ |
| **Greek Letters** | `\alpha, \beta, \gamma, \theta, \lambda` | $\alpha, \beta, \gamma, \theta, \lambda$ |
| **Matrices** | `\begin{pmatrix} a & b \\ c & d \end{pmatrix}` | $\begin{pmatrix} a & b \\ c & d \end{pmatrix}$ |

</details>

## 4. Tables & Column Resizing
---

Create tables using standard Markdown pipe syntax or the table slash command (`/table`):

```markdown
| Feature | Status | Priority |
| :--- | :--- | :--- |
| Editor | Active | High |
| Canvas | Active | Medium |
```

- **Add Rows / Columns**: Click the floating table controls to insert rows or columns.
- **Resize Columns**: Hover over any column border and drag horizontally to adjust width.
- **Tab Navigation**: Press `Tab` to move to the next cell, or `Shift+Tab` to move to the previous cell.

## 5. Callouts
---

Highlight notes, tips, warnings, and quotes using callout badges:

```markdown
> [!NOTE]
> This is a helpful context note.

> [!TIP]
> Use Ctrl+K to open the Command Palette from anywhere.

> [!WARNING]
> Deleting a vault folder permanently removes files from disk.
```

<details>
<summary><b>Visual Callout Badges Reference (All 11 Types)</b></summary>

> [!NOTE]
> **NOTE**: General information and helpful background details.

> [!TIP]
> **TIP**: Best practices, efficiency suggestions, and useful tricks.

> [!IMPORTANT]
> **IMPORTANT**: Crucial instructions that require user attention.

> [!WARNING]
> **WARNING**: Breaking changes, caution notices, and potential pitfalls.

> [!CAUTION]
> **CAUTION**: High-risk actions that could cause data loss.

> [!INFO]
> **INFO**: Factual notifications and status summaries.

> [!QUESTION]
> **QUESTION**: Frequently asked questions and clarification items.

> [!TODO]
> **TODO**: Outstanding action items and planned tasks.

> [!EXAMPLE]
> **EXAMPLE**: Code demonstrations and sample workflows.

> [!QUOTE]
> **QUOTE**: Attributed citations and memorable quotations.

> [!BUG]
> **BUG**: Known defects, error codes, and troubleshooting advice.

</details>

## 6. Slash Commands
---

Type `/` on any blank line to open the slash command menu:

- `/heading 1..3`: Insert headings
- `/table`: Insert interactive table
- `/callout`: Insert callout box
- `/math`: Insert display formula
- `/code`: Insert syntax-highlighted code block
- `/sketch`: Insert drawing canvas
- `/task`: Insert checklist item
