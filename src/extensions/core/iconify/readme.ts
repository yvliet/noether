export const iconifyReadme = `# Iconify Extension
**Author**: Yuliet Li  
**Version**: 1.0.0

**Iconify** allows you to assign distinctive HugeIcons to any folder, file, note, canvas, or tab in Flint, with real-time search filtering, instant local caching, and persistent SQLite storage.

---

## Key Features

1. **Universal Customization Across Folders & Files**:
   - Assign custom icons to both **folders** and **files** (markdown notes, canvas boards, media).
   - In the file tree, right-click any folder or file to access **"Change icon..."**.
   - Directly choose from an extensive library of 6,700+ curated HugeIcons.
   - Quickly remove or reset custom icons whenever needed.

2. **Tab Header Integration**:
   - Tabs for notes with custom icons automatically render the customized icon in the window tab bar.
   - Right-click any open tab to change or remove its icon directly.

3. **Editor Document Menu Action**:
   - Access **"Change note icon"** directly from the editor's three-dot document menu.

4. **Curated Icon Selector**:
   - Fast keyword search across icon names, synonyms, and categories.
   - Organized category tabs: \`Common\`, \`Content\`, \`Status\`, \`Tech\`, \`Media\`, and \`Tools\`.
   - Visual checkmark indicators and instant live previews.

5. **Zero-Latency In-Memory Execution**:
   - Active icons are cached in-memory with Zustand for 0ms render times upon startup and page reloads.
   - Icon assignments persist securely in your Hearth's local SQLite database.
   - Automatic cleanup when documents or folders are deleted.

6. **MCP Agent Tools**:
   - AI assistants and MCP clients can inspect, assign, list, and remove icons programmatically.

---

## MCP Tools Reference

- \`iconify_list\`: List all items with custom icons assigned (optional \`type\` filter: \`all\`, \`folder\`, \`file\`).
- \`iconify_get\`: Get the custom icon for a specific folder or file by ID.
- \`iconify_set\`: Assign a custom icon to an item by ID with optional hex color.
- \`iconify_remove\`: Remove a custom icon from an item, reverting it to the default icon.
`;
