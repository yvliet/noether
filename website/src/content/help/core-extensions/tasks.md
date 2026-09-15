# Tasks

Tasks aggregates all `- [ ]` and `- [x]` checklist items across your entire vault into an interactive, centralized dashboard and kanban board.

## 1. Overview
---

Instead of remembering which notes contain active action items, the Tasks dashboard automatically scans your Markdown notes, extracts every checklist item, and presents them in a unified view sorted by status, date, or priority.

## 2. Write Tasks in Notes
---

Create tasks anywhere in your notes using standard Markdown checkbox syntax:

- `- [ ] Draft project proposal`
- `- [ ] Review pull request #priority/high`
- `- [x] Submit expense report`

You can append `#tags`, due dates (`due:2026-09-20`), or priority flags (`#high`, `#urgent`) directly to the task line.

## 3. Open the Tasks Dashboard
---

1. Click the **Tasks** icon in the Action Rail.
2. The dashboard displays all open and completed tasks across all notes.
3. Check off any task to update the underlying Markdown file on disk in real time.

## 4. Kanban View & Filtering
---

- **View Modes**: Switch between **List View**, **Group by File**, **Group by Tag**, and **Kanban Board** (Todo, In Progress, Completed).
- **Filter Bar**: Filter tasks by note path, completion status, or tags.
- **Jump to Note**: Click the file name next to any task to jump directly to its line in the editor.

## 5. Keyboard Shortcuts & Commands
---

| Shortcut / Command | Action |
| :--- | :--- |
| `Alt+T` | Open Tasks dashboard |
| `Command Palette → Tasks: Toggle task at cursor` | Toggle checkbox under editor cursor |
| `Ctrl+Enter` | Toggle active checklist item in editor |

> [!TIP]
> Changes made in the Tasks dashboard are bi-directional. Checking a box in the dashboard edits the physical `.md` file immediately without needing to open it.
