export const backlinksReadme = `# Backlinks & Unlinked Mentions

Discover incoming bidirectional backlinks and unlinked document mentions across your entire Flint vault.

---

## Overview

The **Backlinks & Unlinked Mentions** plugin analyzes internal WikiLinks (\`[[Note Title]]\`) throughout the vault. It discovers which notes link to the active note and extracts unlinked mentions where note titles appear in plain text.

---

## Architecture & Flint APIs

This plugin demonstrates document footers, status bar metrics, and sidebar tabs.

### 1. Document Footer Injection
Extensions can render widgets at the bottom of notes using \`app.editor.registerDocumentFooter\`:

\`\`\`tsx
this.app.editor.registerDocumentFooter({
  id: 'in-doc-backlinks',
  render: ({ documentId, documentTitle }) => (
    <InDocBacklinksFooter
      documentId={documentId}
      documentTitle={documentTitle}
    />
  ),
});
\`\`\`

### 2. Status Bar Item
Registering reactive counters in the bottom window status bar:

\`\`\`tsx
this.app.statusBar.registerStatusBarItem({
  id: 'backlinks-status-count',
  position: 'right',
  render: () => <BacklinksStatusBarItem />,
});
\`\`\`

---

## Bidirectional Link Graph Architecture

1. **Extraction**: WikiLinks (\`\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]\`) are parsed during editor saves.
2. **SQLite Indexing**: Links are indexed into SQLite tables (\`document_links\` and \`document_mentions\`) with source and target document IDs.
3. **Graph Traversal**: Forward and incoming links are queried instantaneously via parameterized SQL without scanning the filesystem.

---

## Developer Guide: Querying the Vault Graph

To query backlinks programmatically from a custom extension:

\`\`\`tsx
import { Extension } from '@/core/extensions/Extension';

export class LinkGraphExtension extends Extension {
  async onload() {
    this.app.commands.registerCommand({
      id: 'graph:find-orphans',
      name: 'Find Orphaned Notes',
      callback: async () => {
        // Query SQLite database through Flint adapter
        const orphans = await this.app.db.query(\`
          SELECT id, title FROM documents
          WHERE id NOT IN (SELECT DISTINCT target_id FROM document_links)
        \`);
        console.log('Orphan notes:', orphans);
      },
    });
  }
}
\`\`\`
`;
