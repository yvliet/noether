# Covers

Covers adds header banner images to your notes with image search, offline gradient presets, and vertical alignment controls.

## 1. Overview
---

Adding a cover image gives your notes a visual header. Cover metadata is stored cleanly in your note's YAML frontmatter (`cover: ...`), so your images stay consistent across devices.

## 2. Add a Cover to a Note
---

1. Hover over the area above the note title in the editor.
2. Click **Add cover**.
3. Choose an image source from the popup modal:
   - **Search Wallhaven**: Search millions of wallpapers by keyword.
   - **Offline Presets**: Pick from built-in gradients and minimalist abstract art.
   - **Custom URL / File**: Paste any image web link or select a local image from your vault.

## 3. Reposition and Adjust Cover
---

1. Hover over the cover banner.
2. Click **Reposition**.
3. Drag the image up or down to adjust which part is visible.
4. Click **Save position**.

## 4. Settings & Styles
---

Open **Settings (`Ctrl+,`) → Covers** to customize banner behavior:

- **Banner Height**: Set the default height for covers (e.g. 180px to 320px).
- **Fade Effect**: Enable a sleek bottom-to-top gradient fade into the editor background.
- **Auto-Suggest**: Suggest relevant banners based on note title keywords.

## 5. Keyboard Shortcuts & Commands
---

| Command | Action |
| :--- | :--- |
| `Command Palette → Covers: Add cover image` | Open cover image picker for active note |
| `Command Palette → Covers: Remove cover image` | Remove cover from active note |
| `Command Palette → Covers: Reposition cover` | Enter reposition mode |

> [!NOTE]
> Covers never alters the text content of your document. It only writes the image path or URL to the `cover` key in the frontmatter block.
