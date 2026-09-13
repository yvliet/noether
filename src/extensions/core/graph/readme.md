# Interactive Graph View

2D force-directed network visualization mapping relationships, tags, and link topologies across your vault.

---

## 1. Overview & User Experience

Traditional folder hierarchies hide the cross-disciplinary connections between your thoughts. A concept mentioned in a biology note might deeply relate to a philosophy or computer science document.

The **Interactive Graph View** renders your entire vault as a living, dynamic 2D force-directed network graph. Notes become nodes, WikiLinks form connecting edges, and tag clusters emerge organically through mathematical attraction forces. You can explore orphan documents, identify high-density knowledge hubs, and filter the view dynamically.

### Where It Lives in Noether
- **Left Action Rail**: Click the neural network icon (or press `Ctrl+G`) to open the full-window Graph View tab.
- **Right Sidebar (Docked Graph)**: Dock any graph tab into the right sidebar panel, complete with automatic viewport recalibration and global/local scoping.
- **Settings**: Fine-tune force physics, node sizes, link thickness, and color groups under **Settings** (`Ctrl+,`) → **Graph View**.

## 2. Features & Step-by-Step Guide

### 1. Navigating the Graph
- **Pan & Zoom**: Click and drag empty space to pan; scroll with your mouse wheel or trackpad pinch to zoom.
- **Auto Fit to Center**: Opening graph view automatically centers and fits all visible nodes into the frame.
- **Node Interaction**: Hover over any note node to highlight its direct connections and dim unrelated clusters.
- **Open Note**: Click any node to open the corresponding note directly in the editor tab. Hold `Ctrl` while clicking to open in a split pane.
- **Node Dragging**: Click and drag a node to pull it across the simulation canvas. Connected nodes elasticate and follow along.

### 2. The Floating Graph (Living Knowledge View)
Most graph views in note apps feel like dead, static diagrams once the initial force simulation settles into place. In Noether, clicking the **Float** button in the graph controls keeps the graph gently breathing and drifting.

I love keeping the graph view docked in the top-right sidebar and toggling Float on while writing notes. Watching your interconnected thoughts gently drift in your peripheral vision gives your workspace an organic, living presence.

#### The Accidental Discovery Behind Float
The Float button came about completely by accident while I was testing the **Fit to Center** feature. Every time you hit Fit to Center, the camera recalibrates and injects a small amount of momentum/alpha into the force layout so nodes can re-balance themselves cleanly in the frame. While testing this, I repeatedly spammed the button and noticed that as long as I kept clicking it, the nodes floated around in a mesmerizing way.

I thought: *"Wait, what if I just make the button holdable so it floats as long as you hold it down?"* I implemented that, but having to physically hold down the mouse button defeated the point when you want to actually type or read. So I promoted it into its own dedicated **Float toggle button** right on the graph control bar. You click it once, dock the graph in your sidebar, and let your second brain breathe while you get into flow.

### 3. Docking & Global vs. Local Modes
Dock any graph tab into the sidebar panel using the dock icon:
- **Automatic Fit to Center**: Docking recalibrates zoom and pan automatically, centering all visible nodes within the sidebar width.
- **Global Mode** (network globe icon): Renders the complete macroscopic graph of all notes and relational links across your vault.
- **Local Mode** (slashed globe icon): Scopes the graph strictly to the currently active note and its direct incoming and outgoing connections. Toggling modes automatically recalculates and centers the layout on the focused note and its immediate neighborhood.

### 4. Search & Filter Syntax
Use the search bar at the top of the Graph View to isolate specific clusters:
- `tag:#research`: Shows only notes containing the `#research` tag.
- `path:Projects/`: Restricts the visualization to notes inside the `Projects` directory.
- `-is:orphan`: Hides notes that have zero incoming or outgoing connections.

### 5. Color Groups & Tag Clusters
1. Click the **Color Groups** button in the Graph controls dock.
2. Define a query (e.g. `tag:#urgent` or `path:Archive`) and assign a distinct color swatch.
3. Matching nodes immediately tint to that color, highlighting thematic clusters across the network.

