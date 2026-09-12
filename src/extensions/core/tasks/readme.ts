export const tasksReadme = `# Tasks & Checklists

Global task aggregation dashboard extracting checklists and todo items across all notes.

---

## 1. Overview & User Experience

Writing checklists (\`- [ ]\`) across meeting notes, project plans, and daily logs is fast and natural. However, when tasks are scattered across dozens of different notes, tracking what is due or unfinished becomes a headache.

The **Tasks & Checklists** extension automatically extracts every todo item across your entire vault into a unified, interactive dashboard. You can filter by completion status, search by task description or note title, and check off items directly from the dashboard. Checking off a task updates the source Markdown file on disk immediately.

### Where It Lives in Noether
- **Left Action Rail**: Click the checkmark square icon in the action rail to launch the full Tasks Center.
- **Command Palette**: Run "Open tasks center" (\`Ctrl+K\`) to navigate to your dashboard.
- **Settings**: Adjust task aggregation filters and sorting under **Settings** (\`Ctrl+,\`) → **Tasks**.

## 2. Features & Step-by-Step Guide

### 1. Writing Tasks in Notes
Simply write standard Markdown checkboxes anywhere in your documents:
\`\`\`markdown
- [ ] Research quantum computing algorithms
- [x] Finalize Q3 roadmap presentation
- [ ] Review PR #42 for editor performance
\`\`\`
Noether renders them as clean, clickable checkboxes in the live-preview editor.

### 2. The Tasks Center Dashboard
1. Click the **Tasks Center** icon on the Left Action Rail.
2. Filter tasks using the status tabs:
   - **Pending**: Shows all unfinished tasks across your vault.
   - **Completed**: Shows finished items.
   - **All**: Displays your complete checklist history.
3. Use the search bar to filter tasks by keyword or document title.
4. Click the note title badge beside any task to jump straight to that note in the editor.

### 3. Bidirectional Task Checking
- Check a box in the Tasks Center dashboard: the corresponding line in the original Markdown note is updated to \`- [x]\` with zero data loss.
- Check a box inside a note: the Tasks Center reflects the change instantaneously.

### 4. Keyboard Shortcuts & Commands

| Action | Shortcut / Access | Description |
| :--- | :--- | :--- |
| **Open Tasks Center** | Command Palette | Launches the full-window global task aggregation tab. |
| **Convert Line to Task** | \`Ctrl+L\` (or Slash menu) | Converts the active editor paragraph into a checklist item. |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Tasks extension demonstrates how to index inline Markdown tokens across files, register full-window views, and perform bidirectional file updates via the Noether SDK.

### SDK Extension Points Used
- \`this.registerView()\`: Registers the \`tasks\` custom workspace tab.
- \`this.addActionRailIcon()\`: Adds the Tasks Center launcher icon to the Left Action Rail.
- \`this.addCommand()\`: Registers palette shortcuts.
- \`this.app.vault.getGlobalTasks()\`: Queries vault-wide task items with filtering.
- \`this.app.vault.toggleTask()\`: Safely toggles task completion state in source Markdown files.
- \`this.registerTool()\`: Exposes MCP AI tools for global task querying and status updates.

### Real SDK Implementation Pattern

Extension builders can build task aggregators or schedulers using this SDK pattern:

\`\`\`typescript
import { Extension, NoetherApp } from 'noether';

export default class PendingTasksReminderExtension extends Extension {
  async onload(): Promise<void> {
    // Add command to report pending task count
    this.addCommand({
      id: 'tasks:count-pending',
      title: 'Count Pending Tasks',
      section: 'Tasks',
      action: async (app: NoetherApp) => {
        const pending = await app.vault.getGlobalTasks({ completed: false });
        app.workspace.showToast(
          \`You have \${pending.length} pending tasks across the vault\`,
          pending.length > 0 ? 'info' : 'success'
        );
      },
    });
  }
}
\`\`\`

### Atomic Text Rewrite Algorithm
When a task is checked off in the dashboard:
1. The source document is located by \`documentId\`.
2. The specific task line is identified by text matching and line indices.
3. The checkbox token (\`- [ ]\` $\leftrightarrow$ \`- [x]\`) is toggled cleanly while preserving all surrounding formatting, indentations, and tags.
4. Changes write through Noether's debounced save pipeline to avoid unnecessary disk churn.

## 4. MCP Tools Reference

Tasks registers three MCP tools for AI-assisted project management:

### 1. \`tasks_get_all\`
- **Description**: Returns all checklist items across the vault, with optional status and text search filters.
- **Parameters**:
  - \`status\` (string, optional): Filter by \`all\`, \`pending\`, or \`completed\`.
  - \`search\` (string, optional): Keyword query matching task description or note title.
- **Returns**: Array of task objects with \`id\`, \`document_id\`, \`document_title\`, \`text\`, and \`completed\`.

### 2. \`tasks_get_by_document\`
- **Description**: Retrieves all checklist items from a specific document.
- **Parameters**:
  - \`documentId\` (string, required): The target document ID.
- **Returns**: Array of task items belonging to the document.

### 3. \`tasks_toggle_status\`
- **Description**: Sets the completion status of a checklist task item within a document.
- **Parameters**:
  - \`documentId\` (string, required): Document containing the task.
  - \`taskText\` (string, required): Exact or matching text of the task.
  - \`completed\` (boolean, required): \`true\` for completed, \`false\` for pending.
- **Returns**: Confirmation payload with operation success status.
`;
