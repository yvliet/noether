# Live Preview Editor & Markdown

Noether features an advanced, high-performance **Live Preview editor** engineered on top of TipTap 2.x and ProseMirror. It combines the tactile immediacy of WYSIWYG editing with the durability and portability of plain-text CommonMark.

Noether coordinates the editor through an immediate memory-to-disk pipeline: **TipTap / ProseMirror Layer** (active in-memory state with sub-8ms transaction mapping) → **Debounced Persistence Engine** (300ms save debounce with AST metadata extraction) → **Universal Plain CommonMark Storage** (authoritative `.md` on disk).

## 1. Live Preview vs. Source Mode

---

Noether provides two synchronized editing experiences:

1. **Live Preview (Default)**: Markdown formatting renders interactively as you type. Syntax tokens (such as `**bold**`, `# heading`, or `$...$`) seamlessly transform into styled visual elements while remaining editable in place when the cursor enters the text range.
2. **Source Mode**: Raw, unrendered CommonMark text with monospaced typography, ideal for batch editing frontmatter, macro manipulation, or structural diff review.

You can switch between modes anytime using the document options menu (`...` in the top right) or via the Command Palette (`Ctrl+K` → *Toggle Source Mode*).


## 2. Typing Performance & Decoration Mapping

---

Many web-based editors suffer from severe input lag when opening documents exceeding 20,000 words. Noether guarantees a **sub-8ms input latency** on documents of 100,000+ words through a series of systems-level invariants:

- **$O(1)$ Transaction Mapping**: Rather than re-parsing the entire document AST on every keystroke, Noether maps active decorations through ProseMirror transaction steps (`DecorationSet.map`).
- **Dirty-Range AST Scans**: Only modified textblocks and immediate parent containers are re-scanned for inline tokens, wikilinks, and tags.
- **Formula Memoization**: KaTeX rendering trees are cached in an LRU memory buffer, preventing repetitive LaTeX parsing during cursor movement.
- **Bounded Undo History**: ProseMirror history depth is bounded to 50 snapshots to maintain a lean, constant-size memory working set.


## 3. Formatting & Keyboard Shortcuts

---

Noether supports standard CommonMark syntax and intuitive desktop shortcuts:

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

- **Brackets and Quotes**: Enabled by default under **Settings → Editor → Auto-pair brackets and quotes**.
- **Math Formulas**: Disabled by default under **Settings → Editor → Auto-pair math formulas**. When disabled, typing a single `$` inserts a literal dollar sign so currency and prices like `$100` or `$50/mo` never accidentally trigger math mode, while typing double dollars (`$$`) still creates a math formula. When enabled, typing a single `$` immediately wraps selections or opens interactive math editing.
- **Dollars Inside Math**: When inside a math formula, typing `\$` or pressing `Alt+$` inserts a literal dollar sign (`\$`) directly into the formula without exiting. Typing `$` while the cursor is positioned inside existing formula content also inserts `\$`.
- **Excess Dollars**: Typing `$` repeatedly escalates from inline math (`$`) to block math (`$$`), and typing a third `$` de-escalates out of math back into literal `$$$` text.

### Smart Indentation
- Pressing `Tab` inside a bullet or numbered list nests the item under its parent.
- Pressing `Shift+Tab` unindents the list item.
- Pressing `Enter` on an empty list item breaks out of the list back to standard paragraph text.


## 4. Slash Commands Menu (`/`)

---

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


## 5. Mathematical Formulas & KaTeX

---

Noether provides deep mathematical typesetting with both inline and multi-line display equations powered by KaTeX and MathLive.

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
When you click on a math formula chip, Noether opens an interactive **MathLive On-Screen Keyboard** featuring:
- Greek symbols ($\alpha, \beta, \gamma, \theta, \lambda, \sigma, \omega$)
- Calculus operators ($\int, \frac{d}{dx}, \sum, \prod, \lim$)
- Matrix builders ($2\times 2$, $3\times 3$)
- Logic and set notation ($\in, \subset, \forall, \exists, \land, \lor$)

Formulas render with instant mathematical typesetting while preserving the raw LaTeX code directly in your markdown file.


## 6. Interactive Visual Tables

---

Noether features a fully visual table editing engine that eliminates the friction of hand-formatting raw ASCII markdown tables.

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


## 7. Callouts & Alerts
---

Noether delivers native support for Obsidian-compatible callouts, allowing you to highlight, organize, and fold structured information directly within your notes. Callouts render with crisp left borders (`border-l-[3px]`), subtle 10% tinted background fills, uppercase badges, icons, and interactive collapsible fold toggles.

### Basic Syntax

A callout begins with a standard Markdown blockquote prefix (`> `), followed immediately by `[!type]` on the first line:

```markdown
> [!note]
> This is a general informational callout box.

> [!tip] Custom Title Here
> Callouts support optional custom titles on the header line.
```

When editing in Live Preview, Noether smoothly conceals the raw `> [!type]` markers and displays the themed badge and icon widget. Placing your cursor directly on the header reveals the dimmed Markdown syntax for inline editing.

