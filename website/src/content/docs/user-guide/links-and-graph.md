# Bidirectional Links & Knowledge Graph

Noether turns disconnected documents into an interconnected web of knowledge through bidirectional linking, real-time relational backlinks, unlinked mention resolution, and an interactive 2D force-directed knowledge graph.

## 1. Bidirectional Linking with `[[Wikilinks]]`

---

In Noether, you connect ideas naturally without managing rigid folder taxonomies.

### Basic Link Syntax
Type `[[` anywhere in the editor to trigger the **Fuzzy Note Linker**:
```markdown
Noether features an embedded [[Dual-Storage Architecture]] for relational performance.
```

### Aliased Links
Display alternative label text while linking to a canonical document using the pipe (`|`) delimiter:
```markdown
Learn more about our [[Micro-Kernel & Extension Architecture|extension runtime]].
```

### Missing Note Resolution & Ghost Links
When you reference a note that does not yet exist on disk (e.g. `[[Future Research Roadmap]]`):
- The link renders with a distinct muted styling indicating an uncreated document.
- Clicking the link instantly creates the target Markdown file in your active Vault and navigates directly to it.
- Your relational graph immediately tracks the edge, allowing top-down thought structuring without breaking your writing flow.


## 2. Persistent Visited Link Tracking

---

To provide a true native browsing feel and prevent you from losing orientation in deep research sessions, Noether implements **persistent visited link tracking**:

- **Cross-Surface Consistency**: Visited states remain synchronized across the Live Preview editor, reading view, right sidebar backlinks, and search results.
- **Customizable Color Schemes**: In *Settings → Appearance → Link Styling*, choose between:
  - **Theme Accent**: Visited links harmonize with your active color theme.
  - **Classic Browser**: Vibrant browser blue (`#2563eb`) for unvisited links and traditional purple (`#9333ea`) for visited links.
  - **Neutral**: Subdued monochrome styling.
- **Underline Modes**: Choose between *Always Underlined* or *Underline on Hover*.
- **External Link Indicators**: Toggle clean trailing arrow icons (`↗`) on external HTTP/HTTPS links.


## 3. Backlinks, Outgoing Links & Unlinked Mentions

---

The **Backlinks Pane** in the right sidebar (`Ctrl+Shift+\`) provides a 360-degree view of how any document connects to your broader vault.

```
Backlinks Sidebar
├── Incoming Linked References (3)
│   ├── Architecture Overview.md
│   │   └── "...built on top of [[Dual-Storage Architecture]]..."
│   └── 2026-09-06.md
│       └── "...reviewed [[Dual-Storage Architecture]] PR..."
├── Unlinked Mentions (2)
│   └── Research Notes.md
│       └── "...benefits of dual storage in personal wikis..."  [Link Idea]
└── Outgoing Forward Links (5)
    ├── SQLite Engine
    └── File Manifest
```

### Sub-Millisecond Indexed Joins
Unlike traditional markdown viewers that perform expensive recursive text grep scans across the filesystem, Noether's native SQLite engine (`rusqlite`) indexes all link edges into the `document_links` table on save:

```sql
SELECT d.title, d.id, dl.link_text 
FROM document_links dl
JOIN documents d ON d.id = dl.source_document_id
WHERE dl.target_document_id = ?;
```
Even in vaults containing over 50,000 notes, backlink queries return in under 2ms.

### Unlinked Mentions
Noether automatically scans notes for text occurrences that match existing document titles or aliases without explicit `[[...]]` brackets. Clicking **[Link Idea]** transforms the plain text into an active bidirectional wikilink with zero typing required.


## 4. 2D Force-Directed Knowledge Graph

---

The **Knowledge Graph View** provides an interactive visual model of your interconnected knowledge base.

### Opening the Graph
- Click the **Graph** icon on the left Action Rail.
- Or press `Ctrl+G` (or Command Palette: `Ctrl+K` → *Open Graph View*).
- **Auto Fit to Center**: Opening graph view automatically centers and fits all nodes into the viewport. If the graph view is already open in your tabs, switching back to it seamlessly restores your canvas zoom and pan position exactly where you left it.

### Docking & Sidebar Operation
Dock any graph tab into the sidebar panel using the dock icon in the page subheader:
- **Automatic Fit to Center**: Docking a graph automatically recalibrates zoom and pan, centering all visible nodes within the sidebar pane so you never lose your visual context.
- **Global vs. Local Mode Toggle**: While docked, the search bar is replaced with a dedicated mode switch icon:
  - **Global Mode** (network globe icon): Renders the complete macroscopic graph of all notes and relational links across your vault.
  - **Local Mode** (slashed globe icon): Scopes the graph strictly to the currently active note and its direct incoming and outgoing connections. When no note is active, it presents an empty state prompting you to open a note.
  - **Mode Change Auto-Centering**: Toggling between Global and Local modes automatically recalibrates and centers the camera on the newly visible subset of nodes.
- **Persistent Preferences**: Changing the mode directly from the docked subheader immediately saves your preference. You can also configure the default behavior in *Settings → Graph view → Default docked graph mode*.

### Contextual Split View Switching
Full-page graph views remain in Global mode by default. When you work with a note open in an adjacent split pane, the graph's **More Options** (`...`) menu dynamically displays a contextual action to toggle between **Switch to local graph** and **Switch to global graph**. Toggling modes or changing the adjacent note automatically recalculates and centers the layout on the focused note and its direct neighborhood in real time.

### Physics Simulation & Ergonomics
- **Repulsion Force**: Adjust the repulsive charge between nodes to cluster related topics while maintaining visual breathing room.
- **Link Distance & Rigidity**: Fine-tune spring tension between interconnected notes.
- **Node Size Scaling**: Nodes dynamically scale in diameter based on the quantity of incoming and outgoing connections.
- **Color Coding**: Nodes color-code automatically by folder, tag, or document type.

### Automatic Physics Suspension (Zero Idle Overhead)
Force-directed simulations can consume significant CPU/GPU resources if left running in the background. Noether's physics engine employs an **automatic kinematic sleep cycle**:
- Simulation physics settle into equilibrium within 3-5 seconds of user pan/zoom interaction.
- If the application window is minimized, hidden, or switched to another tab, the physics animation loop **suspends immediately**, eliminating unnecessary battery drain and GPU utilization.
