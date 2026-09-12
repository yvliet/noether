# Document Outline

Interactive table of contents and heading tree navigation for active notes.

---

## 1. Overview & User Experience

Long-form documents, technical specifications, and research papers quickly become difficult to navigate by manual scrolling alone. 

The **Document Outline** extension parses all Markdown headings (`# H1` through `###### H6`) in your open note and constructs an interactive, indented Table of Contents in the right sidebar. You can see the structure of your document at a glance, jump to any section with a single click, and keep your reading place synchronized as you scroll.

### Where It Lives in Noether
- **Right Sidebar Tab**: Click the list icon in the right sidebar to open the Outline inspector.
- **Command Palette**: Run "Open Outline sidebar tab" (`Ctrl+K`) to jump directly to document navigation.
- **Settings**: Adjust heading level filtering under **Settings** (`Ctrl+,`) → **Document Outline**.

## 2. Features & Step-by-Step Guide

### 1. Navigating Headings
1. Open any note containing headings in Noether.
2. Open the right sidebar and switch to the **Outline** tab.
3. The panel displays a clean, hierarchical tree indented according to heading depth (`H1` → `H2` → `H3`).
4. Click any heading item to smoothly scroll the active editor view directly to that section.

### 2. Live Document Synchronization
- As you type new headings, edit section titles, or rearrange paragraphs in the editor, the Outline panel updates instantaneously in real time without lag.
- Clicking an outline node automatically focuses the editor cursor at the start of that heading line.

### 3. Keyboard Shortcuts & Commands

| Action | Shortcut / Access | Description |
| :--- | :--- | :--- |
| **Open Outline Tab** | Command Palette | Opens the right sidebar and switches focus to the Outline panel. |
| **Toggle Right Sidebar** | `Ctrl+Shift+\\` | Shows or collapses the right sidebar drawer. |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Outline extension demonstrates how to observe TipTap Prosemirror AST state, extract heading token hierarchies, and register right sidebar panels via the Noether SDK.

### SDK Extension Points Used
- `this.registerSidebarTab()`: Registers an inspector tab in the right sidebar.
- `this.registerSettingTab()`: Adds preference options for heading depth limits.
- `this.registerTool()`: Exposes MCP AI tools for structural heading extraction.

### Real SDK Implementation Pattern

Extension builders can extract document heading structures and build custom sidebar tools using this SDK pattern:

```typescript
import { Extension, NoetherApp } from 'noether';
import React from 'react';

export default class HeadingNavigatorExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Register Right Sidebar Tab
    this.registerSidebarTab({
      id: 'quick-navigator',
      title: 'TOC Navigator',
      icon: <ListIcon size={14} />,
      side: 'right',
      order: 12,
      render: () => <CustomNavigatorSidebar />,
    });

    // 2. Register Command to Jump to First Heading
    this.addCommand({
      id: 'jump-first-heading',
      title: 'Jump to Top Heading',
      section: 'Navigation',
      action: (app: NoetherApp) => {
        const activeDoc = app.vault.activeDocument;
        if (activeDoc) {
          // Trigger smooth scroll in editor canvas
          const firstH1 = document.querySelector('h1');
          firstH1?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
    });
  }
}
```

### Hierarchical Tree Construction Algorithm
Headings from the TipTap JSON AST are transformed into a nested tree structure using a monotonic stack algorithm:
1. Each heading is assigned a depth rank based on its level ($1 \le level \le 6$).
2. A stack tracks ancestor parent nodes. When a heading of level $\le$ the top of stack arrives, the stack pops until finding the parent level.
3. The resulting recursive tree structure maps cleanly into virtualized React rendering components.

## 4. MCP Tools Reference

### `outline_get_headings`
- **Description**: Extracts the hierarchical heading tree (Table of Contents) from a document.
- **Parameters**:
  - `documentId` (string, required): Target document identifier.
- **Returns**: Object with `documentId`, `title`, `headingCount`, and `outline` array containing nested heading nodes (`id`, `level`, `text`, `children`).
