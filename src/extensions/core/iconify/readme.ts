export const iconifyReadme = `# Iconify: Let Icons Live in All of Flint

**Version**: 1.1.0  
**Author**: Yuliet Li

**Iconify** transforms icons into first-class visual citizens across your entire Flint workspace. From folders, files, notes, canvas boards, and tabs to inline rich-text documents and notes, Iconify lets icons live everywhere in Flint with an extensible multi-pack architecture and persistent SQLite storage.

---

## Key Features

### 1. In-Document Icons & \`/icon\` Slash Command
- Type \`/icon\` anywhere in a note to open the icon flyout picker directly beside your cursor.
- Filter through curated icons or search the entire library in real time.
- Renders as a native inline visual chip in Flint WYSIWYG mode.
- Lossless Markdown round-trip serialization: stored cleanly as \`:<pack>:<iconId>:\` in your \`.md\` files (e.g. \`:hugeicons:sparkles:\` or \`:emoji:fire:\`).
- Click any icon chip in your document to open a quick popover to change its color or remove it.
- Seamless keyboard interaction: Backspace removes the icon chip instantly just like any native character.

### 2. Universal Customization Across Folders & Files
- Assign custom icons to both **folders** and **files** (notes, canvases, attachments).
- Right-click any folder or file in the file tree to access **"Change icon..."**.
- Choose from 6,700+ curated HugeIcons or universal Unicode emojis.
- Custom icons display seamlessly across the file tree, tab bar, and navigation breadcrumbs.

### 3. Extensible Multi-Pack Architecture
- Built upon Flint's host-level \`IconRegistry\` (\`app.icons\`).
- Ready for future icon pack importers (Lucide, React Icons, FontAwesome, custom SVGs) without core codebase modifications.
- Namespaced shortcodes prevent naming collisions across different icon ecosystems.

### 4. Granular Feature Toggles
- Customize exactly where icons appear with dedicated feature switches:
  - **Folder Icons**: Toggle folder icon customization in the file tree and breadcrumbs.
  - **File Icons**: Toggle note, canvas, and file icon customization in the file tree.
  - **In-Document Icons**: Toggle the \`/icon\` slash command and inline document icon chips.

### 5. Zero-Latency Native Performance
- In-memory Zustand state and dynamic SVG loading for instant 0ms rendering on app boot.
- Zero micro-interaction animation delays: menus, toggles, flyouts, and popovers open and close immediately.
- Solid SQLite persistence with automatic orphaned record cleanup when notes or folders are deleted.

---

## Markdown Syntax Reference

| Rendered In Flint | Stored in Markdown (\`.md\`) | Description |
| :--- | :--- | :--- |
| ✨ Sparkles | \`:hugeicons:sparkles:\` | HugeIcons vector icon |
| 🔥 Fire | \`:emoji:🔥:\` | Unicode emoji icon |
| 🚀 Rocket | \`:hugeicons:rocket:\` | HugeIcons vector icon |

---

## MCP Tools Reference

- \`iconify_list\`: List all items with custom icons assigned (optional \`type\` filter: \`all\`, \`folder\`, \`file\`).
- \`iconify_get\`: Get the custom icon for a specific folder or file by ID.
- \`iconify_set\`: Assign a custom icon to an item by ID with optional hex color.
- \`iconify_remove\`: Remove a custom icon from an item, reverting it to the default icon.
`;
