# Graph View

Graph view visualizes the connections, backlinks, and topic clusters across your entire vault using an interactive 2D physics simulation.

## 1. Overview
---

Every note in your vault becomes a node, and every wikilink (`[[Note Name]]`) becomes an edge connecting them. As your knowledge base grows, the graph reveals clusters, isolated notes, and central hub documents.

## 2. Open Graph View
---

- **Global Graph**: Click the **Graph** icon in the Action Rail, or press `Ctrl+G` to open the full vault knowledge graph.
- **Local Graph**: Open the right sidebar and switch to the **Local Graph** tab to view only the neighbors directly connected to the active note.
- **Floating Graph Mode**: Click the **Float** button in the top right of the graph to detach it into an independent floating widget that stays visible while you write.

## 3. Filters and Visual Controls
---

- **Tags**: Toggle whether tags appear as distinct colored nodes.
- **Orphans**: Show or hide notes that have zero incoming or outgoing connections.
- **Node Size**: Scale node circles based on their total number of incoming backlinks.
- **Link Distance & Repulsion**: Adjust physics forces to spread nodes out or pull clusters tighter.
- **Adaptive Zoom Scaling**: When zooming far out, node circles scale adaptively so they remain visible circles rather than disappearing into sub-pixel specks. Hovered nodes and their connected neighbors keep their labels legible, and click hit-testing automatically widens so you can select nodes easily from a high bird's-eye view.

> [!NOTE]
> Physics calculations are automatically paused when the graph tab is hidden or the window is minimized, preventing unnecessary background CPU and battery drain.

## 4. Progressive Timelapse Engine
---

Watch your knowledge graph evolve over time:

1. Click the **Timelapse** button in the Graph controls.
2. Use the timeline slider or press **Play** to watch notes and connections appear in the exact chronological order they were created.
3. Adjust playback speed (`1x`, `2x`, `5x`) to review months of research in seconds.

## 5. Keyboard Shortcuts & Navigation
---

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+G` | Open global Graph view |
| `Left Click + Drag` | Pan camera across graph canvas |
| `Mouse Wheel` | Zoom in and out |
| `Click on Node` | Open corresponding note in active editor |
| `Right Click on Node` | Open note in new split pane |

> [!TIP]
> Use the search box in the Graph control bar to highlight matching nodes in bright accent colors while dimming unrelated nodes.
