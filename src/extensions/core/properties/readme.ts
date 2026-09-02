export const propertiesReadme = `# Note Properties

Manage structured YAML frontmatter and document metadata properties directly inside notes and via a dedicated inspector sidebar panel.

---

## Overview

The **Note Properties** plugin delivers Obsidian-compatible frontmatter metadata management. It parses standard YAML blocks (\`--- ... ---\`) from note content and presents them as interactive, reactive property widgets both in the note editor header and in the right sidebar.

---

## Architecture & Flint APIs

This plugin demonstrates how to register document header items, sidebar panels, setting tabs, and command palette actions.

### 1. Document Header Registration
Flint's \`app.editor.registerDocumentHeader\` API allows extensions to inject custom UI at the top of note documents:

\`\`\`tsx
this.app.editor.registerDocumentHeader({
  id: 'document-properties-header',
  render: ({ documentId, mode, isFolded }) => (
    <DocumentPropertiesHeader
      documentId={documentId}
      mode={mode}
      isFolded={isFolded}
    />
  ),
});
\`\`\`

### 2. Right Sidebar Inspector Panel
Registering an inspector panel that reacts to the active document:

\`\`\`tsx
this.app.sidebars.registerSidebarTab('right', {
  id: 'properties-view',
  title: 'Properties',
  icon: <LeftToRightListBulletIcon size={14} />,
  render: () => <PropertiesView />,
});
\`\`\`

### 3. Setting Tabs
Extensions register custom settings tabs using \`app.settings.registerSettingTab\`:

\`\`\`tsx
this.app.settings.registerSettingTab({
  id: 'note-properties:settings',
  name: 'Properties',
  render: () => <PropertiesSettingsTab />,
});
\`\`\`

---

## Data Flow & Storage

1. **Storage Format**: Stored as standard YAML frontmatter blocks at the beginning of Markdown files.
2. **Reactivity**: Property changes trigger debounced saves (350ms) to SQLite and disk via \`useDocumentStore.updateProperties(docId, nextProps)\`.
3. **Icons Customization**: Flint allows custom Lucide/Hugeicons mappings for property keys, stored under \`propertyIcons\` in settings.

---

## Developer Guide: Building a Metadata Extension

To build an extension that interacts with note metadata:

\`\`\`tsx
import { Extension } from '@/core/extensions/Extension';

export class CustomMetadataExtension extends Extension {
  async onload() {
    // 1. Subscribe to property change events
    this.app.events.on('document:modified', ({ documentId }) => {
      const doc = this.app.workspace.getDocument(documentId);
      console.log('Modified document frontmatter:', doc?.frontmatter);
    });

    // 2. Register custom command
    this.app.commands.registerCommand({
      id: 'custom:add-status',
      name: 'Set Status to Active',
      callback: () => {
        const activeId = this.app.workspace.activeDocumentId;
        if (activeId) {
          this.app.workspace.updateProperties(activeId, { status: 'Active' });
        }
      },
    });
  }
}
\`\`\`
`;
