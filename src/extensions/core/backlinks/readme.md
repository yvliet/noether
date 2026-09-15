# Backlinks & Unlinked Mentions

Discover bidirectional relationships, incoming references, unlinked document mentions, and drag-and-drop link/embed creation across your vault.

---

## 1. Overview & User Experience

Knowledge is rarely isolated. When you reference a concept in multiple notes, you create an interconnected web of thought. 

The **Backlinks & Unlinked Mentions** extension automatically tracks incoming connections to your active note. It reveals which documents point to the current note via WikiLinks (`[[Note Title]]`), flags **unlinked mentions** (places where a note's title appears in plain text without a link, allowing you to convert them with a single click), and consumes the host Drag & Drop system so you can drag notes or media files directly from the sidebar file tree into your notes to instantly insert wikilinks or media embeds.

### Where It Lives in Noether
- **Right Sidebar Panel**: Click the link icon in the right sidebar to open the Backlinks & Mentions inspector.
- **In-Document Footer**: Optionally displays an incoming links list directly at the bottom of each note.
- **Editor Drag & Drop**: Drag notes or media files from the left sidebar file tree into the active note to automatically insert `[[links]]` and `![[embeds]]`.
- **Status Bar Indicator**: Displays a reactive backlink counter (e.g. `5 backlinks`) in the bottom window dock.
- **Settings**: Toggle the in-document footer and customize display preferences under **Settings** (`Ctrl+,`) → **Backlinks**.

## 2. Features & Step-by-Step Guide

### 1. Drag & Drop Link & Media Embed Insertion
1. Select one or more notes, media files, or folders in the left navigation sidebar.
2. Drag them directly over the active editor canvas.
3. Observe the dynamic drag tooltip showing contextual subtitles:
   - For notes: `Link "Document Title"` (or `Link 3 notes`)
   - For media assets (PNG, JPG, SVG, MP4, MP3, PDF): `Embed "photo.png"` (or `Embed 2 media files`)
   - For folders: `Link folder "Folder Name"`
4. Release the cursor at the desired text position. The extension calculates the exact text coordinates in the editor and inserts formatted `[[WikiLinks]]` for notes and `![[Media.ext]]` embeds for media files with instant live preview rendering.

### 2. Inspecting Incoming Backlinks
1. Open any note in Noether.
2. Open the right sidebar and switch to the **Backlinks** tab (or press `Ctrl+K` and type "Open Backlinks").
3. View the list of notes linking to your current document, complete with context snippets showing where each link appears.
4. Click any backlink snippet to jump directly to that note and scroll to the link position.

### 3. Converting Unlinked Mentions
1. In the right sidebar Backlinks tab, expand the **Unlinked Mentions** section.
2. Noether displays every sentence across your vault where this note's title was written in plain text.
3. Click the **Link** button beside any mention to automatically convert that plain text into a formal `[[Note Title]]` WikiLink in the source file.

### 4. In-Document Footer Widget
- If enabled in settings, every note renders a clean backlinks section at the very end of the text.
- Provides immediate awareness of incoming references without needing to keep the sidebar open.

### 5. Keyboard Shortcuts & Commands

| Action | Shortcut / Access | Description |
| :--- | :--- | :--- |
| **Open Backlinks Panel** | Command Palette | Opens the right sidebar and activates the Backlinks tab. |
| **Toggle In-Doc Backlinks** | Command Palette | Toggles the bottom-of-note backlinks footer on or off. |
| **Drag & Drop Link Insertion** | Mouse Drag from Sidebar | Inserts `[[WikiLink]]` or `![[Embed]]` at cursor position. |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Backlinks extension demonstrates how to inject document footers, bind status bar indicators, consume drag-and-drop lifecycle events via the `EventBus`, and query the vault link graph via the Noether SDK.

### SDK Extension Points Used
- `this.registerSidebarTab()`: Registers an inspector tab in the right sidebar.
- `this.registerDocumentFooter()`: Injects a reactive React widget beneath the editor text content.
- `this.addStatusBarItem()`: Adds a dynamic status counter to the window's bottom bar.
- `this.registerEvent()`: Subscribes to `this.app.events.on('drag:drop', ...)` to consume editor drops.
- `this.registerTool()`: Exposes MCP AI tools for bidirectional link discovery, mention conversion, and link insertion.

### Real SDK Implementation Pattern

Extension builders can implement document footers, drag-and-drop drop consumers, and sidebar inspectors with this SDK pattern:

```typescript
import { Extension, NoetherApp, isMediaFileName } from 'noether';
import React from 'react';

export default class DocumentGraphContextExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Consume Drag & Drop to Insert Links & Embeds
    this.registerEvent(
      this.app.events.on('drag:drop', (data) => {
        const { item, items, clientX, clientY, dropTarget } = data;
        if (!item && (!items || items.length === 0)) return;

        const editorEl = dropTarget?.closest('.tiptap.prose, [data-editor-view="true"]');
        if (!editorEl) return;

        const editor = this.app.editor.getActiveEditor();
        if (!editor || !editor.view) return;

        const posInfo = editor.view.posAtCoords({ left: clientX, top: clientY });
        const targetPos = posInfo ? posInfo.pos : editor.state.doc.content.size;

        const droppedList = items && items.length > 0 ? items : (item ? [item] : []);
        const formatted = droppedList.map((doc) => {
          if (isMediaFileName(doc.title)) return `![[${doc.title}]]`;
          const clean = doc.title.replace(/\.md$/, '');
          return `[[${clean}]]`;
        }).join('\n');

        editor.chain().focus().insertContentAt(targetPos, formatted).run();
      })
    );

    // 2. Inject a Widget at the Bottom of Every Note
    this.registerDocumentFooter({
      id: 'custom-link-footer',
      order: 20,
      render: ({ documentId, documentTitle }) => (
        <div className="mt-8 pt-4 border-t border-[var(--noether-border-muted)]">
          <h4 className="text-xs uppercase tracking-wider text-[var(--noether-text-muted)] mb-2">
            Related Documents for {documentTitle}
          </h4>
        </div>
      ),
    });

    // 3. Add Status Bar Indicator
    this.addStatusBarItem({
      id: 'active-doc-link-count',
      position: 'right',
      render: (app: NoetherApp) => {
        const count = app.workspace.backlinkCount || 0;
        return React.createElement(
          'span',
          { className: 'text-xs text-[var(--noether-text-muted)] cursor-default' },
          `🔗 ${count} links`
        );
      },
    });
  }
}
```

### Link Graph Indexing Architecture
1. **Extraction**: When a document is saved, internal WikiLinks (`[[Target Note]]`) and aliases (`[[Target Note|Alias]]`) are parsed using fast regex tokenizer passes.
2. **SQLite Database**: Links are indexed into parameterized `document_links` SQLite tables with source and target foreign keys.
3. **Instant Traversal**: Backlink and mention queries execute as indexed SQLite joins, delivering 0ms graph lookups even across vaults with tens of thousands of notes.

## 4. MCP Tools Reference

Backlinks registers five MCP tools for agentic exploration and manipulation of note connections:

### 1. `backlinks_get_incoming`
- **Description**: Retrieves all documents linking to a target note, with snippet previews.
- **Parameters**:
  - `documentId` (string, required): The target document ID.
- **Returns**: List of backlinks with source document titles, IDs, and link counts.

### 2. `backlinks_get_outgoing`
- **Description**: Extracts all outgoing WikiLinks and references from a document.
- **Parameters**:
  - `documentId` (string, required): The source document ID.
- **Returns**: Array of outgoing link targets and raw anchor text.

### 3. `backlinks_get_unlinked_mentions`
- **Description**: Discovers plain-text occurrences of a note's title that are not yet linked.
- **Parameters**:
  - `documentId` (string, required): Target document identifier.
  - `title` (string, required): The title string to search for across notes.
- **Returns**: Array of unlinked mentions with source IDs and surrounding context sentences.

### 4. `backlinks_convert_mention`
- **Description**: Converts a plain-text mention in a source note into a formal `[[WikiLink]]`.
- **Parameters**:
  - `sourceDocumentId` (string, required): Note where the mention appears.
  - `title` (string, required): Title string to wrap in brackets.
- **Returns**: Confirmation payload with operation success status.

### 5. `backlinks_insert_link`
- **Description**: Inserts a formatted `[[WikiLink]]` or `![[Media]]` embed into the active note at a specific character position.
- **Parameters**:
  - `targetTitle` (string, required): Title or filename of the document or media asset to link/embed.
  - `isEmbed` (boolean, optional): Whether to format as a media embed (`![[target]]`) rather than standard link (`[[target]]`).
  - `position` (number, optional): Character index to insert at (defaults to end of document).
- **Returns**: Confirmation payload containing the formatted string and insertion position.
