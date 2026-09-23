# Basic Formatting

Noether supports standard CommonMark markdown formatting, quick keyboard shortcuts, and slash commands.

## 1. Text Styling & Shortcuts
---

Format text quickly using standard Markdown syntax or familiar desktop hotkeys:

| Style | Markdown Syntax | Keyboard Shortcut |
| :--- | :--- | :--- |
| **Bold** | `**text**` or `__text__` | `Ctrl+B` |
| *Italic* | `*text*` or `_text_` | `Ctrl+I` |
| ~~Strikethrough~~ | `~~text~~` | `Ctrl+Shift+X` |
| ==Highlight== | `==text==` | `Ctrl+Shift+H` |
| `Inline Code` | `` `code` `` | `Ctrl+E` |
| **Heading 1 to 6** | `# H1` through `###### H6` | `Ctrl+Alt+1` ... `6` |
| **Blockquote** | `> Quote` | `Ctrl+Shift+.` |
| **Divider Line** | `---` | Auto-converted on `Enter` |

### Auto-Pairing Characters

Typing opening characters like `(`, `[`, `{`, `"`, or `` ` `` around highlighted text automatically wraps the selection. You can toggle auto-pairing on or off in **Settings (`Ctrl+,`) → Editor**.

## 2. Lists & Checklists
---

Create clean lists by typing standard markers at the start of any line:

- **Bullet Lists**: Type `- ` or `* ` followed by a space (shortcut: `Ctrl+Shift+8`).
- **Numbered Lists**: Type `1. ` followed by a space (shortcut: `Ctrl+Shift+7`).
- **Task Checklists**: Type `- [ ] ` to create an interactive task checkbox (shortcut: `Ctrl+Shift+9` or `Ctrl+Enter`).
  - Clicking any checkbox marks it complete: `- [x]`.
  - All checklist items across your vault are aggregated automatically in the [[Tasks]] extension.

Press `Tab` to indent a list item deeper, or `Shift+Tab` to step back. Pressing `Enter` on an empty list item exits list mode.

## 3. Wikilinks & Embeds
---

Connect your thoughts and reference vault files directly in text:

- **Internal Note Link**: Type `[[` to open the link suggester. Selecting a note creates a link: `[[Note Title]]`. You can also provide a custom display alias: `[[Note Title|Custom Label]]`.
- **File & Media Embed**: Type `![[` to embed images, PDFs, or note cards: `![[diagram.png]]` or `![[paper.pdf]]`.
- **Links to Headings**: Link directly to a specific section within a note using `#`: `[[Note Title#Section Heading]]`.

Clicking any wikilink opens that note immediately. Hovering over a wikilink shows a floating preview of the destination note.

## 4. Slash Commands (`/`)
---

Type `/` on any blank line to open the quick-insert menu:

- `/heading 1..3`: Insert Markdown headings
- `/bullet`: Insert bulleted list
- `/number`: Insert numbered list
- `/task`: Insert checklist task item
- `/quote`: Insert blockquote
- `/code`: Insert syntax-highlighted code block
- `/math`: Insert LaTeX display formula block (see [[Math & LaTeX]])
- `/table`: Open interactive table grid picker (see [[Tables]])
- `/callout`: Insert structured callout box (see [[Callouts]])

## 5. Next Steps
---

- Write mathematical equations with [[Math & LaTeX]].
- Organize data with [[Tables]].
- Add highlight callouts with [[Callouts]].
- Review all global shortcuts in [[Keyboard Shortcuts & Commands]].
