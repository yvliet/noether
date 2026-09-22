# Live Preview Editor & Markdown

Noether includes a fast Live Preview Markdown editor built on TipTap and ProseMirror. It gives you the visual clarity of formatted text while preserving plain CommonMark files on disk.

## 1. Live Preview, Source Mode & Document Options
---

Noether provides two primary editing modes:

1. **Live Preview (Default)**: Markdown formatting renders interactively as you type. Elements like `**bold**`, `# headings`, tables, and math equations display with live styling, and reveal their markdown syntax when your cursor moves over them.
2. **Source Mode**: Displays raw, unrendered CommonMark text in a clean monospace font, ideal for editing complex frontmatter YAML blocks or inspecting raw syntax.

To toggle between modes, press `Ctrl+Shift+M` or select your preference from the **Document Options menu (`...`)** located in the top-right corner of the editor.

### Document Options Menu Actions

The Document Options menu (`...`) exposes powerful contextual note operations:

- **Lock Note (Read-Only)**: Protects the note from accidental modifications, hiding the typing caret and disabling text changes.
- **Merge Note With...**: Combines another vault note directly into the active document with a divider and heading.
- **Zoom Presets**: Instant viewport scaling (50%, 75%, 90%, 100%, 110%, 125%, 150%, 175%, 200%) with toast confirmation.
- **Export to PDF**: Triggers the system print and PDF export dialog (`window.print()`).
- **Reveal in File Tree**: Automatically expands parent folders and highlights the active file in the sidebar.
- **Show in System Explorer / Open in Default App**: Reveals the file in Windows Explorer or macOS Finder, or opens it with your operating system's default markdown reader.
- **Copy Path Submenu**: Copies the note title, vault-relative path, absolute filesystem path, or Wikilink syntax (`[[Note Title]]`) directly to your clipboard.

## 2. In-Editor Find & Replace (`Ctrl+F` / `Ctrl+H`)
---

Noether features a dedicated in-editor Find & Replace bar for targeted document navigation:

- **Find (`Ctrl+F`)**: Opens the search bar anchored at the top of the editor. If text is already highlighted in your note, it automatically pre-populates the search query.
- **Find & Replace (`Ctrl+H`)**: Expands the bar to show the Replace input field.
- **Match Navigation**: Shows a live match counter (e.g. `3 of 12`). Press `Enter` or `↓` to jump to the next match, and `Shift+Enter` or `↑` to jump to the previous match.
- **Case Matching (`Aa`)**: Toggle strict case sensitivity for exact casing matches.
- **Batch Replacement**: Click **Replace** to substitute the active match, or **Replace All** to update all occurrences across the document in a single atomic transaction.
- **Dismissal**: Press `Esc` to close the search bar, clearing all active highlights and returning focus to your cursor position.

## 3. Formatting & Keyboard Shortcuts
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
| **Task Checklist** | `- [ ] Task` | `Ctrl+Shift+9` or `Ctrl+Enter` |
| **Blockquote** | `> Quote` | `Ctrl+Shift+.` |
| **Horizontal Rule** | `---` | Auto-converted on `Enter` |
| **Wikilink** | `[[Note Title]]` | Type `[[` |
| **Embed Wikilink** | `![[File.pdf]]` or `![[Image.png]]` | Type `![[` |

### Auto-Pairing Characters

Typing opening characters like `(`, `[`, `{`, `"`, or `` ` `` around selected text automatically wraps the selection. You can toggle auto-pairing behavior in **Settings (`Ctrl+,`) → Editor**.

## 4. Visual Math Keyboard & LaTeX ($KaTeX$)
---

Noether includes comprehensive mathematical typesetting powered by KaTeX and interactive MathLive chips:

- **Inline Math**: Wrap expressions in single dollar signs: `$E = mc^2$` renders as $E = mc^2$.
- **Display Math Blocks**: Wrap multi-line formulas in double dollar signs:

```latex
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

### Interactive MathLive Chips & Visual Math Keyboard

When you click on any math formula in Live Preview, Noether opens the **MathLive Chip Editor** for visual LaTeX editing without raw syntax friction.

For fast symbol discovery, click the math keyboard icon or trigger the **Visual Math Keyboard**, which features 4 specialized symbol categories:

1. **`123` (Arithmetic & Calculus)**: Numbers, fractions, exponents, square roots, integrals ($\int$), summations ($\sum$), limits ($\lim$), logarithms, and trigonometric functions ($\sin, \cos, \tan$).
2. **`∞≠∈` (Symbols & Logic)**: Set theory ($\cap, \cup, \subset, \in$), relational operators ($\neq, \leq, \geq, \approx$), logical connectives ($\land, \lor, \implies, \iff$), and directional arrows ($\rightarrow, \Rightarrow$).
3. **`abc` (Algebraic Variables)**: Standard algebraic characters and variables.
4. **`αβγ` (Greek Alphabet)**: Complete Greek typography ($\alpha, \beta, \gamma, \delta, \theta, \lambda, \mu, \pi, \sigma, \omega, \Delta, \Omega$).

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

## 5. Tables, Grid Picker & Edge Controls
---

Noether provides full interactive control over Markdown tables:

```markdown
| Feature | Status | Priority |
| :--- | :--- | :--- |
| Editor | Active | High |
| Canvas | Active | Medium |
```

- **Interactive Table Grid Picker**: Typing `/table` opens an interactive grid selector. Hover over the grid to select matrix dimensions (e.g. 4x3) before inserting.
- **Table Edge Controls**: Hovering over the right border of any table reveals a `+ Col` button; hovering over the bottom border reveals a `+ Row` button for instant one-click row or column insertion.
- **Floating Table Toolbar**: Selecting any table cell displays a contextual floating toolbar:
  - Add Row Above (`+ Row ↑`) / Add Row Below (`+ Row ↓`) / Delete Row (`- Row`)
  - Add Column Left (`+ Col ←`) / Add Column Right (`+ Col →`) / Delete Column (`- Col`)
  - Toggle Header Row / Delete Entire Table
- **Drag Column Resizing**: Hover over any column border and drag horizontally to customize cell widths.
- **Keyboard Navigation**: Press `Tab` to advance to the next cell (automatically creating a new row when pressed in the bottom-right cell), or `Shift+Tab` to step backward.

## 6. Image Lightbox & Media Viewer
---

Clicking any embedded image in Live Preview or Reading View opens the full-screen **Image Lightbox**:

- **Cursor-Centered Zoom**: Scroll your mouse wheel or use trackpad pinch gestures to zoom smoothly up to 25x magnification centered precisely at your mouse cursor.
- **Keyboard Zoom**: Press `+` or `=` to zoom in, `-` or `_` to zoom out, and `0` to reset instantly to 1x centered fit.
- **Pan Physics**: Click and drag to pan across high-resolution diagrams. Alternatively, use keyboard arrow keys (`↑`, `↓`, `←`, `→`), holding `Shift` for accelerated 100px panning.
- **Double-Click Magnification**: Double-clicking anywhere on the image toggles between 1x centered fit and 2x zoom at the cursor coordinates.
- **Clean Header & Dismissal**: Displays the image filename in the top bar with a close button (`✕`). Press `Esc` or click the darkened backdrop to exit.

## 7. Callouts
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

## 8. Slash Commands
---

Type `/` on any blank line to open the slash command menu:

- `/heading 1..3`: Insert Markdown headings
- `/table`: Open interactive table grid picker
- `/callout`: Insert structured callout box
- `/math`: Insert LaTeX display formula block
- `/code`: Insert syntax-highlighted code block
- `/task`: Insert checklist task item
