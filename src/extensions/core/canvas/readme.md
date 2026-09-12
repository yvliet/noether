# Infinite Spatial Canvas

An infinite 2D spatial whiteboard to map out notes, ideas, media cards, connections, and visual thinking.

---

## 1. Overview & User Experience

Some ideas do not fit into linear paragraphs. Architecture diagrams, brainstorm clusters, visual storyboards, and multi-note research synopses thrive in open space.

The **Infinite Canvas** extension gives you an unbounded 2D visual playground. Place Markdown notes as live-rendered cards, add color-coded sticky notes, draw connection arrows between ideas, and navigate smoothly with 60fps pan and zoom controls.

### Where It Lives in Noether
- **Left Action Rail**: Click the Canvas icon in the action rail to launch or create a spatial board.
- **File Explorer**: Canvases appear as `.canvas` files in your file tree and can be created via the new canvas button.
- **Workspace Tabs**: Canvases open as dedicated full-page tabs that can be split side-by-side with Markdown notes.
- **Settings**: Adjust grid snaps, default card sizes, and render performance under **Settings** (`Ctrl+,`) → **Canvas**.

## 2. Features & Step-by-Step Guide

### 1. Creating and Navigating a Canvas
1. Click the **Canvas** icon in the Left Action Rail (or press `Ctrl+K` and type "New spatial canvas").
2. **Pan the Canvas**: Click and drag on the empty canvas background, or hold the `Spacebar` and drag.
3. **Zoom**: Use your mouse scroll wheel or trackpad pinch gestures to zoom smoothly in and out.
4. **Reset Zoom**: Double-click the zoom indicator in the canvas bottom dock to reset zoom to 100%.

### 2. Adding Cards & Nodes
- **Note Cards**: Drag any Markdown note from the left file explorer directly onto the canvas. The note renders as an interactive card displaying its title and content. Double-click the card header to jump directly into the full note editor.
- **Text & Sticky Notes**: Double-click anywhere on the empty canvas to create a fresh text card. Type quick thoughts, reminders, or headings.
- **Resizing & Moving**: Click any card to select it. Drag the card header to move it, or drag its corner resize handles to expand its dimensions.

### 3. Drawing Connection Lines
1. Hover over any card edge to reveal directional connection handles.
2. Click and drag from a handle toward another card.
3. Release to snap a directional arrow between the two ideas.
4. Customize edge labels and arrow directions by clicking on the connection line.

### 4. Keyboard Shortcuts

| Action | Shortcut | Description |
| :--- | :--- | :--- |
| **Pan Canvas** | `Spacebar + Drag` / `Middle Click + Drag` | Translates viewport across the infinite plane. |
| **Zoom In / Out** | `Ctrl + Scroll` / Trackpad Pinch | Smoothly scales canvas between 10% and 300%. |
| **Delete Card / Line** | `Delete` / `Backspace` | Removes currently selected nodes or edges. |
| **Select All Nodes** | `Ctrl+A` | Highlights all cards on the active board. |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Canvas extension demonstrates how to build standalone custom workspace views, register Action Rail buttons, define relational SQLite tables, and manage infinite coordinate systems via the Noether SDK.

### SDK Extension Points Used
- `this.registerView()`: Registers a full-page custom workspace view renderer (`canvas`).
- `this.addActionRailIcon()`: Adds an icon to the Left Action Rail with reactive active-state styling.
- `this.defineTable()`: Declares relational schemas for spatial cards (`canvas_nodes`) and connections (`canvas_edges`).
- `this.registerTool()`: Exposes MCP AI tools for programmatic spatial layout generation.

### Real SDK Implementation Pattern

Extension builders can create their own custom full-window views using this SDK pattern:

```typescript
import { Extension, NoetherApp } from 'noether';
import React from 'react';

export default class CustomBoardExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Register a Full-Window Custom Workspace View
    this.registerView({
      type: 'mindmap',
      title: 'Mindmap Board',
      icon: <MindmapIcon size={14} />,
      render: (props?: { tabId?: string; documentId?: string }) => (
        <MindmapView boardId={props?.documentId} />
      ),
    });

    // 2. Add Left Action Rail Launcher
    this.addActionRailIcon(
      'open-mindmap',
      <MindmapIcon size={16} />,
      'Open Mindmap Board',
      async (app: NoetherApp) => {
        app.workspace.openCustomTab({
          viewType: 'mindmap',
          title: 'Mindmap',
          documentId: 'active-board',
        });
      },
      35
    );
  }
}
```

### Spatial Kinematics & Viewport Culling
1. **Coordinate Transform**: Panning translates `(panX, panY)` and zooming applies uniform scale matrices:
   $$\begin{pmatrix} x_{screen} \\ y_{screen} \end{pmatrix} = \begin{pmatrix} panX + x_{world} \cdot scale \\ panY + y_{world} \cdot scale \end{pmatrix}$$
2. **Frustum Culling**: Nodes whose bounding boxes lie entirely outside the active viewport window are excluded from the DOM, guaranteeing steady 60fps frame rates even on boards with hundreds of cards.
3. **Curved Connectors**: Cubic Bezier calculations dynamically evaluate connection endpoints between card perimeters without clipping.

## 4. MCP Tools Reference

Canvas registers four MCP tools for agentic layout manipulation:

### 1. `canvas_get_board`
- **Description**: Returns all nodes, text stickies, note references, and connector edges for a board.
- **Parameters**:
  - `boardId` (string, required): Canvas board identifier.
- **Returns**: Object with `nodes`, `edges`, `nodeCount`, and `edgeCount`.

### 2. `canvas_create_node`
- **Description**: Adds a new visual card (note reference, text sticky, or link) onto the canvas plane.
- **Parameters**:
  - `boardId` (string, required): Target board ID.
  - `type` (string, required): `note`, `text`, or `link`.
  - `x` (number, required): X coordinate on the canvas plane.
  - `y` (number, required): Y coordinate on the canvas plane.
  - `width` / `height` (number, optional): Dimensions in pixels.
  - `documentId` (string, optional): Associated note ID (for `note` type).
  - `textContent` (string, optional): Text content (for `text` type).

### 3. `canvas_create_edge`
- **Description**: Connects two nodes with a directional connector arrow.
- **Parameters**:
  - `boardId` (string, required): Target board ID.
  - `fromNodeId` (string, required): Source node ID.
  - `toNodeId` (string, required): Destination node ID.
  - `label` (string, optional): Connector label text.

### 4. `canvas_delete_node`
- **Description**: Deletes a specific node and its associated connecting edges.
- **Parameters**:
  - `nodeId` (string, required): Target node ID.
