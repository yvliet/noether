# Graph View

Visualize connections, backlinks, and topic clusters across your vault with an interactive 2D physics simulation.

## 1. Navigating the Graph
---

Every note is a node, and every wikilink (`[[Note Name]]`) is an edge connecting them.

- **Global Graph (`Ctrl+G`)**: Opens the full vault graph. Drag to pan, scroll to zoom, and click any node to open its note.
- **Local Graph**: Switch to the **Local Graph** tab in the right sidebar to see only the neighbors directly connected to your active note.
- **Floating Graph**: Click the **Float** button in the top right to detach the graph into a floating corner window that stays visible while you write. I actually came up with the Float button by accident while spamming the "Fit to Center" button during testing, and it turned out to be one of the most useful ways to keep an eye on topic connections while drafting.

## 2. Filters & Display Options
---

Use the control bar on the graph to adjust the physics and display:

- **Tags**: Toggle whether tags appear as distinct colored nodes.
- **Orphans**: Hide or show isolated notes that don't have any incoming or outgoing links.
- **Node Size**: Scale node circles based on how many backlinks point to them.
- **Physics**: Tweak repulsion and link distance to spread notes out or pull tight clusters closer together. Physics ticks pause automatically whenever the graph tab is inactive or minimized to save CPU and battery.
- **Search**: Type in the search box to highlight matching notes in accent colors while dimming unrelated nodes.

## 3. Timelapse Playback
---

Click **Timelapse** in the graph controls to watch your knowledge base grow:

1. Drag the timeline slider or press **Play**.
2. Notes and connections appear in the chronological order they were created.
3. Adjust playback speed (`1x`, `2x`, `5x`) to review past months of research.

