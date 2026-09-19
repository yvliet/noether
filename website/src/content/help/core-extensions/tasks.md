# Tasks

Aggregate checklist items across your vault into a central dashboard and kanban board.

## 1. Writing Tasks in Notes
---

Use standard Markdown checklist syntax anywhere in your notes:

```markdown
- [ ] Draft migration plan due:2026-09-25 #work
- [ ] Fix SQLite cache invalidation #bug
- [x] Merge pull request
```

You can append `#tags` and due dates (`due:YYYY-MM-DD`) directly to the line. Noether extracts these into structured task metadata.

## 2. The Tasks Dashboard
---

Press `Alt+T` or click the checklist icon in the Action Rail to open the Tasks dashboard:

- **Views**: Switch between **List View**, **Group by Note**, **Group by Tag**, and a 3-column **Kanban Board** (Todo, In Progress, Done).
- **Bi-directional Editing**: Checking a box in the dashboard edits the physical `.md` file on disk immediately. You don't need to open the note first.
- **Jump to Source**: Click any task's file name to jump directly to that exact line in the editor.
- **Editor Shortcut**: Press `Ctrl+Enter` while editing any note to toggle the checkbox on the current line.

