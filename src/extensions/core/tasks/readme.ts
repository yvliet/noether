export const tasksReadme = `# Tasks Management

Vault-wide interactive task extraction, completion tracking, and checklist management.

---

## Overview

The **Tasks** plugin aggregates checklist items (\`- [ ]\`, \`- [x]\`) from all notes across your vault into a centralized task dashboard and right sidebar panel.

---

## Architecture & Flint APIs

This plugin showcases custom main view registration, bidirectional text updates, and sidebar integration.

### 1. Registering the Main Tasks View
Registers a dedicated full-window custom workspace tab:

\`\`\`tsx
this.app.views.registerView({
  type: 'tasks',
  title: 'Tasks',
  icon: <CheckmarkSquare02Icon size={14} />,
  render: () => <TasksView />,
});
\`\`\`

### 2. Live Task Toggling
Checking off a task in the dashboard parses and rewrites the source note file directly:

\`\`\`tsx
const toggleTaskInDoc = async (documentId: string, taskLineIndex: number) => {
  const doc = await app.workspace.getDocument(documentId);
  if (!doc) return;

  const lines = doc.content.split('\\n');
  lines[taskLineIndex] = lines[taskLineIndex].replace(
    /^- \\[( |x)\\]/,
    (match) => (match === '- [ ]' ? '- [x]' : '- [ ]')
  );

  await app.workspace.saveDocument(documentId, lines.join('\\n'));
};
\`\`\`

---

## Developer Guide: Automated Task Schedulers

\`\`\`tsx
import { Extension } from '@/core/extensions/Extension';

export class TaskDueDateExtension extends Extension {
  async onload() {
    this.app.commands.registerCommand({
      id: 'tasks:add-today-deadline',
      name: 'Add Due Date: Today',
      callback: () => {
        const today = new Date().toISOString().split('T')[0];
        this.app.editor.insertText(\` 📅 \${today}\`);
      },
    });
  }
}
\`\`\`
`;
