# Keyboard Shortcuts & Command Palette

Noether is designed for keyboard-driven focus. You can navigate between files, execute commands, split editor panes, and format notes without lifting your hands from the keyboard.

## 1. The Command Palette (`Ctrl+K` / `Cmd+K`)
---

The **Command Palette** is your central cockpit in Noether.

- Press `Ctrl+K` (or `Cmd+K` on macOS) from anywhere in the app. Unlike traditional text editors, `Ctrl+K` is universal in Noether: it always opens the command launcher immediately, even while actively typing in the Markdown editor.
- **Recent Notes**: On opening with an empty search bar, the palette immediately surfaces your 5 most recently edited notes for quick switching.
- **Instant File Search**: Type any word to match notes instantly by title or folder path, or search across note bodies via FTS5 full-text indexing.
- **Actionable Stateful Verbs**: Ambiguous "Toggle" labels are replaced with dynamic verbs indicating actual state (`Collapse left sidebar` ↔ `Expand left sidebar`, `Exit fullscreen` ↔ `Enter fullscreen`, `Switch to reading view` ↔ `Switch to editing view`). All stateful commands maintain search aliases, so typing "toggle" continues to match all of them.
- **In-Document Operations**: All slash formatting operations (`Heading 1..6`, `Bullet list`, `Task list`, `Insert table`, `Insert callout`, `Insert math block`) can be executed directly from the palette. Commands that require a Markdown document are context-aware and safely disabled outside active documents.
- Use `↑` and `↓` arrow keys to navigate options (disabled items are automatically skipped), and press `Enter` to open notes or execute commands.

```
> Type a command or search...
  • Notes/Architecture/Dual-Storage Architecture
  • Notes/Extensions/Extension Quick Start
  • Collapse left sidebar (Ctrl+\)
  • Open graph view (Ctrl+G)
  • Insert table
  • Switch to reading view (Ctrl+E)
```

