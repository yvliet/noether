export const bookmarksReadme = `# Bookmarks

Pin and organize your most critical notes, projects, and searches for instant 1-click access.

---

## 1. Overview & User Experience

As your vault grows to hundreds or thousands of documents, finding your active project files or daily hubs should not require digging through nested folders or running repeated searches.

The **Bookmarks** extension provides an instant access hub in Noether's left sidebar. It allows you to star your most important notes and access them with a single click, keyboard shortcut, or context menu action.

### Where It Lives in Noether
- **Left Sidebar Tab**: Click the bookmark ribbon icon in the left sidebar to open your Bookmarks list.
- **Note Header Action**: A bookmark star icon appears in the document sub-header of every active note for immediate toggling.
- **File Tree Context Menu**: Right-click any file or selection in the file tree to add or remove bookmarks.
- **Global Hotkey**: Press \`Ctrl+Shift+B\` to instantly toggle bookmark status for the open note.

## 2. Features & Step-by-Step Guide

### 1. Bookmarking Notes
- **From the Active Note**: Click the bookmark icon in the top document sub-header, or press \`Ctrl+Shift+B\`.
- **From the File Explorer**: Right-click any note and select **Bookmark**. To bookmark multiple files at once, hold \`Ctrl\` (or \`Shift\`) to multi-select, right-click, and choose **Bookmark N items**.
- **From the Command Palette**: Press \`Ctrl+K\` and type "Bookmark" to toggle bookmarking for the current note.

### 2. Navigating Bookmarked Notes
1. Switch to the **Bookmarks** tab in the left sidebar.
2. Click any bookmarked note to open it immediately in the main editor.
3. Right-click any bookmarked entry to open in a split pane, copy links, or remove it from bookmarks.

### 3. Keyboard Shortcuts & Commands

| Action | Shortcut | Description |
| :--- | :--- | :--- |
| **Toggle Bookmark** | \`Ctrl+Shift+B\` | Toggles bookmark status for the currently active note. |
| **Open Bookmarks Tab** | Command Palette | Switches the left sidebar view directly to the Bookmarks drawer. |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Bookmarks extension demonstrates how to connect multiple UI extension points into a unified user flow using the Noether SDK.

### SDK Extension Points Used
- \`this.registerSidebarTab()\`: Injects a dedicated drawer view into the left sidebar.
- \`this.registerDocumentHeaderAction()\`: Adds a dynamic, reactive action button directly to the editor's sub-header.
- \`this.registerFileContextMenuAction()\`: Extends the file tree right-click context menu with single and multi-selection support.
- \`this.addCommand()\`: Registers context-aware commands that update their label dynamically based on active document state.
- \`this.registerTool()\`: Exposes MCP AI tools for programmatic agent interaction.

### Real SDK Implementation Pattern

Here is how an extension builder can implement sidebar tabs, header buttons, and context actions using the Noether SDK:

\`\`\`typescript
import { Extension, NoetherApp } from 'noether';
import React from 'react';

export default class QuickPinExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Register a Left Sidebar Drawer Tab
    this.registerSidebarTab({
      id: 'quick-pin',
      title: 'Pinned Notes',
      icon: <BookmarkIcon size={14} />,
      side: 'left',
      order: 15,
      render: () => <PinnedNotesSidebarView />,
    });

    // 2. Register a Document Header Action Button
    this.registerDocumentHeaderAction({
      id: 'pin-active-note',
      title: (ctx) => (ctx.document?.is_bookmarked ? 'Unpin note' : 'Pin note'),
      icon: (ctx) => (
        <BookmarkIcon
          size={14}
          className={ctx.document?.is_bookmarked ? 'fill-current text-[#f59e0b]' : ''}
        />
      ),
      onClick: async (ctx) => {
        if (ctx.document) {
          await ctx.app.vault.toggleBookmark(ctx.document.id);
          ctx.app.workspace.showToast('Updated pin status', 'info');
        }
      },
      isVisible: (ctx) => Boolean(ctx.document),
      order: 10,
    });

    // 3. Register File Tree Context Menu Action
    this.registerFileContextMenuAction({
      id: 'toggle-pin-context',
      title: (ctx) => (ctx.item.is_bookmarked ? 'Unpin from Sidebar' : 'Pin to Sidebar'),
      icon: () => <BookmarkIcon size={14} />,
      section: 'actions',
      onClick: async (ctx) => {
        await ctx.app.vault.toggleBookmark(ctx.item.id);
      },
    });
  }
}
\`\`\`

### Storage & SQLite Integration
Bookmark state is stored directly as an indexed boolean attribute (\`is_bookmarked\`) in the vault's SQLite \`documents\` table. When toggled, state updates propagate instantaneously to the in-memory Zustand store for 0ms visual updates, followed by atomic SQLite persistence without disk I/O lag.

## 4. MCP Tools Reference

Bookmarks registers two MCP tools allowing AI agents to query and manage pinned notes:

### 1. \`bookmarks_list\`
- **Description**: Returns all bookmarked documents in the active vault.
- **Parameters**: None.
- **Returns**: Array of bookmarked note records with \`id\`, \`title\`, \`parent_id\`, \`created_at\`, and \`updated_at\`.

### 2. \`bookmarks_toggle\`
- **Description**: Toggles the bookmark status of a specific document by ID.
- **Parameters**:
  - \`documentId\` (string, required): The target document identifier.
- **Returns**: Result object confirming updated \`isBookmarked\` boolean status and note \`title\`.
`;
