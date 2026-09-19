# Covers

Add header banner images to notes with Wallhaven wallpaper search, offline presets, and drag repositioning.

## 1. How It Works
---

Hover above your note title in the editor and click **Add cover** (or run `Covers: Add cover image` from `Ctrl+K`). You can pick from three sources:

- **Wallhaven**: Search online wallpapers by keyword (e.g. `pixel art`, `minimal`, `cyberpunk`).
- **Offline Presets**: Curated gradients and abstract textures bundled with the app, available without an internet connection.
- **Custom URL or Local File**: Paste an image link or select any local image attachment in your vault.

To adjust the crop, hover over the banner, click **Reposition**, drag the image up or down to set the focal point, and click **Save**.

## 2. Where Cover Data Lives
---

Covers writes directly to your note's YAML frontmatter. It never touches your Markdown body text:

```yaml
---
cover: "assets/banner.png"
cover_position: 0.35
---
```

Because it uses standard frontmatter keys, your cover choices stay intact if you sync your vault or view notes in other markdown editors.

## 3. Configuration
---

In **Settings (`Ctrl+,`) → Covers**, you can:

- Adjust the default banner height (from 180px to 320px).
- Toggle the bottom gradient fade that blends the image into your note's background color.
- Remove or change existing covers at any time.

