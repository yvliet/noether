# Infinite 2D Spatial Canvas

Linear text documents are ideal for long-form writing, but creative brainstorming, system design, and concept exploration often demand non-linear spatial organization. Flint provides an integrated **Infinite 2D Spatial Canvas** that combines free-form visual whiteboarding with your actual Markdown notes.

---

## 1. Overview & Canvas Philosophy

The Canvas gives you an unbounded 2D plane where ideas can exist as interactive cards, sticky notes, visual groups, and directional connection pathways.

- **Unified Knowledge**: Canvas items are not isolated drawings; they reference your real notes in the Hearth.
- **Local-First Storage**: Canvas workspaces serialize into human-readable JSON files saved locally in `.flint/canvas/`.
- **Hardware-Accelerated 60 FPS**: Utilizes viewport frustum culling and hardware-accelerated transforms to maintain smooth pan and zoom even with hundreds of active cards.

To launch a canvas, click the **Canvas** icon on the left Action Rail or run `Ctrl+K` → *Open Canvas*.

---

## 2. Canvas Node Types

You can place four fundamental node types onto the spatial plane:

### 1. Note Cards
Drag any document from your sidebar file tree directly onto the canvas, or press the **+ Note** button in the canvas floating toolbar:
- Renders an interactive live preview of the note's markdown content directly on the card surface.
- Double-clicking the card header navigates directly to the full document in a split editor tab.
- Modifications made in the note editor automatically update the card in real time.

### 2. Sticky Text Nodes
Quick, lightweight notes for fleeting ideas, task checklists, or annotations:
- Click **+ Text** or double-click anywhere on the canvas background.
- Supports full inline markdown, bullet points, checklists, and code snippets.
- Adjustable pastel and accent color presets for instant visual tagging.

### 3. Visual Group Containers
Organize clusters of related nodes into bounded regions:
- Select multiple cards and press `Ctrl+G` (or choose **Group** from the toolbar).
- Give the group a labeled title header (e.g. *"Phase 1: Architecture"*).
- Moving or resizing the group automatically transports all contained nodes together.

### 4. Media & Web Cards
- Drop local images, audio clips, or PDF documents onto the canvas for visual reference boards.
- Embed external web links with automatic metadata cards.

---

## 3. Connections & Edge Routing

Connect thoughts visually using flexible relationship arrows between cards (**Note Card A** → *Cubic Bezier Connector* → **Note Card B**):

- **Creating Connections**: Hover over any node's perimeter to reveal connector anchor points (top, right, bottom, left). Click and drag the anchor handle to any other node to form a link.
- **Bezier Curve Pathways**: Connectors calculate smooth cubic Bezier paths that dynamically route around neighboring cards.
- **Directional Styles**: Toggle arrow directions (unidirectional, bidirectional, or nondirectional) and line styles (solid, dashed, dotted).
- **Edge Labels**: Double-click any connector arrow to type an explanatory label (e.g. *"implements"*, *"depends on"*, *"leads to"*).

---

## 4. Canvas Navigation & Controls

| Action | Control / Shortcut |
| :--- | :--- |
| **Pan Canvas** | Spacebar + Drag, Middle Mouse Drag, or Two-finger Scroll |
| **Zoom In / Out** | Mouse Wheel (`Ctrl+Wheel`), or `Ctrl + +` / `Ctrl + -` |
| **Reset Zoom (100%)** | `Ctrl + 0` |
| **Zoom to Fit All** | `Shift + 1` |
| **Multi-Select Nodes** | `Shift + Drag` marquee selection box |
| **Delete Selected** | `Delete` or `Backspace` |
| **Duplicate Node** | `Alt + Drag` or `Ctrl + D` |
| **Snap to Grid** | Toggle in the bottom-left canvas toolbar (50px snap interval) |

---

## 5. Performance Engineering on Large Canvases

To guarantee steady 60 FPS performance when building massive mindmaps with hundreds of nodes:

1. **Frustum Culling**: Nodes and connector edges located outside the active viewport bounding box skip DOM layout computations.
2. **Simplified Level-of-Detail (LOD)**: When zooming far out to inspect the overall macro layout, detailed Markdown typography switches to optimized schematic representations, saving GPU rasterization cycles.
3. **Hardware Acceleration**: Canvas translation and scaling execute via GPU-accelerated CSS `transform: translate3d(...) scale(...)`.
