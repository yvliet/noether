# Tags

Tags lets you categorize and discover notes across folders using `#tag` syntax and an interactive tag pane.

## 1. Overview
---

Tags provide a flexible, non-hierarchical way to organize notes. You can write `#tags` anywhere in your document body or declare them in YAML frontmatter properties.

## 2. Add Tags to Notes
---

- **Inline in text**: Type `#` followed by the tag name (e.g. `#project`, `#research/physics`, `#book-notes`).
- **In Frontmatter**: Add tags to the `tags` property field at the top of the note.

## 3. Nested Tags
---

Organize tags into hierarchical subcategories using forward slashes:

- `#work/client-a`
- `#work/client-b`
- `#reading/books/2026`

The Tags pane automatically groups nested tags into collapsible tree branches.

## 4. Browse and Search by Tag
---

1. Click the **Tags** icon in the right sidebar rail.
2. The pane lists all tags across your vault along with the total count of notes for each.
3. Click any tag to open search results showing all notes containing that tag.
4. Hold `Ctrl` and click multiple tags to perform boolean `AND` filtering.

## 5. Keyboard Shortcuts & Commands
---

| Shortcut / Command | Action |
| :--- | :--- |
| `Ctrl+Shift+T` | Toggle Tags sidebar panel |
| `Command Palette → Tags: Show tag list` | Focus tag pane |

> [!TIP]
> Tags are indexed in real time by the local SQLite database, so tag searches return immediately even in vaults with tens of thousands of notes.
