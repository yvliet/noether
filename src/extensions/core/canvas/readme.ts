export const canvasReadme = `# Infinite Spatial Canvas

An infinite 2D spatial canvas to map out notes, ideas, media cards, connections, and visual thinking.

---

## Overview

The **Infinite Canvas** plugin provides an infinite 2D workspace to organize knowledge spatially. It renders Markdown note cards, connection arrows, sticky notes, and media elements with 60fps pan and zoom performance.

---

## Architecture & Flint APIs

This plugin showcases how to build full-page custom views, register action rail entries, and manage custom tab types in Flint.

### 1. Registering Custom Main Views
Flint allows custom view types to be registered in the central view registry:

\`\`\`tsx
this.app.views.registerView({
  type: 'canvas',
  title: 'Canvas',
  icon: <Layout01Icon size={14} />,
  render: () => <CanvasView />,
});
\`\`\`

### 2. Action Rail Registration
Adding primary access buttons to the Action Rail:

\`\`\`tsx
this.addActionRailIcon(
  'open-canvas-view',
  <Layout01Icon size={16} />,
  'Infinite Canvas',
  () => {
    this.app.workspace.openCustomTab({
      viewType: 'canvas',
      title: 'Canvas',
      documentId: '__canvas__',
    });
  }
);
\`\`\`

---

## Spatial Coordinate System

- **Transform State**: Panning translates \`(panX, panY)\` and zooming scales \`scale\` from a unified matrix.
- **Node Collision & Virtualization**: Nodes offscreen are culled to maintain steady rendering framerates.
- **Edge Routing**: Bezier curve algorithms compute connector pathways between dynamic bounding boxes.

---

## Developer Guide: Creating Custom Canvas Nodes

\`\`\`tsx
import { Extension } from '@/core/extensions/Extension';

export class MindmapNodeExtension extends Extension {
  async onload() {
    // Extend canvas node types
    this.app.events.on('canvas:register-node-type', (registry) => {
      registry.register('mindmap-branch', {
        render: (props) => <div className="p-4 bg-[#202020] rounded-xl">{props.title}</div>,
      });
    });
  }
}
\`\`\`
`;
