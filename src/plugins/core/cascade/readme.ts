export const cascadeReadme = `# Cascade Plugin
**Author**: Yuliet Li  
**Version**: 1.0.0

**Cascade** allows you to turn notes into organized, sequential cascades (books) with status-bar linking, sequential navigation, graph-view backlinks without markdown clutter, and a dedicated left sidebar tab next to Bookmarks.

---

## Key Features

1. **Dedicated Cascade Sidebar Tab**:
   - Registers a dedicated **Cascade icon** on the top-left header right next to Bookmarks.
   - Houses all sequential cascade books and chapters in a dedicated view instead of cluttering file navigation.
   - Create new cascade books, search pages, reorder, and drag-and-drop notes directly.

2. **Status Bar Cascade Linking**:
   - Registers an interactive **Cascade icon** on the status bar.
   - Click to link notes into sequential books or adjust page numbers.
   - Automatically registers sequential backlinks into SQLite so Flint's **Graph View** displays connected nodes without modifying your note content.

3. **Sequential Page Navigation**:
   - Navigate backwards with \`Alt + ,\` (Previous page).
   - Navigate forwards with \`Alt + .\` (Next page).
   - Fully customizable hotkeys in Flint settings.

4. **Slash Command & Palette Integration**:
   - Type \`/cascade\` in the editor to quickly assign or reassign notes to cascades.
   - Type \`/cascade-next\` or \`/cascade-prev\` to turn pages.

5. **Automatic Properties & Naming**:
   - Automatically sets the \`Cascade Page\` property.
   - Automatically appends \` [n]\` to the note name (e.g. \`Untitled [1]\`).
   - Deleting the property removes the note from the cascade and restores the title.
`;
