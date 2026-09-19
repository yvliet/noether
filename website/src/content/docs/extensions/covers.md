# Covers

Header banner images for notes with Wallhaven wallpaper search, offline presets, and drag-and-drop repositioning.

## 1. Overview
---

The Covers extension displays header banner images at the top of notes. It includes live search via the Wallhaven API, bundled offline presets, and vertical crop adjustments.

- **Layout & Framing**: The banner sits with 14px margins on each side to preserve workspace padding, with a gradient fade at the bottom that blends into the note background.
- **Pre-decoding & Caching**: Decoded image textures are cached in memory so switching between tabs doesn't produce blank pop-in frames.
- **Image Sources**: Supports Wallhaven search, local vault attachments (`attachments/banner.png`), external URLs, and bundled offline presets.

## 2. Frontmatter Schema
---

Cover metadata is saved directly to the note's YAML frontmatter:

```yaml
---
cover: "https://w.wallhaven.cc/full/2y/wallhaven-2y3g1m.jpg"
cover_y: 0.45
---
```

- `cover`: Web URL, data URI, or vault-relative attachment path.
- `cover_y`: Number between `0.0` (top) and `1.0` (bottom) representing the vertical crop position. Defaults to `0.5`.

Because this is standard frontmatter, external tools and other Markdown editors can read or ignore the keys without syntax issues.

## 3. MCP Tools Reference
---

Covers registers 3 MCP tools for AI agents and scripts:

- `covers_get`: Returns the current cover URL, position offset, and state for a note ID.
- `covers_set`: Sets the cover image and vertical offset on a note.
- `covers_remove`: Clears the `cover` and `cover_y` keys from note frontmatter (`isDestructive: true`).

