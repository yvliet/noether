# Keyboard Shortcuts & Commands

Noether is designed for fast, keyboard-driven navigation. You can open files, execute commands, split panes, and format text without taking your hands off the keyboard.

## 1. The Command Palette (`Ctrl+K`)
---

The Command Palette is your central command launcher:

- Press `Ctrl+K` (or `Cmd+K` on macOS) from anywhere in the app.
- **Recent Notes**: Surfaces your recently edited notes when the input is empty.
- **Instant Search**: Type any text to match note titles, paths, or full-text content.
- **Execute Actions**: Type action names (e.g. `New canvas`, `Open settings`, `Toggle split pane`) and press `Enter`.
- Use `↑` and `↓` arrow keys to navigate the list.

## 2. Navigation & File Tree Shortcuts
---

Manage files and folders in the left sidebar with instant keyboard controls:

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Command Palette / Quick Open** | `Ctrl+K` or `Ctrl+O` | `Cmd+K` or `Cmd+O` |
| **New Note** | `Ctrl+N` | `Cmd+N` |
| **Copy Selected File(s) or Folder(s)** | `Ctrl+C` | `Cmd+C` |
| **Cut Selected File(s) or Folder(s)** | `Ctrl+X` | `Cmd+X` |
| **Paste Item(s) or Ingest OS Files** | `Ctrl+V` | `Cmd+V` |
| **Duplicate Note or Folder** | `Ctrl+D` | `Cmd+D` |
| **Inline Rename Selected Item** | `F2` | `F2` or `Enter` |
| **Open Note / Toggle Folder Expand** | `Enter` | `Enter` |
| **Expand Folder / Jump to First Child** | `ArrowRight` (`→`) | `ArrowRight` (`→`) |
| **Collapse Folder / Jump to Parent** | `ArrowLeft` (`←`) | `ArrowLeft` (`←`) |
| **Jump to First / Last Visible Item** | `Home` / `End` | `Home` / `End` |
| **Multi-Select Contiguous Range** | `Shift+ArrowUp` / `Shift+ArrowDown` | `Shift+ArrowUp` / `Shift+ArrowDown` |
| **Move Selected Item(s) to Trash** | `Delete` or `Backspace` | `Backspace` |
| **Toggle Left Sidebar** | `Ctrl+\` | `Cmd+\` |
| **Toggle Right Sidebar** | `Ctrl+Shift+\` | `Cmd+Shift+\` |
| **Vault-Wide Search** | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| **Open Help Window** | `F1` | `F1` |
| **Open Settings Window** | `Ctrl+,` | `Cmd+,` |
| **Switch Vault** | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| **Toggle Fullscreen** | `F11` | `F11` |

## 3. Tabs & Split Panes
---

Manage your open workspaces, panes, and note buffers:

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **New Tab** | `Ctrl+T` | `Cmd+T` |
| **Close Active Tab** | `Ctrl+W` | `Cmd+W` |
| **Next Tab** | `Ctrl+Tab` | `Ctrl+Tab` |
| **Previous Tab** | `Ctrl+Shift+Tab` | `Ctrl+Shift+Tab` |
| **Jump to Tab 1..8** | `Ctrl+1` ... `Ctrl+8` | `Cmd+1` ... `Cmd+8` |
| **Jump to Last Tab** | `Ctrl+9` | `Cmd+9` |
| **Split Editor Pane** | `Ctrl+Alt+\` | `Cmd+Alt+\` |
| **Back in History** | `Alt+←` | `Cmd+[` |
| **Forward in History** | `Alt+→` | `Cmd+]` |

### Tab Context Menu Actions (Right-Click Tab)

| Action | Description |
| :--- | :--- |
| **Pin tab / Unpin tab** | Locks the tab to the left edge of the tab strip, hiding the close button and shielding it from bulk close actions. |
| **Duplicate tab** | Clones the note buffer directly into an adjacent tab in the current pane strip. |
| **Close tab** | Closes the clicked tab buffer (`Ctrl+W`). |
| **Close tabs to the right** | Closes all unpinned tabs positioned to the right of the active tab. |
| **Close tabs to the left** | Closes all unpinned tabs positioned to the left of the active tab. |
| **Close other tabs** | Closes all unpinned tabs in the current pane except the active tab. |
| **Close all tabs** | Closes all unpinned tabs in the current pane. |
| **Split right / Split down** | Splits the current workspace pane horizontally or vertically with the active note. |
| **Copy relative path** | Copies the vault-relative path to your clipboard (e.g. `Research/Notes.md`). |
| **Copy absolute path** | Copies the full filesystem path to your clipboard. |
| **Copy note link (Wikilink)** | Copies `[[Note Title]]` link to your clipboard for instant pasting. |

## 4. Editing & Text Formatting
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Duplicate Active Note** | `Ctrl+D` | `Cmd+D` |
| **Bold** | `Ctrl+B` | `Cmd+B` |
| **Italic** | `Ctrl+I` | `Cmd+I` |
| **Strikethrough** | `Ctrl+Shift+X` | `Cmd+Shift+X` |
| **Highlight** | `Ctrl+Shift+H` | `Cmd+Shift+H` |
| **Inline Code** | `Ctrl+E` | `Cmd+E` |
| **Headings 1..6** | `Ctrl+Alt+1` ... `6` | `Cmd+Alt+1` ... `6` |
| **Bullet List** | `Ctrl+Shift+8` | `Cmd+Shift+8` |
| **Numbered List** | `Ctrl+Shift+7` | `Cmd+Shift+7` |
| **Task Checklist** | `Ctrl+Shift+9` | `Cmd+Shift+9` |
| **Toggle Task State** | `Ctrl+Enter` | `Cmd+Enter` |
| **Blockquote** | `Ctrl+Shift+.` | `Cmd+Shift+.` |

## 5. PDF Viewer & Presentation Mode
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Toggle Presentation Mode** | `Alt+P` | `Option+P` |
| **Next Slide / Page** | `→` / `Space` / `PageDown` | `→` / `Space` / `PageDown` |
| **Previous Slide / Page** | `←` / `PageUp` | `←` / `PageUp` |
| **Zoom In** | `+` / `Ctrl++` | `+` / `Cmd++` |
| **Zoom Out** | `-` / `Ctrl+-` | `-` / `Cmd+-` |
| **Reset Zoom (1x Fit)** | `0` | `0` |
| **Toggle 1x / 2x Zoom** | `Double Click` | `Double Click` |
| **Pan Slide (when zoomed)** | `Click & Drag` | `Click & Drag` |
| **Exit Presentation** | `Esc` | `Esc` |
| **Fit to Width** | `Ctrl+0` | `Cmd+0` |
| **Rotate 90° Clockwise** | `Ctrl+Alt+R` | `Cmd+Option+R` |

## 6. Extension Hotkeys
---

| Extension | Shortcut | Action |
| :--- | :--- | :--- |
| **Graph View** | `Ctrl+G` | Open global knowledge graph |
| **Daily Journal** | `Alt+J` | Open or create today's journal note |
| **Tasks Dashboard** | `Alt+T` | Open vault tasks dashboard |
| **Bookmarks** | `Ctrl+Shift+B` | Toggle Bookmarks panel |
| **Backlinks** | `Ctrl+Shift+B` | Toggle Backlinks pane |
| **Outline** | `Ctrl+Shift+O` | Toggle Outline pane |
| **Tags** | `Ctrl+Shift+T` | Toggle Tags pane |

> [!TIP]
> You can customize hotkeys for any command in **Settings (`Ctrl+,`) → Hotkeys**.
