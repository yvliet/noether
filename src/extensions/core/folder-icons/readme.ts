export const folderIconsReadme = `# Folder Icons Plugin
**Author**: Yuliet Li  
**Version**: 1.0.0

**Folder Icons** allows you to assign distinctive HugeIcons to any folder in your Hearth file tree with smooth hover transitions, real-time search filtering, and persistent SQLite storage.

---

## Key Features

1. **Context Menu Customization**:
   - Right-click any folder in the left sidebar to access **"Change folder icon..."**.
   - Directly choose from an extensive library of curated HugeIcons.
   - Quickly remove or reset custom icons whenever needed.

2. **Cascade-Style Hover Transformation**:
   - Folders display your custom icon by default for immediate visual identification.
   - Hovering the folder row smoothly animates the custom icon away and reveals the standard chevron expand/collapse indicator.
   - Preserves 100% of native folder toggling, drag-and-drop, and sub-folder navigation behavior.

3. **Curated Icon Selector**:
   - Fast keyword search across icon names, synonyms, and categories.
   - Organized category tabs: \`Common\`, \`Content\`, \`Status\`, \`Tech\`, \`Media\`, and \`Tools\`.
   - Visual checkmark indicators and instant live previews.

4. **Zero-Latency In-Memory Execution**:
   - Active folder icons are cached in-memory with Zustand for 0ms render times in large vaults.
   - Icon assignments persist securely in your Hearth's local SQLite database.
   - Automatic cleanup when folders are deleted from your vault.

5. **MCP Agent Tools**:
   - AI assistants can inspect, assign, list, and reset folder icons programmatically via MCP.

---

## MCP Tools Reference

- \`folder-icons_list\`: List all folders with custom icons assigned.
- \`folder-icons_get\`: Get the custom icon for a specific folder.
- \`folder-icons_set\`: Assign a custom icon to a folder by ID.
- \`folder-icons_remove\`: Remove a custom icon from a folder.
`;
