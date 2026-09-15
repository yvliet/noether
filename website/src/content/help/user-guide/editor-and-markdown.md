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

> [!TIP]
> To type a literal dollar sign without triggering math mode, type `\$` or use prices like `$100` normally. Single dollar auto-pairing can be configured in Editor Settings.

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

Supported callout types include: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`, `INFO`, `QUESTION`, `TODO`, `EXAMPLE`, `QUOTE`, and `BUG`.

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
