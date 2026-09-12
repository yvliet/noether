export const propertiesReadme = `# Note Properties

Manage structured YAML frontmatter and note metadata visually directly inside documents and the inspector panel.

---

## 1. Overview & User Experience

Metadata transforms plain text notes into a queryable, structured personal database. Adding attributes such as status, priority, author, aliases, due dates, or custom ratings allows you to filter and sort your knowledge base cleanly.

The **Note Properties** extension provides an Obsidian-compatible frontmatter editor. It parses the YAML metadata block (\`--- ... ---\`) at the top of your Markdown files and renders it as an interactive, typed visual widget at the head of every note and inside the right sidebar inspector.

### Where It Lives in Noether
- **In-Document Header**: Renders directly above the document title in the editor canvas.
- **Right Sidebar Tab**: Click the properties icon in the right sidebar to open the dedicated metadata inspector.
- **Document Menu Action**: Click the note context menu (...) and choose "Add file property".
- **Settings**: Configure default fold states and icon mappings under **Settings** (\`Ctrl+,\`) → **Properties**.

## 2. Features & Step-by-Step Guide

### 1. Adding and Editing Properties
1. At the top of any note, click **Add property** (or open the right sidebar **Properties** tab).
2. Type a property name (e.g. \`status\`, \`priority\`, \`due\`, \`tags\`, \`author\`).
3. Choose the property type:
   - **Text**: Standard string entries.
   - **List / Tags**: Multiple values rendered as clickable chips.
   - **Number**: Numeric values (e.g. ratings, prices, word targets).
   - **Checkbox**: Boolean true/false toggles.
   - **Date**: Visual calendar date pickers.
4. Enter your value. Noether serializes your changes back to the YAML frontmatter on disk automatically.

### 2. Folding and Minimal Header View
- If you prefer a clean writing space, click the collapse chevron on the properties header to fold the block into a minimal single-line badge.
- In Settings, enable **Start Folded** to keep property headers collapsed by default across all notes.

### 3. Obsidian & Markdown Compatibility
Noether does not use proprietary database schemas for note properties. Everything is stored as standard YAML frontmatter at the top of your \`.md\` file:

\`\`\`yaml
status: in-progress
priority: high
tags: [research, quantum-physics]
created: 2026-09-13
\`\`\`

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Note Properties extension demonstrates how to inject editor header widgets, build right sidebar tabs, and update document frontmatter via the Noether SDK.

### SDK Extension Points Used
- \`this.registerDocumentHeader()\`: Mounts interactive React widgets above the note content canvas.
- \`this.registerSidebarTab()\`: Registers the right sidebar metadata inspector.
- \`this.registerDocMenuAction()\`: Injects quick actions into the note header dropdown menu.
- \`this.app.vault.updateDocumentProperties()\`: Atomically updates frontmatter fields without rewriting body text.
- \`this.registerTool()\`: Exposes MCP AI tools for structured metadata querying and updates.

### Real SDK Implementation Pattern

Extension builders can read and update note frontmatter using this SDK pattern:

\`\`\`typescript
import { Extension, NoetherApp } from 'noether';

export default class ProjectTrackerExtension extends Extension {
  async onload(): Promise<void> {
    // Add command to mark active project completed
    this.addCommand({
      id: 'project:mark-completed',
      title: 'Mark Project as Completed',
      section: 'Projects',
      action: async (app: NoetherApp) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc) return;

        // Atomically update YAML frontmatter properties
        await app.vault.updateDocumentProperties(activeDoc.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

        app.workspace.showToast(\`Project "\${activeDoc.title}" completed\`, 'success');
      },
    });
  }
}
\`\`\`

## 4. MCP Tools Reference

Note Properties registers three MCP tools for agentic metadata automation:

### 1. \`note-properties_get\`
- **Description**: Retrieves all YAML frontmatter key-value pairs for a document.
- **Parameters**:
  - \`documentId\` (string, required): Target document identifier.
- **Returns**: Object with \`documentId\` and \`properties\` dictionary.

### 2. \`note-properties_set\`
- **Description**: Sets or updates a specific frontmatter property on a document.
- **Parameters**:
  - \`documentId\` (string, required): Target document identifier.
  - \`key\` (string, required): Property name (e.g. \`status\`, \`priority\`).
  - \`value\` (string, required): Value string or JSON-encoded array/boolean/number.
- **Returns**: Updated properties dictionary confirming applied value.

### 3. \`note-properties_delete\`
- **Description**: Removes a frontmatter property key from a document (destructive action).
- **Parameters**:
  - \`documentId\` (string, required): Target document identifier.
  - \`key\` (string, required): Property key name to remove.
- **Returns**: Confirmation payload with remaining properties.
`;
