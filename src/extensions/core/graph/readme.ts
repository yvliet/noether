export const graphReadme = `# Interactive Graph View

Force-directed 2D network visualization of notes, tags, and internal link topologies.

---

## Overview

The **Interactive Graph View** renders your entire vault as a dynamic, force-directed network graph using WebGL and Canvas 2D. Nodes represent notes, edges represent bidirectional WikiLinks, and color groups highlight tag clusters and folders.

---

## Architecture & Flint APIs

This extension showcases full-page custom views, 2D simulation engines, and filter search syntax.

### 1. View & Action Rail Registration
\`\`\`tsx
this.app.views.registerView({
  type: 'graph',
  title: 'Graph View',
  icon: <FlowConnectionIcon size={14} />,
  render: () => <GraphView />,
});

this.addActionRailIcon(
  'open-graph-view',
  <FlowConnectionIcon size={16} />,
  'Open Graph View',
  () => {
    this.app.workspace.openCustomTab({
      viewType: 'graph',
      title: 'Graph View',
      documentId: '__graph__',
    });
  }
);
\`\`\`

---

## Force Simulation Engine

The graph physics engine runs iterative velocity updates based on:
1. **Charge / Repulsion**: Nodes repel each other using Coulomb forces ($F = k \\cdot q_1 q_2 / r^2$).
2. **Link Spring Force**: Connected nodes are drawn together by Hooke's law ($F = -k \\cdot (d - d_0)$).
3. **Centering Gravity**: Pulls disconnected clusters toward the canvas viewport origin.

---

## Developer Guide: Custom Graph Shaders

\`\`\`tsx
import { Extension } from '@/core/extensions/Extension';

export class GraphThemeExtension extends Extension {
  async onload() {
    this.app.events.on('graph:init', ({ renderer }) => {
      renderer.setNodeColor((node) =>
        node.tags.includes('priority') ? '#ef4444' : '#3b82f6'
      );
    });
  }
}
\`\`\`
`;
