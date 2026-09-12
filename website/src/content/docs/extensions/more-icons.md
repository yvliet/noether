# More icons

More icons transforms visual indicators into first-class citizens across your entire Noether workspace. From folders, notes, canvases, and tabs to in-document rich-text icon chips, More icons lets custom iconography live everywhere in Noether with instant rendering and persistent SQLite storage.


## 1. Overview & Architecture

---

Visual cues dramatically speed up workspace navigation. When scanning a vault with hundreds of project notes, distinctive icons allow you to spot key documents in milliseconds without reading every title.

More icons integrates with Noether through four foundational capabilities:

- **Local SQLite Persistence**: Custom icon assignments are stored in the local SQLite table `ext_more_icons`. When opening a vault, icon mappings are loaded into an in-memory cache, ensuring 0ms layout shift.
- **Unified Multi-Pack Catalog**: Access 6,700+ curated HugeIcons and universal Unicode emoji through a unified selector interface.
- **Universal Decorators**: Icons attach to the file tree, tab headers, sub-header breadcrumbs, and document titles.
- **In-Document Rich-Text Chips**: The `/icon` slash command allows you to insert clickable icon chips directly into document prose.


## 2. Customizing Folders and Files

---

You can customize icons anywhere in your file hierarchy without modifying the underlying markdown files on disk.

### Assigning an Icon
1. Right-click any folder or note in the left sidebar file tree (or right-click an open tab).
2. Select **Change icon...** from the context menu to open the icon picker.
3. Search for an icon name (e.g. `folder`, `sparkles`, `database`, `terminal`) or switch to the **Emoji** tab.
4. Optionally choose a custom accent color from the palette.
5. Click an icon to apply it instantly across the file tree, active tab, and breadcrumb trail.

### Removing an Icon
- To revert an item back to its default appearance, right-click it and select **Remove custom icon**, or click **Reset default icon** from within the icon picker.


## 3. In-Document Icon Chips & `/icon` Slash Command

---

More icons allows inserting visual badges directly into note text, perfect for status flags, callout labels, and structured checklists.

### Inserting an Icon Chip
1. Type `/icon` on any line in the editor to open the inline icon selector.
2. Search and select an icon using arrow keys and `Enter`.
3. The icon renders as an interactive inline chip inside the editor.

### Lossless Markdown Serialization
In-document icon chips are stored cleanly in your `.md` files using namespaced shortcodes:

```markdown
# Project Launch Checklist

- :hugeicons:sparkles: High-priority launch goals
- :hugeicons:rocket: Deploy production backend
- :emoji:🔥: Urgent bugfix verification
```

When you open your note in an external editor like VS Code or Obsidian, the shortcodes remain readable text. When opened in Noether, the live preview renders them as crisp vector icons.

### Inline Customization
- **Color Popover**: Click any icon chip in your document to open a color picker and adjust its tint.
- **Keyboard Deletion**: Press `Backspace` immediately after an icon chip to delete it just like a regular character.


## 4. General Configuration & Toggles

---

Configure More icons behavior in *Settings → More icons*.

- **Folder Icons**: Enables custom icon rendering for folders.
- **File Icons**: Enables custom icon rendering for notes and canvases.
- **In-Document Icons**: Toggles the `/icon` slash command and inline icon chips.
- **Show default folder icons**: Displays default open and closed folder icons beside tree chevrons when no custom icon is assigned (disabled by default for a clean, minimalist tree).
- **Show default file icons**: Displays document icons next to uncustomized notes in the file tree.
- **Show icon next to note title in editor**: Renders the assigned note icon beside the document heading in the main editor.
- **Emoji Style**: Switch emoji rendering between Native (System), Twemoji, Apple Emoji, Google Noto, or WhatsApp Emoji.


## 5. Model Context Protocol (MCP) Integration

---

More icons exposes tools via the Model Context Protocol so local AI assistants can view and customize icons on your behalf.

### Available Tools
- `more-icons_list` (alias `iconify_list`): List all customized items in the active Vault.
  - Parameters: `type` (`'all'`, `'folder'`, `'file'`).
- `more-icons_get` (alias `iconify_get`): Retrieve the assigned icon for a specific document ID.
  - Parameters: `itemId` (string).
- `more-icons_update_icon` (alias `iconify_update_icon`): Assign an icon to a folder or file.
  - Parameters: `itemId` (string), `iconId` (string), `color` (optional string), `itemType` (`'folder'` or `'file'`).
- `more-icons_delete_icon` (alias `iconify_delete_icon`): Reset an item back to its default appearance.
  - Parameters: `itemId` (string).
