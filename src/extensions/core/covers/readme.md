# Covers

Custom banner cover images for notes with top-to-bottom fading, Wallhaven search, and offline presets.

---

## 1. Overview & User Experience

Notes in personal knowledge bases often deserve an inspiring visual identity. The Covers extension brings customizable header cover banners to notes in Noether, anchored directly underneath the subheader navigation bar. With rounded corners, dedicated side breathing room, and a smooth top-to-bottom fade into the note canvas, covers bring your note titles, properties, and content down gracefully without visual clutter.

Cover images can be discovered and applied in seconds through live Wallhaven wallpaper search, built-in offline artistic presets, local vault image attachments, or direct external URLs.

### Where It Lives in Noether

- **In-Document Header Banner**: Sits above the note content canvas inside the scroll container, with rounded borders and ambient fading.
- **Hover Quick Controls**: Hover over any cover banner to access instant `Change cover`, `Reposition`, and `Remove` actions.
- **Document Menu ("...")**: Quick-access `Add or change cover` action located in the top-right document dropdown menu.
- **Command Palette (`Ctrl+K`)**: Instant keyboard commands to add, change, reposition, or remove covers.
- **Settings Tab**: Dedicated preferences panel under `Settings` → `Covers` to configure default banner heights and fade toggles.

## 2. Features & Step-by-Step Guide

### 1. Adding a Cover Image

1. Open any note in Noether.
2. Click the document options menu (`...`) in the top-right corner and select **Add or change cover**, or press `Ctrl+K` and type `Covers: Add or change cover`.
3. In the cover picker modal, browse through the **Wallhaven** tab for online wallpapers, or switch to **Offline Presets** to select from bundled pixel art, landscapes, and gradients.
4. Click any image card to immediately apply it to your active note.

### 2. Live Wallhaven Wallpaper Discovery

1. In the cover picker modal, select the **Wallhaven** tab.
2. Enter any search query (e.g. `pixel art`, `cyberpunk`, `mountain lake`, `retro`) or click one of the quick filter tags.
3. Click **Search** to view high-resolution SFW wallpapers.
4. Select your preferred wallpaper to apply it directly to your note frontmatter.

### 3. Offline Presets for Air-Gapped Work

1. If you are offline or prefer instant local artwork, switch to the **Offline Presets** tab in the modal.
2. Filter by category: `Pixel Art`, `Nature`, `Cyberpunk`, or `Minimalist`.
3. Select any preset (such as the Pixel Train & Street banner) to load standalone SVG artwork instantly with zero network requests.

### 4. Interactive Vertical Repositioning

1. Hover over an existing cover banner and click the **Reposition** button.
2. Click and drag the image up or down with your mouse until the desired section of the artwork is framed.
3. Click **Save position** in the floating action bar to persist the vertical offset to the note.

### Keyboard Shortcuts & Commands

| Command | Shortcut | Description |
| :--- | :--- | :--- |
| `Covers: Add or change cover image` | Command Palette | Opens the cover picker modal for the active note |
| `Covers: Remove cover image from note` | Command Palette | Removes the cover image and position metadata from the active note |
| `Add or change cover` | Doc Menu (`...`) | Opens the cover picker modal from the document header |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Covers extension leverages Noether's Inversion of Control (IoC) architecture and dynamic Portal Slot Registry. Rather than injecting hardcoded native DOM nodes, it mounts into the host `'editor:banner'` portal slot using `this.registerPortalSlot()`.

Cover images are persisted directly to the note's frontmatter properties (`cover` and `cover_y`), ensuring full interoperability with plain Markdown files on disk and Obsidian Banners compatibility.

```typescript
import { Extension, NoetherApp } from 'noether';
import React from 'react';

export default class CustomBannerExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Mount banner into the general-purpose 'editor:banner' slot
    this.registerPortalSlot({
      id: 'custom-banner',
      slot: 'editor:banner',
      order: 10,
      predicate: (ctx) => {
        const props = ctx.document?.properties;
        return Boolean(props && (props.cover || props.banner));
      },
      render: ({ document, app }) => {
        const coverUrl = document?.properties?.cover;
        return React.createElement(
          'div',
          { className: 'w-full max-w-5xl mx-auto px-4 pt-3' },
          React.createElement('img', {
            src: coverUrl,
            className: 'w-full h-64 object-cover rounded-2xl',
          })
        );
      },
    });

    // 2. Register command palette shortcut
    this.addCommand({
      id: 'quick-add-banner',
      title: 'Custom Banner: Set Default Cover',
      action: async (app: NoetherApp) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc) return;
        await app.vault.setDocumentProperties(activeDoc.id, {
          ...activeDoc.properties,
          cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
        });
        app.workspace.showToast('Cover set', 'success');
      },
    });
  }
}
```

## 4. MCP Tools Reference

The Covers extension exposes 3 Model Context Protocol (MCP) AI tools to inspect and modify cover banners programmatically.

### 1. covers_get

Retrieves the current cover image URL and vertical positioning offset for a note.

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `documentId` | `string` | Yes | Unique document identifier to inspect |

#### Returns

```json
{
  "documentId": "doc-12345",
  "hasCover": true,
  "cover": "https://w.wallhaven.cc/full/...",
  "cover_y": 0.45
}
```

### 2. covers_set

Assigns a cover image URL, data URI, or vault attachment path to a document, with optional vertical repositioning offset.

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `documentId` | `string` | Yes | Unique document identifier to update |
| `url` | `string` | Yes | Web URL, data URI, or vault attachment filename |
| `position` | `number` | No | Vertical positioning offset between `0.0` (top) and `1.0` (bottom) |

#### Returns

```json
{
  "success": true,
  "documentId": "doc-12345",
  "cover": "https://w.wallhaven.cc/full/...",
  "cover_y": 0.45
}
```

### 3. covers_remove

Removes the cover image and positioning coordinates from a note. Marked as destructive.

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `documentId` | `string` | Yes | Unique document identifier to clear |

#### Returns

```json
{
  "success": true,
  "documentId": "doc-12345",
  "removed": true
}
```
