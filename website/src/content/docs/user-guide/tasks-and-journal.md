# Tasks Dashboard & Daily Journal

Flint eliminates the separation between note-taking, project tracking, and daily reflection. Through the **Global Tasks Dashboard** and **Daily Journal Engine**, your action items and daily scratchpads stay organized without requiring fragmented third-party productivity apps.

---

## 1. Centralized Tasks Dashboard

In traditional Markdown systems, task checkboxes (`- [ ]`) scattered across dozens of project notes often go forgotten. Flint indexes every task in your Hearth into a unified, actionable control center.

### Task Syntax
Write tasks naturally in any note:
```markdown
## Sprint Tasks
- [ ] Implement FTS5 diacritics tokenization #backend ^task-101
- [x] Configure Tauri v2 memory limits
- [ ] Design custom SVG folder icons #design
```

### Accessing the Dashboard
- Click the **Tasks** icon on the left Action Rail.
- Or run `Ctrl+K` → *Open Tasks Dashboard*.

| **To Do (5)** | **In Progress (2)** | **Completed (14)** |
| :--- | :--- | :--- |
| • [ ] **Implement FTS5 diacritics**<br />`#backend` • `Architecture.md` | • [ ] **Configure Tauri memory limits**<br />`#runtime` • `Runtime.md` | • [x] ~~**Establish native rusqlite engine**~~<br />`#database` • `Engine.md` |
| • [ ] **Design custom SVG folder icons**<br />`#design` • `Icons.md` | • [ ] **Audit FSRS-4.5 retention curve**<br />`#fsrs` • `Algorithm.md` | • [x] ~~**TipTap 2.x Live Preview**~~<br />`#editor` • `Editor.md` |


---

## 2. Views & Two-Way Disk Synchronization

### Kanban & List Modes
- **Kanban Board**: Drag task cards between *To Do*, *In Progress*, and *Completed* columns.
- **Checklist Mode**: Clean aggregated list grouped by document source or tag category.
- **Source Link Navigation**: Clicking the document badge on any task card immediately opens the source note and scrolls the editor directly to that specific task line.

### Atomic Two-Way Synchronization
When you check off a task or drag it into the *Completed* column in the Tasks Dashboard:
1. Flint locates the source `.md` file on disk.
2. Applies the state change (`- [ ]` $\to$ `- [x]`) using the atomic temp-and-rename pipeline.
3. Updates the `blocks` table in SQLite.
4. Suppresses echo file reload loops, ensuring smooth UI continuity.

---

## 3. Daily Journal & Reflection

The **Journal** feature provides zero-friction capture for morning plans, meeting logs, and evening reflections.

### Creating Today's Journal Note
- Click the **Calendar / Journal** icon on the left Action Rail.
- Or press `Ctrl+Alt+J`.
- Flint instantly opens today's note (e.g. `Journal/2026-09-06.md`). If it doesn't exist yet, it creates it instantly using your configured template.

### Configuring Journal Settings
Navigate to *Settings → Extensions → Journal*:

- **Journal Folder**: Set the root directory for daily notes (default: `Journal/`).
- **Date Format**: Configure file name formatting:
  - `YYYY-MM-DD` (e.g. `2026-09-06.md`)
  - `YYYY/MM/DD` (auto-creates nested monthly folders: `2026/09/06.md`)
  - `DD-MM-YYYY`
- **Default Template**: Specify boilerplate content to preload into new daily notes (e.g. Daily Standup, Priorities, Gratitude).

### Chronological Navigation
At the top of each daily note, Flint displays a lightweight sub-header bar with:
- **Previous Day (`Alt+←`)**: Navigates to the preceding daily note.
- **Next Day (`Alt+→`)**: Navigates to the following daily note.
- **Calendar Date Picker**: Jump directly to any historical date in your archive.
