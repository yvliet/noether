# Covers

Custom banner cover images for notes with top-to-bottom fading, Wallhaven wallpaper search, and offline presets.

## 1. Overview & Visual Identity

---

Notes in personal knowledge bases often deserve an inspiring visual identity. The **Covers** extension brings customizable header cover banners to notes in Noether, anchored directly underneath the subheader navigation bar.

With rounded corners, dedicated side breathing room, and a smooth top-to-bottom fade into the note canvas, covers bring your note titles, properties, and content down gracefully without visual clutter.

- **Non-Bleed Layout**: The banner sits with dedicated side margins (~14px–16px), preserving the clean frame of your workspace rather than aggressively stretching edge-to-edge.
- **Top-to-Down Fade**: The artwork is fully visible at the top and seamlessly dissolves into the note background color toward the bottom, letting the note title and text flow naturally below.
- **Instant Discovery**: Discover artwork directly inside Noether through live Wallhaven search, offline presets, local vault image attachments, or custom links.
- **Interactive Repositioning**: Drag up or down on any cover to customize vertical framing and crop to the exact focal point.

## 2. Setting and Managing Covers

---

### Adding a Cover

1. Open any note in Noether.
2. Click the document options menu (`...`) in the top-right corner and select **Add or change cover**, or press `Ctrl+K` and run `Covers: Add or change cover`.
3. In the cover picker modal, browse through the **Wallhaven** tab for online wallpapers, or switch to **Offline Presets** to select from bundled pixel art, landscapes, and gradients.
4. Click any image card to immediately apply it to your active note.

### Wallhaven Wallpaper Search

1. In the cover picker modal, select the **Wallhaven** tab.
2. Enter any search query (e.g. `pixel art`, `cyberpunk`, `nature`, `retro`) or click one of the quick filter tags.
3. Click **Search** to view high-resolution SFW wallpapers.
4. Select your preferred wallpaper to apply it directly to your note frontmatter.

### Offline Presets

1. If you are offline or prefer instant local artwork, switch to the **Offline Presets** tab in the modal.
2. Filter by category: `Pixel Art`, `Nature`, `Cyberpunk`, or `Minimalist`.
3. Select any preset (such as the Pixel Train & Street banner) to load standalone SVG artwork instantly with zero network requests.

### Interactive Vertical Repositioning

1. Hover over an existing cover banner and click the **Reposition** button.
2. Click and drag the image up or down with your mouse until the desired section of the artwork is framed.
3. Click **Save position** in the floating action bar to persist the vertical offset to the note.

## 3. Storage & Frontmatter Compatibility

---

Cover images are persisted directly to the note's frontmatter properties, ensuring full interoperability with plain Markdown files on disk and Obsidian Banners compatibility:

- `cover`: Web URL, data URI, or vault attachment filename (e.g. `attachments/train.png`).
- `cover_y`: Vertical positioning offset between `0.0` (top) and `1.0` (bottom). Defaults to `0.5`.
- `banner`: Supported as an automatic fallback alias for notes migrating from Obsidian.

```yaml
---
title: Tuesday October 21, 2025
cover: "https://w.wallhaven.cc/full/2y/wallhaven-2y3g1m.jpg"
cover_y: 0.45
---
```

## 4. MCP AI Tools Reference

---

The Covers extension exposes 3 Model Context Protocol (MCP) AI tools for programmatic inspection and modification:

- `covers_get`: Inspect the current cover image URL, positioning offset, and presence for a given document ID.
- `covers_set`: Assign a cover image URL, data URI, or vault attachment path to a note, with optional vertical repositioning coordinate.
- `covers_remove`: Remove the cover image and positioning metadata from a note. Marked as destructive.

## 5. Keyboard Shortcuts & Commands

---

| Command | Shortcut | Description |
| :--- | :--- | :--- |
| `Covers: Add or change cover image` | Command Palette | Opens the cover picker modal for the active note |
| `Covers: Remove cover image from note` | Command Palette | Removes the cover image and position metadata from the active note |
| `Add or change cover` | Doc Menu (`...`) | Opens the cover picker modal from the document header |
