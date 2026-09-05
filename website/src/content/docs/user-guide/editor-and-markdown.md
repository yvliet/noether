# Live Preview Editor & Markdown

Flint features an advanced, high-performance **Live Preview editor** engineered on top of TipTap 2.x and ProseMirror. It combines the tactile immediacy of WYSIWYG editing with the durability and portability of plain-text CommonMark.

Flint coordinates the editor through an immediate memory-to-disk pipeline: **TipTap / ProseMirror Layer** (active in-memory state with sub-8ms transaction mapping) → **Debounced Persistence Engine** (300ms save debounce with AST metadata extraction) → **Universal Plain CommonMark Storage** (authoritative `.md` on disk).

---

## 1. Live Preview vs. Source Mode

Flint provides two synchronized editing experiences:

1. **Live Preview (Default)**: Markdown formatting renders interactively as you type. Syntax tokens (such as `**bold**`, `# heading`, or `$...$`) seamlessly transform into styled visual elements while remaining editable in place when the cursor enters the text range.
2. **Source Mode**: Raw, unrendered CommonMark text with monospaced typography, ideal for batch editing frontmatter, macro manipulation, or structural diff review.

You can switch between modes anytime using the document options menu (`...` in the top right) or via the Command Palette (`Ctrl+K` → *Toggle Source Mode*).

---

## 2. Typing Performance & Decoration Mapping

Many web-based editors suffer from severe input lag when opening documents exceeding 20,000 words. Flint guarantees a **sub-8ms input latency** on documents of 100,000+ words through a series of systems-level invariants:

- **$O(1)$ Transaction Mapping**: Rather than re-parsing the entire document AST on every keystroke, Flint maps active decorations through ProseMirror transaction steps (`DecorationSet.map`).
- **Dirty-Range AST Scans**: Only modified textblocks and immediate parent containers are re-scanned for inline tokens, wikilinks, and tags.
- **Formula Memoization**: KaTeX rendering trees are cached in an LRU memory buffer, preventing repetitive LaTeX parsing during cursor movement.
- **Bounded Undo History**: ProseMirror history depth is bounded to 50 snapshots to maintain a lean, constant-size memory working set.

---

## 3. Formatting & Keyboard Shortcuts

Flint supports standard CommonMark syntax and intuitive desktop shortcuts:

| Formatting Element | Markdown Syntax | Keyboard Shortcut |
| :--- | :--- | :--- |
| **Bold** | `**text**` or `__text__` | `Ctrl+B` / `Cmd+B` |
| *Italic* | `*text*` or `_text_` | `Ctrl+I` / `Cmd+I` |
| ~~Strikethrough~~ | `~~text~~` | `Ctrl+Shift+X` / `Cmd+Shift+X` |
| ==Highlight== | `==text==` | `Ctrl+Shift+H` / `Cmd+Shift+H` |
| `Inline Code` | `` `code` `` | `Ctrl+E` / `Cmd+E` |
| **Heading 1-6** | `# H1` through `###### H6` | `Ctrl+Alt+1..6` |
| **Bullet List** | `- Item` or `* Item` | `Ctrl+Shift+8` |
| **Numbered List** | `1. Item` | `Ctrl+Shift+7` |
| **Task Checklist** | `- [ ] Task` or `- [x] Completed` | `Ctrl+Shift+9` |
| **Blockquote** | `> Quote text` | `Ctrl+Shift+.` |
| **Horizontal Rule** | `---` or `***` | Auto-converted on enter |
| **Inline Link** | `[Title](https://...)` | `Ctrl+K` (in editor selection) |
| **Internal Wiki-Link** | `[[Note Title]]` | Type `[[` |

### Auto-Pairing
Typing opening characters like `(`, `[`, `{`, `"`, `'`, or `` ` `` around an active text selection automatically wraps the selection without overwriting it.

### Smart Indentation
- Pressing `Tab` inside a bullet or numbered list nests the item under its parent.
- Pressing `Shift+Tab` unindents the list item.
- Pressing `Enter` on an empty list item breaks out of the list back to standard paragraph text.

---

## 4. Slash Commands Menu (`/`)

Pressing `/` on an empty line or after a space opens the **Slash Commands Palette**. This provides instant access to rich block insertion without taking your hands off the keyboard.

```
/
├── H1 Heading 1
├── H2 Heading 2
├── H3 Heading 3
├── Task List Checkbox
├── Bulleted List
├── Numbered List
├── Table Grid
├── Callout Box
├── Math Equation Block
└── Code Block
```

Type to filter commands (e.g. `/tab` for Table, `/cal` for Callout, `/mat` for Math), and press `Enter` or `Tab` to insert.

---

## 5. Mathematical Formulas & KaTeX

Flint provides deep mathematical typesetting with both inline and multi-line display equations powered by KaTeX and MathLive.

### Inline Math
Wrap formulas in single dollar signs:
```markdown
Euler's identity is defined as $e^{i\pi} + 1 = 0$.
```

### Display Math Blocks
Wrap formulas in double dollar signs or insert a math block via `/math`:
```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

