# PDF Viewer & Presentation Mode

Noether includes a fast, native PDF reader designed specifically for reviewing academic papers, reading slide decks, and delivering distraction-free presentations directly inside your workspace without third-party extensions.

## 1. Opening PDFs & Core Navigation
---

You can open any PDF file in your vault just like a normal Markdown note:

- **File Tree Navigation**: Click any `.pdf` document in the left sidebar to open it in an active workspace tab.
- **Wikilink Embeds**: Clicking a PDF wikilink embed (`![[research-paper.pdf]]`) in a Markdown document opens a dedicated tab with full viewer controls.
- **Quick Switcher (`Ctrl+O`)**: Type the filename of any PDF in your vault to jump straight to it.
- **External Desktop Drag & Drop**: Drag a PDF from your operating system file manager into the sidebar to import it instantly into target folders.

### High-DPI Rendering Engine
Under the hood, Noether runs a Web Worker-isolated PDF engine. Page rendering is offloaded from the main UI thread with native `devicePixelRatio` compensation, keeping high-density displays (Retina, 4K) crisp and legible without blurring or UI frame drops.

### Native Document Subheader
When a PDF tab is focused, the subheader transforms into a clean, compact toolbar matching your workspace theme:

- **Sidebar Toggle**: Click the sidebar icon on the left to reveal or hide page thumbnails and document outlines.
- **Page Jump Navigation**: Use `<` and `>` buttons or type a page number directly into the `Page / Total` input box and press `Enter` to jump instantly.
- **Zoom Presets**: Choose between predefined zoom levels (50%, 75%, 100%, 125%, 150%, 200%) from the dropdown menu.
- **Fit to Width & Fit to Page**: Automatically scale pages to fill the visible pane width or fit the entire page height without manual zooming.
- **90° Clockwise Rotation**: Click the rotation button to rotate pages on demand.
- **Presentation Button**: Click the presentation button to launch distraction-free fullscreen presentation mode.

> [!NOTE]
> PDFs in Noether are read directly from disk via native desktop commands. They are never imported as bloated base64 strings into the SQLite database, keeping your local database light and fast.

## 2. Dual-Mode PDF Sidebar
---

Clicking the sidebar toggle in the top-left corner opens a slide-out drawer with two dedicated inspection modes:

### 1. Thumbnails View
- Generates miniature previews of every page in the document.
- Only visible thumbnails are rendered in memory, scrolling smoothly through multi-hundred-page documents without memory bloat.
- Clicking any thumbnail scrolls the main reading viewport directly to that page with the active page highlighted with a subtle accent border.

### 2. Document Outline (TOC)
- Automatically extracts the hierarchical table of contents embedded in the PDF.
- Nested sections and chapter headers can be expanded or collapsed.
- Clicking any outline item jumps directly to the corresponding destination page.

> [!TIP]
> In narrow sidebar docks or split panes, the PDF sidebar defaults to collapsed so you have maximum reading room. In full workspace tabs, it opens automatically if the PDF contains an outline.

## 3. Fullscreen Presentation Mode
---

When reviewing slide decks, giving lectures, or reading papers without UI clutter, launch fullscreen presentation mode:

- **Keyboard Shortcut**: Press `Alt+P` or launch `Toggle presentation mode` from the Command Palette (`Ctrl+K`).
- **Toolbar Trigger**: Click the **Present** button in the document subheader.

### Distraction-Free Dark Canvas
Presentation mode switches the desktop window into true borderless fullscreen over a pure deep black background. The main application header, tabs, action rails, and sidebars vanish completely.

### Minimal Floating HUD
At the bottom of the screen sits a lightweight, vertically centered floating HUD:
`< page / total > | + - ↺ | ✕`

- **Navigation Group**: Click `<` and `>` to switch slides.
- **Zoom Controls**: Click `+` to zoom in, `-` to zoom out, or `↺` (reset) to return to 1x centered fit.
- **Exit Control**: Click `✕` to exit presentation mode.
- The HUD remains subtle and non-obtrusive, resting cleanly on the dark surface without oversized bounding boxes.

### Pure Zoom & Pan Physics
Presentation mode eliminates accidental vertical and horizontal wheel scrolling:

- **Cursor-Centered Zooming**: Scrolling the mouse wheel or trackpad pinching zooms strictly into and out of the exact position of your mouse cursor.
- **Double-Click Zoom Toggle**: Double-clicking any spot on a slide instantly toggles between 1x centered fit and 2x magnification at the clicked coordinates.
- **Restricted Smooth Panning**: Panning by dragging the mouse (`cursor-grab` → `cursor-grabbing`) is strictly enabled when zoomed in (`> 1x`). At 1x, the slide remains firmly centered so your deck never drifts off-screen.
- **Snap to Center**: Zooming all the way out automatically snaps the slide back to 1x center coordinates `(0, 0)`.

### Slide Navigation & Shortcuts
- Next Slide: `→` (Right Arrow), `Space`, or `PageDown`.
- Previous Slide: `←` (Left Arrow) or `PageUp`.
- Zoom In / Out: `+` / `-`, or `Ctrl+Wheel` / trackpad pinch.
- Reset Zoom: `0` or the HUD reset button (`↺`).
- Exit Presentation: `Esc` or clicking `✕`.

## 4. Markdown Embed Integration
---

You can open, read, and reference PDF files alongside your notes:

- Write `![[research-paper.pdf]]` to embed a live interactive PDF preview directly inside any Markdown note.
- The embed renders the document with smooth page navigation and scroll containment.
- Clicking the embed opens the full document in a dedicated tab where you can inspect the outline, search pages, or enter presentation mode.

## 5. Keyboard Shortcuts & Controls
---

| Shortcut / Gesture | Context | Action |
| :--- | :--- | :--- |
| `Alt+P` | PDF Viewer | Toggle fullscreen presentation mode |
| `→` / `Space` / `PageDown` | Presentation Mode | Next page / slide |
| `←` / `PageUp` | Presentation Mode | Previous page / slide |
| `+` / `Ctrl++` | Presentation Mode | Zoom in |
| `-` / `Ctrl+-` | Presentation Mode | Zoom out |
| `0` | Presentation Mode | Reset zoom to 1x centered fit |
| `Double Click` | Presentation Mode | Toggle between 1x and 2x zoom at cursor |
| `Click & Drag` | Presentation Mode | Pan slide (active when zoomed in) |
| `Esc` | Presentation Mode | Exit presentation mode |
| `Ctrl+0` | PDF Viewer | Fit to visible width |
| `Ctrl+Alt+R` | PDF Viewer | Rotate pages 90° clockwise |

## 6. AI Assistant & MCP Tool Support
---

When connecting local AI assistants (Claude Desktop, Cursor, Google Antigravity) through Noether's Model Context Protocol (MCP) server, your assistant can query PDF structure directly via the built-in `noether_pdf_get_info` tool.

### Tool: `noether_pdf_get_info`
- **What It Does**: Extracts metadata, total page count, and hierarchical table of contents (outline) from any PDF in your vault without transferring raw binary blobs.
- **Parameters**: `target` (note ID, document title, or vault-relative path, e.g. `"Papers/Quantum_Computing.pdf"`).
- **Example AI Prompts**:
  - *"Summarize the outline of the PDF named 'Q3_Roadmap.pdf' in my vault."*
  - *"How many pages are in 'lecture_notes.pdf' and what are the main chapter headings?"*