### Built-in Callout Types

Noether supports all 13 canonical callout types and their recognized aliases:

| Callout Type | Aliases | Accent Color | Intended Usage |
| :--- | :--- | :--- | :--- |
| `note` | | Blue (`#3b82f6`) | General contextual notes and informational summaries |
| `abstract` | `summary`, `tldr` | Cyan (`#06b6d4`) | Executive summaries, abstracts, and TL;DR overviews |
| `info` | | Sky Blue (`#0284c7`) | Supplemental reference details and background facts |
| `todo` | | Sky Blue (`#0ea5e9`) | Checklists, next steps, and action items |
| `tip` | `hint`, `important` | Emerald (`#10b981`) | Helpful advice, optimization tips, and best practices |
| `success` | `check`, `done` | Green (`#22c55e`) | Positive outcomes, verified steps, and completed goals |
| `question` | `help`, `faq` | Amber (`#f59e0b`) | Open inquiries, FAQs, and items requiring clarification |
| `warning` | `caution`, `attention` | Amber (`#f59e0b`) | Potential pitfalls, risks, and breaking changes to avoid |
| `failure` | `fail`, `missing` | Rose (`#f43f5e`) | Unmet criteria, failed tests, or missing dependencies |
| `danger` | `error` | Red (`#ef4444`) | Destructive operations, data loss risks, and errors |
| `bug` | | Orange (`#d94338`) | Software defects, regressions, and unintended behavior |
| `example` | | Purple (`#8b5cf6`) | Practical examples, sample code, and walkthroughs |
| `quote` | `cite` | Slate (`#9ca3af`) | Highlighted citations, quotes, and excerpts |

### Collapsible Callouts

Add a `+` or `-` modifier directly after the callout type identifier to make it collapsible:

- `> [!type]+ Title`: Foldable callout that is **expanded** by default.
- `> [!type]- Title`: Foldable callout that is **collapsed** by default.

```markdown
> [!tip]+ Expandable Performance Tip
> This content is open on initial document load.
> Click the fold chevron in the header to collapse it.

> [!danger]- Hidden High-Risk Operations
> This content is collapsed by default to save vertical space.
> Click the fold chevron to reveal the dangerous commands.
```

Fold states expand and collapse immediately on click, keeping note navigation fast and responsive.

### Nested Callouts

Nest callouts inside other callouts or blockquotes by increasing the blockquote depth (`>> `):

```markdown
> [!note] Parent Architecture Plan
> High-level system overview.
>
>> [!warning] Security Boundary
>> Do not expose internal port 8080 directly to public networks.
```

### Keyboard & Slash Commands

- **Slash Commands**: Type `/callout` in the editor to open the Callout Types submenu, or type direct shortcuts like `/tip`, `/warning`, `/todo`, `/info`, or `/note` to insert specific callouts immediately.
- **Enter Continuation**: Pressing `Enter` inside a callout automatically continues the `>` prefix on the next line. Pressing `Enter` on an empty `>` line cleanly exits the callout.
- **Tab Indentation**: Pressing `Tab` at the beginning of a callout line increases nesting (`>` → `>>`), while `Shift+Tab` decreases nesting (`>>` → `>`).

### Custom CSS Theming

You can customize individual callout types or create custom types using CSS snippets in your vault:

```css
[data-callout="my-custom-type"] {
  --callout-border: #8b5cf6;
  --callout-bg: rgba(139, 92, 246, 0.1);
  --callout-text: #a78bfa;
}
```


## 8. Media & Document Embeds

---

Noether supports embedding local attachments and cross-document transclusions using the `![[...]]` syntax:

- **Images**: `![[diagram.png]]` or `![Alt text](assets/diagram.png)`
- **Audio**: `![[interview.mp3]]` renders an inline HTML5 audio player.
- **Video**: `![[walkthrough.mp4]]` renders an interactive video player.
- **PDF Documents**: `![[whitepaper.pdf]]` renders an embedded viewer pane.
- **Note Transclusions**: `![[Architecture Overview]]` embeds the live content of another note directly inside the active document.


## 9. Intelligent Web Clip Cleaner

---

Copying content from Wikipedia, research papers, or web articles often clutters notes with unwanted citation brackets (e.g. `[1]`, `[citation needed]`) and messy HTML inline tags.

Noether includes an **Intelligent Paste Pipeline**:
- Automatically strips numeric reference links (`[1]`, `[12]`, `[cite]`).
- Converts rich HTML tables, headers, and bullet lists into clean CommonMark.
- Preserves code fences with correct syntax language tags.
- Removes tracking query parameters from pasted URLs.


## 10. Hierarchical Folding

---

To keep extensive notes organized and navigable:
- Hover over any heading (`# H1` through `###### H6`) or list item to reveal the **fold chevron** (`▾`).
- Click the chevron to collapse the entire section beneath it.
- An ellipsis badge (`...`) appears when folded; clicking it expands the section immediately.
- Fold states are managed through non-destructive ProseMirror mapped decorations, ensuring the underlying markdown file remains completely intact.
