export const tablesReadme = `# Tables

Create, format, and interact with rich multi-column tables directly within your notes.

---

## 1. Overview & User Experience

Structured tabular data is essential for comparisons, project roadmaps, checklists, and specifications. However, writing and editing raw Markdown pipe syntax (\`| col | col |\`) by hand is tedious and error-prone.

The **Tables** extension introduces a rich, visual table editor directly into Noether's live-preview writing experience. It combines a Google Docs-style dimension picker with interactive column resizing, smart keyboard navigation, and 100% portable GitHub Flavored Markdown (GFM) disk serialization.

### Where It Lives in Noether
- **Editor Slash Command**: Type \`/table\` anywhere in a note to summon the dimension grid picker.
- **Command Palette**: Press \`Ctrl+K\` and type "Insert table" to insert a default table block.
- **Contextual Floating Bar**: Hovering or clicking within a table reveals quick actions to add rows, columns, or toggle headers.
- **Settings**: Configure default row/column counts under **Settings** (\`Ctrl+,\`) → **Tables**.

## 2. Features & Step-by-Step Guide

### 1. Visual Dimension Grid Picker
1. In any note, type \`/table\` on a blank line.
2. An interactive grid picker appears right beside your cursor.
3. Move your mouse across the grid to highlight your desired dimensions (up to 10×8 cells).
4. Click to immediately insert the formatted table with a highlighted header row.

### 2. Smart Keyboard Navigation & Editing
- **Next Cell**: Press \`Tab\` to move cursor focus to the next cell.
- **Previous Cell**: Press \`Shift+Tab\` to jump back to the previous cell.
- **Auto-Row Creation**: When you press \`Tab\` in the very last cell of a table, Noether automatically appends a fresh row below and focuses its first column.
- **Exit Table**: Press the \`Down\` arrow from the bottom row to jump cleanly back into standard paragraph text.

### 3. Interactive Column Resizing
- Hover over the boundary line between any two columns until the cursor turns into a horizontal resize indicator (\`↔\`).
- Click and drag left or right to customize column widths to your exact layout needs.

### 4. Floating Action Controls
When your cursor is inside a table, a minimal action toolbar provides instant controls:
- Add row above or below.
- Add column left or right.
- Delete current row or column.
- Toggle header row styling on or off.

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Tables extension demonstrates how to extend Noether's ProseMirror/TipTap editor schema, register custom slash commands, and dispatch editor transactions via the Noether SDK.

### SDK Extension Points Used
- \`this.registerSlashCommand()\`: Adds commands to the editor's slash popover menu (\`/\`) with custom parameter payloads.
- \`this.addCommand()\`: Registers palette shortcuts that evaluate document context before executing.
- \`this.app.editor.dispatchAction()\`: Safely dispatches transactional commands to the active ProseMirror view instance.
- \`this.registerSettingTab()\`: Adds preference configuration for default table dimensions.
- \`this.registerTool()\`: Exposes MCP AI tools for automated tabular data insertion.

### Real SDK Implementation Pattern

Extension builders can implement custom slash commands and editor actions using the following SDK pattern:

\`\`\`typescript
import { Extension, NoetherApp } from 'noether';

export default class CustomEditorBlockExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Register an Editor Slash Command
    this.registerSlashCommand({
      title: 'Callout Box',
      description: 'Insert an alert callout block',
      icon: 'alert-triangle',
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent('> [!TIP]\\n> Write actionable notes here.\\n')
          .run();
      },
    });

    // 2. Dispatch Custom Editor Transaction from Command Palette
    this.addCommand({
      id: 'editor:insert-quick-grid',
      title: 'Insert 4x4 Grid',
      section: 'Editor',
      action: (app: NoetherApp) => {
        const handled = app.editor.dispatchAction('insertTable', {
          rows: 4,
          cols: 4,
          withHeaderRow: true,
        });

        if (!handled) {
          app.workspace.showToast('Open a Markdown note to insert a table', 'warning');
        }
      },
    });
  }
}
\`\`\`

### Markdown Disk Serialization
While tables render interactively as rich HTML DOM elements in the editor, they are serialized to disk as standard Markdown pipe tables:

\`\`\`markdown
| Column A | Column B | Column C |
| :--- | :--- | :--- |
| Item 1 | Value 1 | Active |
| Item 2 | Value 2 | Done |
\`\`\`

This guarantees 100% interoperability with external tools such as GitHub, VS Code, and Obsidian without vendor lock-in.

## 4. MCP Tools Reference

### \`tables_insert\`
- **Description**: Programmatically inserts a new formatted table grid block at the current cursor position in the active document.
- **Parameters**:
  - \`rows\` (number, required): Number of rows to create (minimum 1, default 3).
  - \`cols\` (number, required): Number of columns to create (minimum 1, default 3).
- **Returns**: Confirmation payload with applied \`rows\` and \`cols\`.
`;
