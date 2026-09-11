# Flint User Guide

Welcome to Flint! This guide walks you through organizing your notes, building a personal knowledge graph, reviewing flashcards, brainstorming on an infinite canvas, and connecting local AI assistants.

---

## Table of Contents

1. [Core Philosophy & Architecture](#1-core-philosophy--architecture)
2. [Workspaces & Hearths](#2-workspaces--hearths)
3. [Live Preview Editor & Markdown](#3-live-preview-editor--markdown)
4. [Bidirectional Linking & Knowledge Graph](#4-bidirectional-linking--knowledge-graph)
5. [Infinite 2D Spatial Canvas](#5-infinite-2d-spatial-canvas)
6. [Embedded FSRS-4.5 Spaced Repetition](#6-embedded-fsrs-45-spaced-repetition)
7. [Centralized Tasks Dashboard](#7-centralized-tasks-dashboard)
8. [Journal & Daily Notes](#8-journal--daily-notes)
9. [Full-Text Search & Quick Open](#9-full-text-search--quick-open)
10. [Model Context Protocol (MCP) AI Integration](#10-model-context-protocol-mcp-ai-integration)
11. [Themes & Customization](#11-themes--customization)
12. [Client Updates & Release Management](#12-client-updates--release-management)
13. [Keyboard Shortcuts Cheat Sheet](#13-keyboard-shortcuts-cheat-sheet)

---

## 1. Core Philosophy & Architecture

---

Flint is an open-source, local-first note-taking app built around four simple principles:

- **Plain Markdown on disk**: Your notes are standard `.md` files on your computer. No vendor lock-in, proprietary database wrappers, or encrypted blobs. You can open, edit, or back up your files with any text editor at any time.
- **Fast native search & links**: Notes, tags, and links are indexed into a local SQLite database in Rust. Search and backlink lookups are instant without any laggy WebAssembly overhead.
- **Fast, fluid typing**: The Live Preview editor stays snappy and responsive even when writing long notes with thousands of words, complex tables, and math formulas.
- **AI-ready when you want it**: Flint includes a local Model Context Protocol (MCP) server so AI assistants like Claude Desktop, Antigravity, and Cursor can read or update your notes safely if you choose to connect them.

---

## 2. Workspaces & Hearths

---

In Flint, individual note vaults are called **Hearths**.

### Creating or Opening a Hearth
- On first launch, select an existing directory on your drive or create a new empty folder.
- Flint initializes a hidden `.flint/` directory inside that folder to store local relational indexes (`flint.sqlite`), canvas workspaces, and extension settings.
- **Switching Hearths (`Ctrl+Shift+O`)**: Press `Ctrl+Shift+O` to open the Hearth Switcher modal. Switch between *Work*, *Personal*, or *Research* vaults instantly without restarting the app.

### File Safety & The `.trash/` Folder
When you delete a note, Flint never immediately destroys the file on disk. Instead:
- The `.md` file is moved into the hidden `.trash/` directory inside your Hearth.
- Flint remembers where the file came from and when it was deleted, so you can restore it anytime.
- Files can be restored to their exact prior location at any time from *Settings → File Safety*.

---

## 3. Live Preview Editor & Markdown

---

Flint provides a hybrid WYSIWYG / Markdown editor built on TipTap 2.x and ProseMirror.

### Modes
- **Live Preview (Default)**: Markdown formatting renders interactively as you write. Clicking on a formatted token reveals the underlying syntax for precise inline editing.
- **Source Mode**: Monospaced raw CommonMark text view, toggled via `Ctrl+K` → *Toggle Source Mode*.

### Slash Commands (`/`)
Type `/` on any blank line to access the quick-insertion menu:
- Headings (`H1` through `H6`)
- Interactive Checklist (`- [ ]`)
- Bulleted & Numbered Lists
- Visual Table Grid
- Math Formula Block
- Callout Boxes (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, etc.)
- Code Block with syntax highlighting

### KaTeX & MathLive Formulas
- **Inline Equations**: `$E = mc^2$`
- **Multi-Line Display Blocks**:
  ```markdown
  $$
  f(x) = \int_{-\infty}^\infty \hat{f}(\xi)\,e^{2 \pi i \xi x}\,d\xi
  $$
  ```
- **Visual Math Keyboard**: Click any formula chip to open an on-screen math keyboard containing calculus symbols, matrices, Greek characters, and logic operators.

### Interactive Tables
- Insert tables via `/table` and select grid dimensions.
- Use **Edge Controls** (`+` handles on borders) to insert rows and columns with a single click.
- Highlight cells to reveal the **Floating Toolbar** for alignment, header toggling, and deletions.
- Press `Tab` to navigate between cells; pressing `Tab` in the final cell automatically creates a new row.

### Web Clip Cleaner & Citation Stripper
Pasting text copied from research articles, Wikipedia, or web pages automatically cleans up formatting:
- Strips academic citation footnotes (`[1]`, `[12]`, `[citation needed]`).
- Converts HTML headers, tables, and lists into clean CommonMark.
- Strips URL referral tracking parameters.

---

## 4. Bidirectional Linking & Knowledge Graph

---

Flint turns independent notes into a structured web of thoughts.

### Wiki-Link Syntax
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
- **Tactile Aesthetic Palettes**: Select from 6 curated single-word palettes: **Amber**, **Emerald**, **Neon**, **Ocean**, **Sunset**, and **Pastel**, rendered with tactile 3D button styling.
- **In-App Color Picker**: In **By File Type** mode, click any category swatch (Notes, Canvases, Images, Media, Documents, Tags, Other) to open Flint's custom color picker popover with 2D saturation/brightness spectrum, hue slider, eyedropper, RGB/HEX inputs, and active palette presets.
- **Display Toggles**:
  - **Directional link arrows**: Render clean arrowheads along connections indicating wiki link directions.
  - **Orphan node filter**: Toggle visibility of unconnected notes without links.
  - **Virtual #tag nodes**: Render tag nodes as virtual hubs connecting tagged notes. Clicking any tag node instantly filters the graph.
- **Pauses when idle**: The graph physics automatically pauses when you are not interacting with it, saving battery and GPU power.

---

## 5. Infinite 2D Spatial Canvas

---

For visual brainstorming, concept maps, flowcharts, and moodboards:

- Click **Canvas** on the Action Rail or run `Ctrl+K` → *Open Canvas*.
- **Note Cards**: Drag documents from the file tree directly onto the canvas plane.
- **Sticky Text Nodes**: Double-click anywhere to create free-form sticky cards.
- **Group Containers**: Select cards and press `Ctrl+G` to encase them in colored, titled container frames.
- **Connectors**: Drag connection handles from card borders to create Bezier curve arrows with custom labels.
- **Navigation**: Hold `Spacebar` or `Ctrl` to pan, scroll with `Ctrl+Wheel` to zoom, and use snap-to-grid for tidy alignment.

---

## 6. Embedded FSRS-4.5 Spaced Repetition

---

Flint features an integrated flashcard scheduler powered by **FSRS-4.5 (Free Spaced Repetition Scheduler)** via `ts-fsrs`.

### Card Syntax
Create flashcards directly in your notes:
- **Concept Card**: `Question :: Answer`
- **Bidirectional Card**: `Term ;; Definition` (generates two review cards)
- **Cloze Deletion**: `The capital of Japan is {Tokyo}.` or `The capital of Japan is ==Tokyo==.`

### Review Deck Modal
- Click **Flashcards** on the Action Rail or run `Ctrl+Alt+F`.
- Grade recall difficulty:
  - `1` (Again): Failed recall, repeat soon.
  - `2` (Hard): Remembered with effort, shorter interval next time.
  - `3` (Good): Correct recall, standard review schedule.
  - `4` (Easy): Effortless recall, push the review further out.
- View stability ($S$), difficulty ($D$), and upcoming review heatmaps in *Settings → Extensions → Spaced Repetition*.

---

## 7. Centralized Tasks Dashboard

---

Never lose track of action items scattered across project notes:

- Write tasks in any document: `- [ ] Buy server hardware #infra`
- Open the **Tasks Dashboard** from the Action Rail (`Ctrl+Alt+T`).
- **Kanban Board**: Drag task cards between *To Do*, *In Progress*, and *Completed*.
- **Checklist Mode**: Group tasks by file, priority, or tag.
- **Instant two-way sync**: Checking off a task in the dashboard immediately checks the box in your markdown file, and editing the note updates the dashboard.

---

## 8. Journal & Daily Notes

---

- Click the **Journal** icon or press `Ctrl+Alt+J` to open today's scratchpad (e.g. `Journal/2026-09-06.md`).
- Customize note naming formats (`YYYY-MM-DD`, `YYYY/MM/DD`) and default templates in *Settings → Extensions → Journal*.
- Use `Alt+←` and `Alt+→` in the journal header to step backward and forward through previous daily entries.

---

## 9. Full-Text Search & Quick Open

---

- **Quick Open (`Ctrl+K` or `Ctrl+O`)**: Search notes by title, folder path, or alias with fuzzy matching.
- **Vault-Wide Search (`Ctrl+Shift+F`)**: Powered by SQLite FTS5 with BM25 ranking. Includes automatic diacritics removal (e.g. `cliche` matches `cliché`).
- **Syntax Filters**:
  - `tag:#project`: Filter by tag.
  - `path:Notes/`: Filter by folder subtree.
  - `"exact phrase"`: Literal phrase matching.

---

## 10. Model Context Protocol (MCP) AI Integration

---

Flint includes a built-in stdio Model Context Protocol server (`bin/flint-mcp-server.cjs`). External AI assistants can query and modify your notes directly.

### 13 Built-in MCP Tools
`flint_search_notes`, `flint_read_note`, `flint_create_note`, `flint_update_note`, `flint_delete_note`, `flint_list_all_notes`, `flint_list_hearths`, `flint_get_active_hearth`, `flint_switch_hearth`, `flint_search_across_hearths`, `flint_get_backlinks`, `tasks_get_all`, `fsrs-spaced-repetition_get_due_cards`.

### Quick Configuration (Claude Desktop / Antigravity / Cursor)
Add to your client configuration file:
```json
{
  "mcpServers": {
    "flint": {
      "command": "node",
      "args": ["<path-to-flint>/bin/flint-mcp-server.cjs"]
    }
  }
}
```

---

## 11. Themes & Customization

---

Open **Settings** (`Ctrl+,`) → **Appearance**:
- **Pre-installed Themes**: Catppuccin, Nord, Cyberpunk Neon, Rosé Pine, Tokyo Night, Solarized Dark/Light, Flint Dark/Light, Forest Emerald, and Minimal.
- **Tactile buttons**: Clean physical button styling with crisp borders and snappy, instant feedback.
- **Link Styling**: Choose between theme accent, classic browser blue/purple, or neutral link palettes.

---

## 12. Client Updates & Release Management

---

Flint features an integrated updater that monitors official GitHub releases:

- **Automatic Background Checks**: When enabled in **Settings** (`Ctrl+,`) → **General**, Flint checks GitHub Releases after startup (with a 4-hour cooldown) and notifies you when new releases are available.
- **Manual Check**: Click **Check for updates** in the General settings tab anytime to immediately check against the remote repository.
- **Direct Installer Download**: Launch the update modal to review release notes and download the matching `.exe` or `.msi` Windows installer directly.

---

## 13. Keyboard Shortcuts Cheat Sheet

---

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Command Palette / Quick Open** | `Ctrl + K` or `Ctrl + O` | `Cmd + K` or `Cmd + O` |
| **Toggle Left Sidebar** | `Ctrl + \` | `Cmd + \` |
| **Toggle Right Sidebar** | `Ctrl + Shift + \` | `Cmd + Shift + \` |
| **Switch Hearth Workspace** | `Ctrl + Shift + O` | `Cmd + Shift + O` |
| **Create New Note** | `Ctrl + N` | `Cmd + N` |
| **Split Editor Side-by-Side** | `Ctrl + Alt + S` | `Cmd + Alt + S` |
| **New Tab / Close Tab** | `Ctrl + T` / `Ctrl + W` | `Cmd + T` / `Cmd + W` |
| **Next / Previous Tab** | `Ctrl + Tab` / `Ctrl + Shift + Tab` | `Ctrl + Tab` / `Ctrl + Shift + Tab` |
| **Open Knowledge Graph** | `Ctrl + G` | `Cmd + G` |
| **Open Infinite Canvas** | `Ctrl + Alt + C` | `Cmd + Alt + C` |
| **Open Tasks Dashboard** | `Ctrl + Alt + T` | `Cmd + Alt + T` |
| **Open Today's Journal** | `Ctrl + Alt + J` | `Cmd + Alt + J` |
| **Open Flashcard Review** | `Ctrl + Alt + F` | `Cmd + Alt + F` |
| **Toggle Bold / Italic** | `Ctrl + B` / `Ctrl + I` | `Cmd + B` / `Cmd + I` |
| **Toggle Highlight** | `Ctrl + Shift + H` | `Cmd + Shift + H` |
| **Inline Code** | `Ctrl + E` | `Cmd + E` |
| **Heading Levels 1 to 6** | `Ctrl + Alt + 1..6` | `Cmd + Alt + 1..6` |
| **Insert Checklist Task** | `Ctrl + Shift + 9` | `Cmd + Shift + 9` |
| **Trigger Slash Menu** | `/` | `/` |
| **Trigger Wiki-Link Popup** | `[[` | `[[` |
| **Zoom In / Out / Reset** | `Ctrl + +` / `Ctrl + -` / `Ctrl + 0` | `Cmd + +` / `Cmd + -` / `Cmd + 0` |
| **Open Settings** | `Ctrl + ,` | `Cmd + ,` |

