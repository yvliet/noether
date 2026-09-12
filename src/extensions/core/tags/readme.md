# Tags Explorer

Hierarchical nested tags tree view and vault-wide hashtag taxonomy navigation.

---

## 1. Overview & User Experience

Hashtags offer an agile, cross-cutting taxonomy for organizing thoughts without locking them into rigid folders. A single note about artificial intelligence might carry `#tech/ai`, `#research/draft`, and `#priority/high`.

The **Tags Explorer** extension scans all documents in your vault for hashtag tokens and frontmatter tags. It organizes them into a collapsible, hierarchical nested tree inside the right sidebar. You can inspect your tag taxonomy, view frequency counters, and click any tag to filter your document list immediately.

### Where It Lives in Noether
- **Right Sidebar Tab**: Click the tag icon in the right sidebar to open the Tags Explorer.
- **Command Palette**: Run "Open Tags Explorer sidebar tab" (`Ctrl+K`) to navigate tags.
- **Settings**: Configure default sorting (alphabetical vs frequency count) under **Settings** (`Ctrl+,`) → **Tags Explorer**.

## 2. Features & Step-by-Step Guide

### 1. Nested Tags Hierarchy (`#parent/child`)
- Noether supports deep nested tag taxonomies using forward slashes.
- For example, writing `#work/client-a/brief` automatically creates a 3-level collapsible branch in the Tags Explorer:
  - `work` (total count)
    - `client-a`
      - `brief`
- Click any branch arrow to expand or collapse sub-tags.

### 2. Filtering Notes by Tag
1. Open the **Tags Explorer** tab in the right sidebar.
2. Click on any tag name (e.g. `#research`).
3. Noether activates the file explorer filter, instantly displaying all documents containing that tag.
4. Click the tag count badge to view exact note references.

### 3. Sorting Options
- **By Frequency**: Puts your most actively used tags at the very top.
- **Alphabetical (A to Z)**: Keeps your taxonomy cleanly ordered for rapid scanning.

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Tags Explorer extension demonstrates how to index custom text tokens into SQLite and construct nested trie trees via the Noether SDK.

### SDK Extension Points Used
- `this.registerSidebarTab()`: Registers an inspector tab in the right sidebar.
- `this.registerSettingTab()`: Adds preference options for taxonomy sorting.
- `this.registerTool()`: Exposes MCP AI tools for tag frequency and hierarchy analysis.

### Real SDK Implementation Pattern

Extension builders can query tag indices and build custom categorization engines using this SDK pattern:

```typescript
import { Extension, NoetherApp } from 'noether';

export default class TagAutomationExtension extends Extension {
  async onload(): Promise<void> {
    // Add command to inspect trending tags
    this.addCommand({
      id: 'tags:show-top-tags',
      title: 'Show Top 5 Tags',
      section: 'Analytics',
      action: async (app: NoetherApp) => {
        // Query SQLite tag index
        const tags = await app.db.query(`
          SELECT tag, COUNT(DISTINCT document_id) as doc_count
          FROM document_tags
          GROUP BY tag
          ORDER BY doc_count DESC
          LIMIT 5
        `);

        const summary = tags.map((t: any) => `#${t.tag} (${t.doc_count})`).join(', ');
        app.workspace.showToast(`Top tags: ${summary}`, 'info');
      },
    });
  }
}
```

### Nested Trie Tree Construction
1. Tags are tokenized from Markdown buffers using standard hashtag regex boundaries (`/(^|\\s)#([a-zA-Z0-9_\\/-]+)/g`).
2. Slashes (`/`) are split to construct a recursive Trie data structure.
3. Each node tracks aggregate document frequency across both its leaf items and child branches.

## 4. MCP Tools Reference

Tags Explorer registers three MCP tools for taxonomy exploration:

### 1. `tags-explorer_list_all`
- **Description**: Returns all tags across the vault with frequency counts and document associations.
- **Parameters**: None.
- **Returns**: Array of tag records with `tag`, `count`, `docs`, and `docIds`.

### 2. `tags-explorer_get_tree`
- **Description**: Returns the complete hierarchical nested tag tree (`#parent/child`).
- **Parameters**: None.
- **Returns**: Nested tree object with parent-child branches and document metrics.

### 3. `tags-explorer_get_documents_for_tag`
- **Description**: Finds all documents tagged with a specific keyword.
- **Parameters**:
  - `tag` (string, required): The tag name to search (e.g. `todo` or `work/project`).
- **Returns**: Object with matching `documents` array and total `count`.