### Interactive Math Keyboard
When you click on a math formula chip, Flint opens an interactive **MathLive On-Screen Keyboard** featuring:
- Greek symbols ($\alpha, \beta, \gamma, \theta, \lambda, \sigma, \omega$)
- Calculus operators ($\int, \frac{d}{dx}, \sum, \prod, \lim$)
- Matrix builders ($2\times 2$, $3\times 3$)
- Logic and set notation ($\in, \subset, \forall, \exists, \land, \lor$)

Formulas render with instant mathematical typesetting while preserving the raw LaTeX code directly in your markdown file.

---

## 6. Interactive Visual Tables

Flint features a fully visual table editing engine that eliminates the friction of hand-formatting raw ASCII markdown tables.

### Creating Tables
- Use the `/table` slash command to pick an initial grid dimension (e.g. $3\times 3$).
- Or type standard CommonMark table syntax:
  ```markdown
  | Column A | Column B | Column C |
  | :--- | :---: | ---: |
  | Left-aligned | Centered | Right-aligned |
  | Val 1 | Val 2 | Val 3 |
  ```

### Table Controls & Actions
- **Edge Controls**: Click the `+` buttons along table borders to instantly insert rows or columns.
- **Floating Toolbar**: Highlight cells to toggle header rows, change column alignments (left, center, right), clear cell contents, or delete rows and columns.
- **Keyboard Navigation**: Press `Tab` to navigate to the next cell; pressing `Tab` in the final cell automatically appends a new row. Press `Shift+Tab` to navigate backward.

---

## 7. Callouts & Alerts

Emphasize critical ideas, warnings, and implementation notes using GitHub-style callouts:

```markdown
> [!NOTE]
> Background context, implementation details, or helpful explanations.

> [!TIP]
> Practical suggestions, keyboard shortcuts, or performance best practices.

> [!IMPORTANT]
> Essential steps, requirements, or must-know concepts.

> [!WARNING]
> Critical warnings, potential data pitfalls, or compatibility notices.

> [!CAUTION]
> High-risk actions, destructive operations, or permanent deletion warnings.
```

Callouts render with crisp colored borders, thematic background fills, and distinct icons, while remaining completely standard CommonMark blockquotes on disk.

---

## 8. Media & Document Embeds

Flint supports embedding local attachments and cross-document transclusions using the `![[...]]` syntax:

- **Images**: `![[diagram.png]]` or `![Alt text](assets/diagram.png)`
- **Audio**: `![[interview.mp3]]` renders an inline HTML5 audio player.
- **Video**: `![[walkthrough.mp4]]` renders an interactive video player.
- **PDF Documents**: `![[whitepaper.pdf]]` renders an embedded viewer pane.
- **Note Transclusions**: `![[Architecture Overview]]` embeds the live content of another note directly inside the active document.

---

## 9. Intelligent Web Clip Cleaner

Copying content from Wikipedia, research papers, or web articles often clutters notes with unwanted citation brackets (e.g. `[1]`, `[citation needed]`) and messy HTML inline tags.

Flint includes an **Intelligent Paste Pipeline**:
- Automatically strips numeric reference links (`[1]`, `[12]`, `[cite]`).
- Converts rich HTML tables, headers, and bullet lists into clean CommonMark.
- Preserves code fences with correct syntax language tags.
- Removes tracking query parameters from pasted URLs.

---

## 10. Hierarchical Folding

To keep extensive notes organized and navigable:
- Hover over any heading (`# H1` through `###### H6`) or list item to reveal the **fold chevron** (`▾`).
- Click the chevron to collapse the entire section beneath it.
- An ellipsis badge (`...`) appears when folded; clicking it expands the section immediately.
- Fold states are managed through non-destructive ProseMirror mapped decorations, ensuring the underlying markdown file remains completely intact.