## 2. Navigation & Workspace Shortcuts
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Command Palette / Quick Open** | `Ctrl+K` or `Ctrl+O` | `Cmd+K` or `Cmd+O` |
| **Collapse / Expand Left Sidebar** | `Ctrl+\` | `Cmd+\` |
| **Collapse / Expand Right Sidebar** | `Ctrl+Shift+\` | `Cmd+Shift+\` |
| **Switch Active Vault** | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| **Vault-Wide Full-Text Search** | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| **Open Settings Window** | `Ctrl+,` | `Cmd+,` |
| **Open Help & Shortcuts Guide** | `F1` | `F1` |
| **Toggle Fullscreen Window** | `F11` | `F11` |
| **Reload Window** | `Ctrl+R` | `Cmd+R` |

## 3. Tabs & Split Editor Panes
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **New Note Tab** | `Ctrl+T` | `Cmd+T` |
| **Close Active Tab** | `Ctrl+W` | `Cmd+W` |
| **Next Tab** | `Ctrl+Tab` | `Ctrl+Tab` |
| **Previous Tab** | `Ctrl+Shift+Tab` | `Ctrl+Shift+Tab` |
| **Jump to Tab 1 through 8** | `Ctrl+1` ... `Ctrl+8` | `Cmd+1` ... `Cmd+8` |
| **Jump to Last Tab** | `Ctrl+9` | `Cmd+9` |
| **Navigate Back in Note History** | `Alt+←` | `Cmd+[` |
| **Navigate Forward in Note History** | `Alt+→` | `Cmd+]` |
| **Split / Close Split Editor Pane** | `Ctrl+Alt+\` | `Cmd+Alt+\` |

## 4. Editing & Text Formatting
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Create New Note** | `Ctrl+N` | `Cmd+N` |
| **Save Active Note Immediately** | `Ctrl+S` *(auto-saved)* | `Cmd+S` *(auto-saved)* |
| **Toggle Bold Text** | `Ctrl+B` | `Cmd+B` |
| **Toggle Italic Text** | `Ctrl+I` | `Cmd+I` |
| **Toggle Strikethrough** | `Ctrl+Shift+X` | `Cmd+Shift+X` |
| **Toggle Highlight** | `Ctrl+Shift+H` | `Cmd+Shift+H` |
| **Inline Code Span** | `Ctrl+E` *(in edit mode)* | `Cmd+E` *(in edit mode)* |
| **Heading Levels 1 to 6** | `Ctrl+Alt+1` ... `Ctrl+Alt+6` | `Cmd+Alt+1` ... `Cmd+Alt+6` |
| **Paragraph / Plain Text** | `Ctrl+Alt+0` | `Cmd+Alt+0` |
| **Insert Task Item Checkbox** | `Ctrl+Shift+9` | `Cmd+Shift+9` |
| **Insert Bullet List** | `Ctrl+Shift+8` | `Cmd+Shift+8` |
| **Insert Numbered List** | `Ctrl+Shift+7` | `Cmd+Shift+7` |
| **Insert Blockquote** | `Ctrl+Shift+.` | `Cmd+Shift+.` |
| **Trigger Slash Commands Menu** | `/` | `/` |
| **Trigger Wikilink Autocomplete** | `[[` | `[[` |
| **Smart List Indent / Unindent** | `Tab` / `Shift+Tab` | `Tab` / `Shift+Tab` |

## 5. View Launchers & Extensions
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Open 2D Knowledge Graph** | `Ctrl+G` | `Cmd+G` |
| **Open Today's Journal Note** | `Ctrl+Shift+D` | `Cmd+Shift+D` |
| **Bookmark Active Note** | `Ctrl+Shift+B` | `Cmd+Shift+B` |
| **Toggle Drawing Overlay** | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| **New Spatial Canvas** | Command Palette | Command Palette |
| **Open Tasks Dashboard** | Command Palette | Command Palette |
| **Browse Extension Marketplace** | Command Palette | Command Palette |

## 6. Window Zoom & Display Scaling
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Zoom In** | `Ctrl+=` | `Cmd+=` |
| **Zoom Out** | `Ctrl+-` | `Cmd+-` |
| **Reset Zoom (100%)** | `Ctrl+0` | `Cmd+0` |

## 7. Noether Sketch (Drawing & Markup Overlay)
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Toggle Drawing Overlay** | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| **Select & Move Mode** | `V` | `V` |
| **Pen Tool** | `B` or `P` | `B` or `P` |
| **Highlighter Tool** | `H` | `H` |
| **Eraser Tool** | `E` | `E` |
| **Undo Drawing Stroke** | `Ctrl+Z` | `Cmd+Z` |
| **Redo Drawing Stroke** | `Ctrl+Y` or `Ctrl+Shift+Z` | `Cmd+Y` or `Cmd+Shift+Z` |
| **Delete Selected Drawings** | `Delete` or `Backspace` | `Delete` or `Backspace` |
| **Deselect / Close Toolbar** | `Escape` | `Escape` |

## 8. Hotkeys Management & Settings Deep Search
---

All shortcuts and preferences can be browsed, searched, and customized in **Settings** (`Ctrl+,` or `Cmd+,`):

### Customizing Shortcuts
- Navigate to **Settings → Hotkeys** to review keyboard shortcuts for every command.
- Click any command's shortcut button and press your desired key combination (e.g. `Ctrl+Shift+K`) to reassign it immediately.
- Use the reset button next to any customized shortcut or click **Reset all** to restore default shortcuts.

### Deep Settings Search
- Use the search bar (`Search settings...`) at the top of the sidebar to query across all settings tabs simultaneously.
- While typing or focused on the search input, the right pane displays the **all-occurrences view**, grouping results by Tab Name (H3) and Location/Section (subtitle) with matched terms highlighted in your active accent color.
- All controls (toggles, selects, sliders) remain interactive directly within search results.
- Clicking any category tab opens that tab without clearing your search query, preserving term highlights.
- Refocusing or clicking into the search bar clears category tab selection and restores the all-occurrences view.
- Clear the query anytime by pressing `Escape` or clicking the clear icon.

