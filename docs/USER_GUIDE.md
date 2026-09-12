# Noether User Guide

Welcome to Noether! This guide walks you through organizing your notes, building a personal knowledge graph, reviewing flashcards, brainstorming on an infinite canvas, and connecting local AI assistants.

### Table of Contents

1. [Core Philosophy & Architecture](#1-core-philosophy--architecture)
2. [Workspaces & Vaults](#2-workspaces--vaults)
3. [Live Preview Editor & Markdown](#3-live-preview-editor--markdown)
4. [Bidirectional Linking & Knowledge Graph](#4-bidirectional-linking--knowledge-graph)
5. [Infinite 2D Spatial Canvas](#5-infinite-2d-spatial-canvas)
6. [Embedded FSRS-4.5 Spaced Repetition](#6-embedded-fsrs-45-spaced-repetition)
7. [Centralized Tasks Dashboard](#7-centralized-tasks-dashboard)
8. [Journal & Daily Notes](#8-journal--daily-notes)
9. [Universal Command Palette & Search](#9-universal-command-palette--search)
10. [Model Context Protocol (MCP) AI Integration](#10-model-context-protocol-mcp-ai-integration)
11. [Themes & Customization](#11-themes--customization)
12. [More Icons & Visual Customization](#12-more-icons--visual-customization)
13. [Client Updates & Release Management](#13-client-updates--release-management)
14. [Keyboard Shortcuts Cheat Sheet](#14-keyboard-shortcuts-cheat-sheet)

## 1. Core Philosophy & Architecture
---

Noether is an open-source, local-first note-taking app built around four simple principles:

- **Plain Markdown on disk**: Your notes are standard `.md` files on your computer. No vendor lock-in, proprietary database wrappers, or encrypted blobs. You can open, edit, or back up your files with any text editor at any time.
- **Fast native search & links**: Notes, tags, and links are indexed into a local SQLite database in Rust. Search and backlink lookups are instant without any laggy WebAssembly overhead.
- **Fast, fluid typing**: The Live Preview editor stays snappy and responsive even when writing long notes with thousands of words, complex tables, and math formulas. Zero micro-interaction delay ensures an instantaneous native desktop feel.
- **AI-ready when you want it**: Noether includes a local Model Context Protocol (MCP) server so AI assistants like Claude Desktop, Antigravity, and Cursor can read or update your notes safely if you choose to connect them.

## 2. Workspaces & Vaults
---

In Noether, individual note vaults are called **Vaults**.

### Creating or Opening a Vault
- On first launch, select an existing directory on your drive or create a new empty folder.
- Noether initializes a hidden `.noether/` directory inside that folder to store local relational indexes (`noether.sqlite`), canvas workspaces, and extension settings.
- **Switching Vaults (`Ctrl+Shift+O`)**: Press `Ctrl+Shift+O` to open the Vault Switcher modal. Switch between *Work*, *Personal*, or *Research* vaults instantly without restarting the app.

### File Safety & Trash Confirmation
When you delete a note, Noether never immediately destroys the file on disk:
- The `.md` file is moved into the hidden `.trash/` directory inside your Vault.
- Noether remembers where the file came from and when it was deleted, so you can restore it anytime.
- **Confirmation Dialogue**: By default, deleting a note prompts you with a confirmation dialog explaining where it will be stored and providing a "Don't ask again" option. You can customize this preference anytime in *Settings → File Safety*.
- Files can be restored to their exact prior location at any time from *Settings → File Safety*.

## 3. Live Preview Editor & Markdown
---

Noether provides a hybrid WYSIWYG / Markdown editor built on TipTap 2.x and ProseMirror.

### Modes
- **Live Preview (Default)**: Markdown formatting renders interactively as you write. Clicking on a formatted token reveals the underlying syntax for precise inline editing.
- **Source Mode**: Monospaced raw CommonMark text view, toggled via `Ctrl+Alt+S` or `Ctrl+K` → *Switch to source mode*.
- **Reading View**: Clean, distraction-free document reading view, toggled via `Ctrl+E` or `Ctrl+K` → *Switch to reading view*.

### Slash Commands (`/`)
Type `/` on any blank line to access the quick-insertion menu:
- Headings (`H1` through `H6`)
- Interactive Checklist (`- [ ]`)
- Bulleted & Numbered Lists
- Visual Table Grid
- Math Formula Block
- Callout Boxes (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, etc.)
- Code Block with syntax highlighting

### KaTeX Formulas
- **Inline Equations**: `$E = mc^2$`
- **Multi-Line Display Blocks**:
  ```markdown
  $$
  f(x) = \int_{-\infty}^\infty \hat{f}(\xi)\,e^{2 \pi i \xi x}\,d\xi
  $$
  ```
- **Live Formula Editing**: Click any formula chip to edit LaTeX inline or view rendered math chips immediately.

### Interactive Tables
- Insert tables via `/table` or `Ctrl+K` → *Insert table*.
- Use **Edge Controls** (`+` handles on borders) to insert rows and columns with a single click.
- Highlight cells to reveal the **Floating Toolbar** for alignment, header toggling, and deletions.
- Press `Tab` to navigate between cells; pressing `Tab` in the final cell automatically creates a new row.

### Web Clip Cleaner & Citation Stripper
Pasting text copied from research articles, Wikipedia, or web pages automatically cleans up formatting:
- Strips academic citation footnotes (`[1]`, `[12]`, `[citation needed]`).
- Converts HTML headers, tables, and lists into clean CommonMark.
- Strips URL referral tracking parameters.

## 4. Bidirectional Linking & Knowledge Graph
---

Noether turns independent notes into a structured web of thoughts.

### Wikilink Syntax
- Type `[[` to open the **Fuzzy Note Linker**.
- Select an existing note or type a new title and press `Enter` to create a new linked document.
- **Aliased Links**: `[[Actual Note Title|Display Name]]` shows custom text while pointing to the target file.

### Backlinks Pane (`Ctrl+Shift+\`)
Located in the right sidebar, the Backlinks Pane displays:
1. **Incoming Linked References**: All notes that contain explicit `[[wikilinks]]` pointing to the active note.
2. **Unlinked Mentions**: Notes mentioning the active note's title or aliases in plain text. Clicking **[Link Idea]** automatically transforms the mention into an active wikilink.
3. **Outgoing Links**: All links leaving the active document.

### 2D Knowledge Graph (`Ctrl+G`)
- Press `Ctrl+G` to open the full force-directed knowledge graph.
- **Color Graph Nodes**: Master toggle in Settings → Graph view → Coloring to switch between classic neutral gray and custom color schemes. When disabled, all subordinate coloring controls are cleanly dimmed and disabled.
- **Node Coloring Schemes**: Choose between **Random** (default uniform palette cycling), **By File Type**, **By Folder Hierarchy**, or **By First Tag**.
- **Tactile Aesthetic Palettes**: Select from 6 curated single-word palettes: **Amber**, **Emerald**, **Neon**, **Ocean**, **Sunset**, and **Pastel**.
- **In-App Color Picker**: In **By File Type** mode, click any category swatch (Notes, Canvases, Images, Media, Documents, Tags, Other) to open Noether's custom color picker popover with 2D spectrum, hue slider, eyedropper, and RGB/HEX inputs.
- **Display Toggles**:
  - **Directional link arrows**: Render clean arrowheads along connections indicating wiki link directions.
  - **Orphan node filter**: Toggle visibility of unconnected notes without links.
  - **Virtual #tag nodes**: Render tag nodes as virtual hubs connecting tagged notes. Clicking any tag node instantly filters the graph.
- **Pauses when idle**: The graph physics automatically pauses when you are not interacting with it, saving battery and GPU power.

## 5. Infinite 2D Spatial Canvas
---

For visual brainstorming, concept maps, flowcharts, and moodboards:

- Click **Canvas** on the Action Rail or run `Ctrl+K` → *New spatial canvas*.
- **Note Cards**: Drag documents from the file tree directly onto the canvas plane.
- **Sticky Text Nodes**: Double-click anywhere to create free-form sticky cards.
- **Group Containers**: Select cards and press `Ctrl+G` to encase them in colored, titled container frames.
- **Connectors**: Drag connection handles from card borders to create Bezier curve arrows with custom labels.
- **Navigation**: Hold `Spacebar` or `Ctrl` to pan, scroll with `Ctrl+Wheel` to zoom, and use snap-to-grid for tidy alignment.

## 6. Embedded FSRS-4.5 Spaced Repetition
---

Noether features an integrated flashcard scheduler powered by **FSRS-4.5 (Free Spaced Repetition Scheduler)** via `ts-fsrs`.

### Card Syntax
Create flashcards directly in your notes:
- **Concept Card**: `Question :: Answer`
- **Bidirectional Card**: `Term ;; Definition` (generates two review cards)
- **Cloze Deletion**: `The capital of Japan is {Tokyo}.` or `The capital of Japan is ==Tokyo==.`

### Review Deck Modal
- Click **Flashcards** on the Action Rail.
- Grade recall difficulty:
  - `1` (Again): Failed recall, repeat soon.
  - `2` (Hard): Remembered with effort, shorter interval next time.
  - `3` (Good): Correct recall, standard review schedule.
  - `4` (Easy): Effortless recall, push the review further out.
- View stability ($S$), difficulty ($D$), and upcoming review heatmaps in *Settings → Extensions → Spaced Repetition*.

## 7. Centralized Tasks Dashboard
---

Never lose track of action items scattered across project notes:

- Write tasks in any document: `- [ ] Buy server hardware #infra`
- Open the **Tasks Dashboard** from the Action Rail.
- **Kanban Board**: Drag task cards between *To Do*, *In Progress*, and *Completed*.
- **Checklist Mode**: Group tasks by file, priority, or tag.
- **Instant two-way sync**: Checking off a task in the dashboard immediately checks the box in your markdown file, and editing the note updates the dashboard.

## 8. Journal & Daily Notes
---

- Click the **Journal** icon or press `Ctrl+Shift+D` to open today's scratchpad (e.g. `Journal/2026-09-12.md`).
- Customize note naming formats (`YYYY-MM-DD`, `YYYY/MM/DD`) and default templates in *Settings → Extensions → Journal*.
- Use `Alt+←` and `Alt+→` in the journal header to step backward and forward through previous daily entries.

## 9. Universal Command Palette & Search
---

Noether features a lightning-fast launcher and file switcher accessible anytime via `Ctrl+K` or `Ctrl+O`.

### Universal Access Anywhere (`Ctrl+K`)
`Ctrl+K` functions universally across the entire application, even while actively typing text inside the Markdown editor. It never interrupts typing flow by inserting markdown link syntax; instead, it immediately focuses the palette input.

### File Switching & Instant Note Search
- **Recent Notes**: Opening the Command Palette with an empty input displays your 5 most recently modified notes for instant switching.
- **Instant Search**: Type any term to match notes instantly by title or folder path.
- **Full-Text Content Search**: Matches note content using fast SQLite FTS5 search, displaying matching excerpt previews under note results.
- **Press `Enter` to Open**: Instantly loads the selected note into the active tab.

### Actionable Stateful Verbs
Noether eliminates confusing "Toggle" labels in favor of dynamic verbs indicating exact actions:
- Sidebars: **"Collapse left sidebar"** (when open) vs **"Expand left sidebar"** (when collapsed).
- Window Modes: **"Exit fullscreen"** vs **"Enter fullscreen"**.
- Split Panes: **"Close split editor pane"** vs **"Split editor pane"**.
- Note Views: **"Switch to reading view"** vs **"Switch to editing view"**.
- Search Aliases: All stateful commands maintain search aliases. Typing "toggle" in the input matches all sidebar and mode controls immediately.

### In-Document Slash Operations in Palette
All `/` document editor commands are accessible directly from the Command Palette under the `Editor` section:
- Headings (`Heading 1` through `Heading 6`)
- Lists (`Bullet list`, `Numbered list`, `Task list`)
- Blocks (`Quote block`, `Code block`, `Insert divider`)
- Callouts (`Insert note callout`, `Insert tip callout`, `Insert warning callout`, etc.)
- Math & Links (`Insert math block`, `Insert inline math`, `Insert link`, `Insert wikilink`)

Commands that require an active Markdown editor are context-aware: outside Markdown notes, they are softly dimmed and skipped during keyboard navigation.

### Note Management Operations
- **Smart Note Duplication**: Duplicating notes inspects folder siblings to generate clean, unbracketed titles (`Note Copy`, `Note Copy 2`) without stacking nested brackets.
- **Reveal in File Tree**: Instantly expands the file explorer sidebar, opens the files tab, and highlights the active document.
- **Vault-Wide Full-Text Search (`Ctrl+Shift+F`)**: Opens the dedicated search view powered by FTS5 with BM25 ranking and diacritics normalization.

## 10. Model Context Protocol (MCP) AI Integration
---

Noether includes a built-in stdio Model Context Protocol server (`bin/noether-mcp-server.cjs`). External AI assistants can query and modify your notes directly.

### Built-in MCP Tools
`noether_search_notes`, `noether_read_note`, `noether_create_note`, `noether_update_note`, `noether_delete_note`, `noether_list_all_notes`, `noether_list_vaults`, `noether_get_active_vault`, `noether_switch_vault`, `noether_search_across_vaults`, `noether_get_backlinks`, `tasks_get_all`, `fsrs-spaced-repetition_get_due_cards`, and `more-icons` management tools.

### Quick Configuration (Claude Desktop / Antigravity / Cursor)
Add to your client configuration file:
```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": ["<path-to-noether>/bin/noether-mcp-server.cjs"]
    }
  }
}
```

## 11. Themes & Customization
---

Open **Settings** (`Ctrl+,`) → **Appearance**:
- **Pre-installed Themes**: Catppuccin, Nord, Cyberpunk Neon, Rosé Pine, Tokyo Night, Solarized Dark/Light, Noether Dark/Light, Forest Emerald, and Minimal.
- **Tactile buttons**: Clean physical button styling with crisp borders and snappy, instant feedback.
- **Link Styling**: Choose between theme accent, classic browser blue/purple, or neutral link palettes.

## 12. More Icons & Visual Customization
---

Noether includes the built-in **More icons** extension to personalize files, folders, and notes with icons from Lucide and Hugeicons collections:

- **Custom Folder & File Icons**: Right-click any note or folder in the sidebar file tree and choose **Change icon** to open the icon picker. Search through thousands of SVG icons and pick custom accent colors.
- **Title Icons & Inline Chips**: Click the icon badge above any document title in the editor to assign a header icon. You can also insert icon chips directly inside editor documents.
- **Folder Prefix Icons**: Toggle prefix icons in **Settings** (`Ctrl+,`) → **More icons** to show custom icons alongside folder chevrons.
- **MCP Integration**: AI assistants can query, assign, or remove custom note and folder icons via the `more-icons_list`, `more-icons_get`, `more-icons_update_icon`, and `more-icons_delete_icon` tools.

## 13. Client Updates & Release Management
---

Noether features an integrated updater that monitors official GitHub releases:

- **Automatic Background Checks**: When enabled in **Settings** (`Ctrl+,`) → **General**, Noether checks GitHub Releases after startup (with a 4-hour cooldown) and notifies you when new releases are available.
- **Manual Check**: Click **Check for updates** in the General settings tab anytime to immediately check against the remote repository.
- **Direct Installer Download**: Launch the update modal to review release notes and download the matching installer directly.

## 14. Keyboard Shortcuts Cheat Sheet
---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Command Palette / Quick Open** | `Ctrl+K` or `Ctrl+O` | `Cmd+K` or `Cmd+O` |
| **Collapse / Expand Left Sidebar** | `Ctrl+\` | `Cmd+\` |
| **Collapse / Expand Right Sidebar** | `Ctrl+Shift+\` | `Cmd+Shift+\` |
| **Switch Vault Workspace** | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| **Create New Note** | `Ctrl+N` | `Cmd+N` |
| **Split / Close Split Editor Pane** | `Ctrl+Alt+\` | `Cmd+Alt+\` |
| **New Tab / Close Tab** | `Ctrl+T` / `Ctrl+W` | `Cmd+T` / `Cmd+W` |
| **Next / Previous Tab** | `Ctrl+Tab` / `Ctrl+Shift+Tab` | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| **Open Knowledge Graph** | `Ctrl+G` | `Cmd+G` |
| **Open Today's Journal** | `Ctrl+Shift+D` | `Cmd+Shift+D` |
| **Toggle Fullscreen Window** | `F11` | `F11` |
| **Reload Window** | `Ctrl+R` | `Cmd+R` |
| **Toggle Bold / Italic** | `Ctrl+B` / `Ctrl+I` | `Cmd+B` / `Cmd+I` |
| **Toggle Highlight** | `Ctrl+Shift+H` | `Cmd+Shift+H` |
| **Heading Levels 1 to 6** | `Ctrl+Alt+1` ... `Ctrl+Alt+6` | `Cmd+Alt+1` ... `Cmd+Alt+6` |
| **Paragraph Formatting** | `Ctrl+Alt+0` | `Cmd+Alt+0` |
| **Trigger Slash Menu** | `/` | `/` |
| **Trigger Wikilink Popup** | `[[` | `[[` |
| **Zoom In / Out / Reset** | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | `Cmd+=` / `Cmd+-` / `Cmd+0` |
| **Open Settings** | `Ctrl+,` | `Cmd+,` |
