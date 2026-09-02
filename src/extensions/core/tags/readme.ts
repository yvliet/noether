export const tagsReadme = `# Tags Explorer

Hierarchical nested tags tree view and vault-wide hashtag indexing.

---

## Overview

The **Tags Explorer** plugin scans all notes across the vault for hashtag tokens (\`#tag\`, \`#project/phase-1\`, \`#work/client/spec\`) and frontmatter tags. It organizes them into a collapsible, hierarchical navigation tree in the left sidebar.

---

## Architecture & Flint APIs

This plugin demonstrates how to register Left Sidebar tabs and interact with vault search filters.

### 1. Left Sidebar Tab Registration
Registers a primary navigation panel in the left sidebar:

\`\`\`tsx
this.app.sidebars.registerSidebarTab('left', {
  id: 'tags-explorer',
  title: 'Tags',
  icon: <Tag01Icon size={14} />,
  render: () => <TagsExplorerView />,
});
\`\`\`

### 2. Vault-Wide Tag Filtering
Clicking a tag in the tree triggers a reactive filter in the document list:

\`\`\`tsx
const handleTagClick = (tagPath: string) => {
  useDocumentStore.getState().setSearchQuery(\`tag:#\${tagPath}\`);
  useWorkspaceStore.getState().setActiveLeftView('files');
};
\`\`\`

---

## Nested Tag Tree Parsing

1. **Hierarchy Splitting**: Tags containing slashes (\`#a/b/c\`) are split by delimiter.
2. **Trie Construction**: Nodes are aggregated into a nested tree structure with document count metrics.
3. **Sorting**: Supports sorting by frequency (most used first) or alphabetically (A to Z).

---

## Developer Guide: Custom Tag Indexing

\`\`\`tsx
import { Extension } from '@/core/extensions/Extension';

export class TagColorizerExtension extends Extension {
  async onload() {
    this.app.events.on('tags:render-tag', ({ tag, element }) => {
      if (tag.startsWith('priority/high')) {
        element.style.color = '#ef4444';
      }
    });
  }
}
\`\`\`
`;
