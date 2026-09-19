# TypeScript API: Dynamic React Portal Slots

Noether allows extensions to mount React components directly into host layout regions (`workspace:root`, `editor:floating-toolbar`, `editor:subheader-actions`) without DOM mutation or CSS monkey-patching.

## 1. Registering a Portal Slot
---

```typescript
import React from 'react';
import { PortalSlotLocation, PortalSlotContext } from 'noether';

this.registerPortalSlot({
  id: 'reading-time-pill',
  location: 'editor:subheader-actions' as PortalSlotLocation,
  order: 10,
  predicate: (ctx: PortalSlotContext) => Boolean(ctx.activeDoc),
  component: ({ activeDoc }) => {
    if (!activeDoc) return null;
    return (
      <div className="bg-surface border border-border px-2 py-0.5 rounded text-xs text-muted shadow-sm">
        Reading Mode Active
      </div>
    );
  },
});
```

## 2. Available Host Slot Locations (`PortalSlotLocation`)
---

- `'workspace:root'`: Full viewport modal overlays, HUD widgets, and floating draw panels.
- `'editor:banner'`: In-editor header banner slot mounted directly below the subheader bar, pushing document content down.
- `'editor:subheader-actions'`: Action button dock in the document subheader immediately to the left of the view mode dropdown.
- `'editor:content-overlay'`: In-editor canvas overlay mounted inside the scrollable document content column, scrolling naturally with text paragraphs.
- `'editor:viewport-overlay'`: Fixed in-editor glass HUD overlay pinned to the screen viewport.
- `'editor:floating-toolbar'`: Floating toolbar docked above the active editor selection or floating right.
- `'editor:minimap'`: Vertical right-side outline / overview strip next to editor.
- `'editor:gutter'`: Left-side editor gutter container for line badges and triggers.

