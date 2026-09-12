# TypeScript API: Dynamic React Portal Slots

Noether allows extensions to mount React components directly into host layout regions (`workspace:root`, `editor:floating-toolbar`, `editor:minimap`) without DOM mutation or CSS monkey-patching.


## 1. Registering a Portal Slot

---

```typescript
import React from 'react';
import { PortalSlotLocation } from 'noether';

this.registerPortalSlot({
  id: 'reading-time-pill',
  slot: 'editor:floating-toolbar',
  order: 10,
  when: (ctx) => ctx.viewMode === 'Visible' && !!ctx.document,
  render: (ctx) => {
    const words = (ctx.document?.content || '').split(/\s+/).filter(Boolean).length;
    return (
      <div className="bg-surface border border-border px-2 py-0.5 rounded text-xs text-muted shadow-sm">
        ⏱️ {Math.ceil(words / 200)} min read
      </div>
    );
  },
});
```


## 2. Available Host Slot Locations

---

- `workspace:root`: Full viewport modal overlays, HUD widgets, and floating draw panels.
- `editor:subheader-actions`: Action button dock in the document subheader immediately to the left of the Reading / Editing view toggle button.
- `editor:content-overlay`: In-editor canvas overlay mounted inside the scrollable document content column, scrolling naturally with text paragraphs.
- `editor:viewport-overlay`: In-editor canvas overlay pinned to the screen viewport (fixed HUD glass).
- `editor:floating-toolbar`: Docked above the active editor selection or floating right.
- `editor:minimap`: Vertical right-side outline / overview strip next to editor.
- `sidebar:left:bottom`: Docked below the left file tree.
- `sidebar:right:bottom`: Docked below the backlinks outline panel.
