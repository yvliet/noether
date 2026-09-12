# Infinite 2D Spatial Canvas

Linear text documents are ideal for long-form writing, but creative brainstorming, system design, and concept exploration often demand non-linear spatial organization. Noether provides an integrated **Infinite 2D Spatial Canvas** that combines free-form visual whiteboarding with your actual Markdown notes.

---

## 1. Overview & Canvas Philosophy
---

The Canvas gives you an unbounded 2D plane where ideas can exist as interactive cards, sticky notes, visual groups, and directional connection pathways.

- **Unified Knowledge**: Canvas items are not isolated drawings; they reference your real notes in the Vault.
- **First-Class File Backing**: Every canvas is its own `.canvas` JSON file saved directly in your Vault alongside your Markdown notes, with isolated node and edge data.
- **Sidebar Integration**: Canvases appear alongside notes in your file tree, cleanly displaying their document title with a right-aligned muted `CANVAS` badge.
- **Hardware-Accelerated 60 FPS**: Utilizes viewport frustum culling and hardware-accelerated transforms to maintain smooth pan and zoom even with hundreds of active cards.

To create a canvas, click the **Canvas** icon on the left Action Rail, click the **New Canvas** icon in the file tree header, or run `Ctrl+K` → *New spatial canvas*.

---

## 2. Canvas Node Types
---

You can place four fundamental node types onto the spatial plane:

### 1. Note Cards
Drag any document from your sidebar file tree directly onto the canvas, or press the **+ Note** button in the canvas floating toolbar:
- Renders an interactive live preview of the note's markdown content directly on the card surface.
- Double-clicking the card header navigates directly to the full document in a split editor tab.
- Modifications made in the note editor automatically update the card in real time.

### 2. Sticky Text Nodes
Quick, lightweight notes for fleeting ideas, task checklists, or annotations:
- Click **+ Text** or double-click anywhere on the canvas background.
- Adding a card defaults to a 4-grid-unit height and focuses the cursor immediately for quick typing.
- Minimum card resizing is clamped to a $4 \times 4$ grid boundary.
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
---

Connect thoughts visually using flexible relationship arrows between cards (**Note Card A** → *Cubic Bezier Connector* → **Note Card B**):

- **Creating Connections**: Hover over any node's perimeter to reveal connector anchor points (top, right, bottom, left). Click and drag the anchor handle to any other node to form a link.
- **Bezier Curve Pathways**: Connectors calculate smooth cubic Bezier paths that dynamically route around neighboring cards.
- **Directional Styles**: Toggle arrow directions (unidirectional, bidirectional, or nondirectional) and line styles (solid, dashed, dotted).
- **Edge Labels**: Double-click any connector arrow to type an explanatory label (e.g. *"implements"*, *"depends on"*, *"leads to"*).

---

## 4. Canvas Navigation & Controls
---

| Action | Control / Shortcut |
| :--- | :--- |
| **Pan Canvas (Freehand)** | Hold `Space` or `Ctrl` + Drag (Left Click), or Middle Mouse Drag |
| **Scroll Vertically** | Mouse Wheel Up / Down (or two-finger vertical swipe) |
| **Scroll Horizontally** | `Shift + Mouse Wheel`, or two-finger horizontal swipe |
| **Zoom In / Out** | `Ctrl + Mouse Wheel`, Trackpad Pinch, or `Ctrl + +` / `Ctrl + -` |
| **Pan + Zoom Concurrency** | Hold `Ctrl` + Drag with mouse while rolling the wheel without losing zoom focus |
| **Scroll Card Content** | Hover over scrollable note cards and scroll mouse wheel |
| **Reset Zoom (100%)** | `Ctrl + 0` or Reset View button |
| **Zoom to Fit All** | `Shift + 1` |
| **Multi-Select Nodes** | `Shift + Drag` marquee selection box |
| **Delete Selected Card** | `Delete` or `Backspace` |
| **Duplicate Node** | `Alt + Drag` or `Ctrl + D` |
| **Snap to Grid** | Toggle in the bottom-left canvas toolbar |

---

## 5. Performance Engineering on Large Canvases
---

To guarantee steady 60 FPS performance when building massive mindmaps with hundreds of nodes:

1. **Frustum Culling**: Nodes and connector edges located outside the active viewport bounding box skip DOM layout computations.
2. **Simplified Level-of-Detail (LOD)**: When zooming far out to inspect the overall macro layout, detailed Markdown typography switches to optimized schematic representations, saving GPU rasterization cycles.
3. **Hardware Acceleration**: Canvas translation and scaling execute via GPU-accelerated CSS `transform: translate3d(...) scale(...)`.
