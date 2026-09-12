export const sketchReadme = `# Sketch

Freehand vector drawing and markup overlay directly over your notes and documents.

---

## 1. Overview & User Experience

Conventional note-taking apps force hand-drawn sketches into rigid rectangular image boxes in the middle of your text. 

**Sketch** takes a completely different approach by rendering a **transparent vector overlay** across your document. You can circle words, underline paragraphs, write margin annotations, and sketch quick diagrams directly on top of your live text without breaking your layout.

When drawing mode is closed, all your drawings remain sharp and visible while pointer events pass through completely. You can select words, click wikilinks, and edit text normally without accidental pen strokes.

### Where It Lives in Noether
- **Document Sub-Header**: Click the pencil icon in the note sub-header bar to toggle the drawing HUD.
- **Floating Drawing HUD**: A minimal desktop toolbar offering Select, Pen, Highlighter, Eraser, color swatches, stroke widths, and undo/redo.
- **Global Hotkey**: Press \`Ctrl+Shift+S\` to instantly toggle the drawing layer on and off.
- **Settings**: Configure default pen colors and stroke widths under **Settings** (\`Ctrl+,\`) → **Sketch**.

## 2. Features & Step-by-Step Guide

### 1. Drawing Modes & Tool Palette
1. Press \`Ctrl+Shift+S\` (or click the pen icon in the note sub-header) to open the floating toolbar.
2. Select your tool:
   - **Pen (\`B\` / \`P\`)**: Crisp, responsive vector lines for handwriting, arrows, and diagrams.
   - **Highlighter (\`H\`)**: Semi-transparent, wide color wash that lets text shine through.
   - **Eraser (\`E\`)**: Object-aware stroke eraser that removes entire strokes on contact.
   - **Select & Move (\`V\`)**: Marquee select strokes with transform bounding boxes to move or resize drawings.
3. Pick from curated color presets or choose stroke widths (fine, medium, bold).

### 2. Two Anchoring Modes
- **Text Flow (Default)**: Drawings anchor to the content column and scroll naturally along with your paragraphs.
- **Screen Glass**: Drawings lock to the active screen viewport, perfect for presentation notes or temporary scratchpads.

### 3. Non-Destructive Markdown Storage
Drawings never corrupt your note files. Stroke data is indexed in SQLite and embedded at the very bottom of your \`.md\` file as a hidden HTML comment (\`<!-- noether-sketch: ... -->\`). In VS Code, GitHub, and Obsidian, your notes stay 100% clean and readable.

### 4. Keyboard Shortcuts

| Tool / Action | Shortcut | Description |
| :--- | :--- | :--- |
| **Toggle Sketch HUD** | \`Ctrl+Shift+S\` | Opens or closes the drawing canvas and toolbar. |
| **Select & Move Tool** | \`V\` | Enables marquee selection and bounding box manipulation. |
| **Pen Tool** | \`B\` / \`P\` | Switches to freehand vector pen. |
| **Highlighter Tool** | \`H\` | Switches to semi-transparent highlighter brush. |
| **Eraser Tool** | \`E\` | Erases vector strokes on contact. |
| **Undo / Redo** | \`Ctrl+Z\` / \`Ctrl+Y\` | Steps backward or forward in stroke history. |
| **Delete Selection** | \`Delete\` / \`Backspace\` | Removes currently selected strokes. |
| **Close HUD / Deselect** | \`Escape\` | Clears stroke selection or closes the drawing overlay. |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Sketch extension demonstrates how to inject custom visual overlay layers and document transform serialization hooks via the Noether SDK.

### SDK Extension Points Used
- \`this.registerPortalSlot()\`: Mounts interactive React overlays into host layout portals (\`editor:content-overlay\`, \`editor:viewport-overlay\`, \`editor:subheader-actions\`).
- \`this.registerDocumentTransformHook()\`: Injects export/import hooks to serialize custom data alongside Markdown files non-destructively.
- \`this.defineTable()\`: Declares the SQLite schema for local vector stroke storage.
- \`this.onEvent('document:deleted')\`: Automatically cleans up stroke records when notes are deleted.
- \`this.registerTool()\`: Exposes MCP AI tools for inspecting drawing metadata and exporting clean SVG vector graphics.

### Real SDK Implementation Pattern

Extension builders can mount React overlays and intercept Markdown export with this SDK pattern:

\`\`\`typescript
import { Extension, NoetherApp } from 'noether';
import React from 'react';

export default class FloatingAnnotationExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Mount Overlay Portal Slot directly over Editor Content
    this.registerPortalSlot({
      id: 'custom-annotation-layer',
      slot: 'editor:content-overlay',
      order: 20,
      render: (context) => (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Custom SVG canvas or interactive annotations */}
        </div>
      ),
    });

    // 2. Intercept Document Export to append non-destructive metadata
    this.registerDocumentTransformHook({
      id: 'custom-metadata-sync',
      transformExport: async ({ documentId, markdown }) => {
        const metadata = await this.loadMetadata(documentId);
        if (!metadata) return markdown;
        return markdown + \`\\n<!-- custom-data: \${JSON.stringify(metadata)} -->\\n\`;
      },
      transformImport: ({ markdown }) => {
        // Strip comment from editor view buffer
        const clean = markdown.replace(/<!-- custom-data: [\\s\\S]*? -->/, '');
        return { cleanMarkdown: clean };
      },
    });
  }
}
\`\`\`

## 4. MCP Tools Reference

Sketch registers three MCP tools for AI and external inspection:

### 1. \`sketch_get_document_drawings\`
- **Description**: Inspects drawing metadata, stroke counts, tools used, and anchoring mode for a given note.
- **Parameters**:
  - \`documentId\` (string, required): The document ID to inspect.
- **Returns**: Object with \`hasDrawings\`, \`strokeCount\`, \`toolsUsed\`, \`colorsUsed\`, and \`anchoring\`.

### 2. \`sketch_export_svg\`
- **Description**: Generates standalone SVG vector XML graphics from a note's vector strokes.
- **Parameters**:
  - \`documentId\` (string, required): The document ID to export.
- **Returns**: Valid XML string of the standalone \`<svg>\` graphic.

### 3. \`sketch_delete_drawings\`
- **Description**: Clears all vector drawings from a note (destructive action).
- **Parameters**:
  - \`documentId\` (string, required): The target document ID.
`;
