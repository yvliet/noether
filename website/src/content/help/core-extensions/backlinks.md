# Backlinks

Backlinks shows all incoming links to the active note from other notes across your vault, making it easy to see how ideas connect.

## 1. Overview
---

When you link to a note using wikilinks (`[[Note Name]]`), Noether tracks the connection in its local database. The Backlinks pane displays two types of connections:

- **Linked mentions**: Notes that explicitly contain a wikilink pointing to the active note.
- **Unlinked mentions**: Notes that mention the title of the active note in plain text without a link.

## 2. Open the Backlinks Pane
---

1. Click the **Backlinks** icon in the right sidebar rail.
2. The pane opens and shows all notes linking to the currently active note in the editor.
3. Click any mention in the list to jump directly to that note.

## 3. Link Unlinked Mentions
---

Unlinked mentions highlight places where you referenced a concept before creating a note for it:

1. Expand the **Unlinked mentions** section in the Backlinks pane.
2. Review the preview snippet showing where the term appears.
3. Click **Link** to turn the plain text into an active `[[Wikilink]]` instantly.

## 4. Drag and Drop Links into Editor
---

You can drag references directly from the Backlinks pane into your active note:

- **Insert Link**: Drag a backlink item into the editor to insert a `[[Target Note]]` link.
- **Insert Embed**: Hold `Shift` while dragging to insert a transcluded media embed or note embed (`![[Target Note]]`).

## 5. Keyboard Shortcuts & Commands
---

| Shortcut / Command | Action |
| :--- | :--- |
| `Ctrl+Shift+B` | Toggle Backlinks sidebar panel |
| `Command Palette → Backlinks: Open linked mentions` | Focus Backlinks pane |

> [!TIP]
> Backlinks update in real time as you write. When you rename a note, all incoming wikilinks update automatically across your entire vault.