### 6. Keyboard Shortcuts

| Action | Shortcut | Description |
| :--- | :--- | :--- |
| **Open Graph View** | `Ctrl+G` | Opens the global interactive graph tab. |
| **Reset Viewport Origin** | `Ctrl+0` | Centers the graph and resets zoom level. |
| **Fit to Center** | `Shift+1` | Recalibrates camera and centers all nodes in view. |
| **Pause / Resume Physics** | `Spacebar` | Freezes node position updates during inspection. |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Graph View extension demonstrates how to implement high-performance Canvas 2D / WebGL rendering surfaces, configure spatial tabs, and query the link topology graph via the Noether SDK.

### SDK Extension Points Used
- `this.registerView()`: Registers the `graph` custom view with spatial surface flags and split-view support.
- `this.addActionRailIcon()`: Mounts the `Ctrl+G` launch shortcut on the Left Action Rail.
- `this.registerSettingTab()`: Exposes physics parameter sliders (repulsion, link distance, gravity).
- `this.registerTool()`: Exposes 5 comprehensive MCP graph analysis tools.

### Real SDK Implementation Pattern

Extension builders can hook into graph lifecycle events or query topological metrics using this SDK pattern:

```typescript
import { Extension, NoetherApp } from 'noether';

export default class GraphAnalyticsExtension extends Extension {
  async onload(): Promise<void> {
    // Register command to compute knowledge hubs
    this.addCommand({
      id: 'graph:identify-hubs',
      title: 'Analyze Knowledge Hubs',
      section: 'Analytics',
      action: async (app: NoetherApp) => {
        // Query link graph topology through SQLite adapter
        const hubs = await app.db.query(`
          SELECT target_id, COUNT(*) as incoming_count
          FROM document_links
          GROUP BY target_id
          ORDER BY incoming_count DESC
          LIMIT 5
        `);

        app.workspace.showToast(`Identified top ${hubs.length} hub notes`, 'info');
      },
    });
  }
}
```

### Force Simulation Mechanics
The kinematic engine executes continuous iterative velocity and position updates:
1. **Coulomb Repulsion**: Unconnected nodes repel each other to prevent visual overlap:
   $$F_{repel} = \frac{k_{charge}}{d^2}$$
2. **Hooke Spring Tension**: Linked nodes are drawn toward an equilibrium target distance:
   $$F_{spring} = -k_{spring} \cdot (d - d_0)$$
3. **Centering Gravity**: A gentle gravitational pull draws distant orphan clusters back toward the viewport origin:
   $$F_{grav} = -k_{grav} \cdot (p - p_{center})$$

## 4. MCP Tools Reference

Graph View exposes five MCP tools for programmatic network graph queries:

### 1. `graph-view_get_stats`
- **Description**: Returns overall graph network metrics including total nodes, edge density, orphan count, and average connections per note.
- **Parameters**: None.

### 2. `graph-view_find_path`
- **Description**: Finds the shortest connection path between two notes via bidirectional breadth-first link traversal.
- **Parameters**:
  - `source` (string, required): Starting note title or ID.
  - `target` (string, required): Destination note title or ID.
  - `maxDepth` (number, optional): Maximum link hops to search (default: 4).
  - `directed` (boolean, optional): Follow link arrow direction strictly (default: false).

### 3. `graph-view_find_related`
- **Description**: Discovers notes conceptually related to a target document based on shared outgoing links, shared incoming references, and overlapping tags.
- **Parameters**:
  - `documentId` (string, required): Target document identifier.
  - `limit` (number, optional): Maximum candidates to return (default: 5).

### 4. `graph-view_detect_orphans`
- **Description**: Identifies all isolated notes that have zero incoming and zero outgoing links.
- **Parameters**: None.

### 5. `graph-view_find_clusters`
- **Description**: Groups vault documents into connected subnetworks and component clusters.
- **Parameters**: None.
