# More Icons

Custom vector icons and colors for files, folders, editor tabs, and inline text chips.

## 1. Overview & Storage
---

More Icons lets you attach vector glyphs from HugeIcons or custom SVGs to files, folders, and tabs in Noether. It also supports inline icon chips inside notes via the `/icon` slash command.

- **Persistence**: File and folder icon mappings are stored in the `ext_more_icons` SQLite table and cached in memory at startup to avoid layout shifts when the sidebar renders.
- **Shortcode Serialization**: Inline icon chips in Markdown are saved as plain text shortcodes (`:hugeicons:sparkles:`, `:emoji:🔥:`), so notes remain readable in other editors like VS Code or Obsidian.
- **Color Accents**: Each icon can have an optional hex color tint or inherit the current theme text color.

## 2. Setting Icons
---

Right-click any folder, note, or open tab and select **Change icon...** (or run `Icons: Set icon for active note` from `Ctrl+K`):

- **Search**: Find glyphs by keyword (e.g. `database`, `terminal`, `book`, `code`).
- **Accent Color**: Pick a color swatch or leave it neutral.
- **Reset**: Click **Reset default icon** or right-click the item and choose **Remove custom icon**.

## 3. Inline Icon Chips (`/icon`)
---

Type `/icon` on any line in the editor to open the inline picker. Selecting an icon inserts an interactive chip:

```markdown
# Launch Checklist

- :hugeicons:sparkles: Product roadmap review
- :hugeicons:rocket: Deploy backend updates
- :emoji:🔥: Verify bugfixes
```

Clicking an icon chip in the editor opens a popover to adjust its color. Pressing `Backspace` immediately after a chip deletes it like a regular character.

## 4. MCP Tools Reference
---

More Icons registers the following MCP tools for AI agents and scripts:

- `more-icons_list`: List all customized folders and files in the active vault.
  - Parameters: `type` (`'all'`, `'folder'`, `'file'`).
- `more-icons_get`: Retrieve the assigned icon and color for a given item path or ID.
  - Parameters: `itemId` (string).
- `more-icons_update_icon`: Assign an icon to a folder or file.
  - Parameters: `itemId` (string), `iconId` (string), `color` (optional string), `itemType` (`'folder'` or `'file'`).
- `more-icons_delete_icon`: Reset an item back to its default appearance (`isDestructive: true`).
  - Parameters: `itemId` (string).

