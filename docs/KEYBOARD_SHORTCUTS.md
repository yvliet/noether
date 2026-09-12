# Noether Keyboard Shortcuts Reference

A comprehensive, categorized reference for all keyboard shortcuts, command palette controls, and document operations in Noether.

## 1. Command Palette & Global Controls
---

The Command Palette is the universal launcher in Noether for file switching, view modes, and workspace actions.

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Command Palette / Quick Open** | `Ctrl+K` or `Ctrl+O` | `Cmd+K` or `Cmd+O` |
| **Open Help & Shortcuts Guide** | `F1` | `F1` |
| **Open Settings Window** | `Ctrl+,` | `Cmd+,` |
| **Switch Active Vault Workspace** | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| **Vault-Wide Full-Text Search** | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| **Toggle Fullscreen Window** | `F11` | `F11` |
| **Reload Window** | `Ctrl+R` | `Cmd+R` |

> [!NOTE]
> `Ctrl+K` works universally across the entire application, even while actively typing in the Markdown editor. It launches the Command Palette instantly without inserting markdown link boilerplate into your note.

## 2. Sidebars & Workspace Layout
---

Sidebar and panel commands are stateful in Noether. In the Command Palette, their titles update dynamically based on the current workspace state while remaining searchable via `toggle` keywords.

| Action | Dynamic Command Label | Windows / Linux | macOS |
| :--- | :--- | :--- | :--- |
| **Left Sidebar (File Tree)** | `Collapse left sidebar` ↔ `Expand left sidebar` | `Ctrl+\` | `Cmd+\` |
| **Right Sidebar (Backlinks/Outline)** | `Collapse right sidebar` ↔ `Expand right sidebar` | `Ctrl+Shift+\` | `Cmd+Shift+\` |
| **Split Editor Pane** | `Close split editor pane` ↔ `Split editor pane` | `Ctrl+Alt+\` | `Cmd+Alt+\` |
| **Reading View Toggle** | `Switch to editing view` ↔ `Switch to reading view` | `Ctrl+E` | `Cmd+E` |
| **Source Mode Toggle** | `Switch to live preview` ↔ `Switch to source mode` | `Ctrl+Alt+S` | `Cmd+Alt+S` |

## 3. Tabs Navigation
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **New Note Tab** | `Ctrl+T` | `Cmd+T` |
| **Close Active Tab** | `Ctrl+W` | `Cmd+W` |
| **Next Tab** | `Ctrl+Tab` | `Ctrl+Tab` |
| **Previous Tab** | `Ctrl+Shift+Tab` | `Ctrl+Shift+Tab` |
| **Go to Tab 1 through 8** | `Ctrl+1` ... `Ctrl+8` | `Cmd+1` ... `Cmd+8` |
| **Go to Last Tab** | `Ctrl+9` | `Cmd+9` |
| **Navigate Back in Note History** | `Alt+←` | `Cmd+[` |
| **Navigate Forward in Note History** | `Alt+→` | `Cmd+]` |

## 4. Note Creation & Editing
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Create New Note** | `Ctrl+N` | `Cmd+N` |
| **Save Document Immediately** | `Ctrl+S` *(auto-saved)* | `Cmd+S` *(auto-saved)* |
| **Trigger Slash Commands Menu** | `/` | `/` |
| **Trigger Wikilink Autocomplete** | `[[` | `[[` |
| **Toggle Bold Formatting** | `Ctrl+B` | `Cmd+B` |
| **Toggle Italic Formatting** | `Ctrl+I` | `Cmd+I` |
| **Toggle Strikethrough** | `Ctrl+Shift+X` | `Cmd+Shift+X` |
| **Toggle Text Highlight** | `Ctrl+Shift+H` | `Cmd+Shift+H` |
| **Heading Levels 1 through 6** | `Ctrl+Alt+1` ... `Ctrl+Alt+6` | `Cmd+Alt+1` ... `Cmd+Alt+6` |
| **Paragraph / Normal Text** | `Ctrl+Alt+0` | `Cmd+Alt+0` |
| **Insert Checklist Task Item** | `Ctrl+Shift+9` | `Cmd+Shift+9` |
| **Insert Bulleted List** | `Ctrl+Shift+8` | `Cmd+Shift+8` |
| **Insert Numbered List** | `Ctrl+Shift+7` | `Cmd+Shift+7` |
| **Insert Blockquote** | `Ctrl+Shift+.` | `Cmd+Shift+.` |
| **Indent List Item** | `Tab` | `Tab` |
| **Unindent List Item** | `Shift+Tab` | `Shift+Tab` |

## 5. File Operations History
---

These shortcuts manage file-level mutations across your vault separate from in-editor text undo.

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Undo File Action** *(restore deleted or renamed file)* | `Ctrl+Alt+Z` | `Cmd+Alt+Z` |
| **Redo File Action** | `Ctrl+Alt+Y` | `Cmd+Alt+Y` |

## 6. Extension Shortcuts & Launchers
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Open Knowledge Graph** | `Ctrl+G` | `Cmd+G` |
| **Open Today's Journal** | `Ctrl+Shift+D` | `Cmd+Shift+D` |
| **Bookmark Active Note** | `Ctrl+Shift+B` | `Cmd+Shift+B` |
| **Toggle Vector Drawing Overlay** | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| **Insert Table** | Slash `/table` or Command Palette | Slash `/table` or Command Palette |
| **Open Tasks Dashboard** | Command Palette | Command Palette |
| **Browse Extension Marketplace** | Command Palette | Command Palette |

## 7. Window Zoom & Display Controls
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Zoom In** | `Ctrl+=` | `Cmd+=` |
| **Zoom Out** | `Ctrl+-` | `Cmd+-` |
| **Reset Zoom to 100%** | `Ctrl+0` | `Cmd+0` |

## 8. Hotkeys Management & Settings Deep Search
---

All shortcuts can be remapped and managed in **Settings** (`Ctrl+,` or `Cmd+,`):

- **Customize Hotkeys**: In **Settings → Hotkeys**, select any command and press your desired key combination (e.g. `Ctrl+Shift+K`) to reassign it immediately.
- **Reset to Defaults**: Click the reset button next to any customized hotkey to restore default assignments, or use **Reset all** to restore all defaults.
- **Deep Settings Search**: Search any command or setting name in the search bar. The all-occurrences view groups results by tab and section with active accent highlighting.
- **Quick Search Clear**: Press `Escape` while focused on the settings search bar to clear your search query.

