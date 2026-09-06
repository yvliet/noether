/**
 * @module sketchReadme
 * @description
 * Documentation rendered for Flint Sketch in Extension Settings and the Marketplace.
 */

export const sketchReadme = `
# Sketch

Sketch is an ultra-lightweight freehand vector drawing and markup overlay for your notes and documents.

---

## 1. Overview
---

Unlike conventional note-taking tools that force your drawings into rigid, bounded rectangular boxes in the middle of your text, Sketch renders a **transparent vector overlay** on top of the document.

You can circle words, highlight paragraphs, write handwritten margin notes, and sketch diagrams directly over your markdown content without disrupting your text formatting.

---

## 2. Key Features
---

- **Zero Markdown Pollution**: The drawing data is stored in a clean SQLite index and synchronized as a hidden HTML comment (\`<!-- flint-sketch: ... -->\`) at the bottom of the \`.md\` file on disk. In Obsidian, GitHub, and VS Code, your notes stay 100% clean and readable.
- **Select & Move Mode**: Marquee drag to select strokes with Photoshop-style dashed bounding outlines, 8-point transform handles, and real-time translation.
- **Two Anchoring Modes**:
  - **Text Flow**: Drawings are anchored to the document content column and scroll naturally with your paragraphs.
  - **Screen Glass**: Drawings are pinned to the active viewport HUD, perfect for quick scratchpads or presentations.
- **Pass-Through Editing**: When sketching is inactive, all drawings remain visible while pointer events pass through completely. You can select words, click wikilinks, and edit text without accidental strokes.
- **Snappy Desktop HUD**: Minimal floating icon-only toolbar with Select, Pen, Highlighter, Eraser, curated color presets, stroke widths, and undo/redo stacks.

---

## 3. Keyboard Shortcuts
---

- \`Ctrl+Shift+S\`: Toggle Sketch overlay and drawing toolbar.
- \`V\`: Select & Move mode.
- \`B\` / \`P\`: Pen tool.
- \`H\`: Highlighter tool.
- \`E\`: Eraser tool.
- \`Ctrl+Z\`: Undo stroke.
- \`Ctrl+Y\`: Redo stroke.
- \`Delete\` / \`Backspace\`: Delete selected strokes.
- \`Escape\`: Deselect strokes or close toolbar.
`;
