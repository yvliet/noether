# Editor

Noether features a clean Live Preview editor that renders formatted text as you type while keeping your notes saved as plain Markdown files on disk.

## 1. Live Preview & Source Mode
---

Noether provides two editing modes depending on how you like to work:

1. **Live Preview (Default)**: Text formatting renders visually as you type. Headings, bold text, formulas, and tables display with live styling, and reveal their raw markdown syntax only when your cursor moves into them.
2. **Source Mode**: Displays raw, unrendered text in a clean monospace font, ideal for editing frontmatter metadata (see [[Properties]]) or inspecting raw syntax directly.

To toggle between modes, press `Ctrl+Shift+M` (or `Cmd+Shift+M` on macOS) or select your mode from the **Document Options menu (`...`)** in the top-right corner.

## 2. Document Options Menu
---

Click the three dots (`...`) in the top-right corner of any note to access contextual actions:

- **Lock Note (Read-Only)**: Protects the note from accidental edits, hiding the cursor and preventing typing.
- **Merge Note With...**: Combines another note directly into the active document with a clean divider and heading.
- **Zoom Presets**: Instant viewport scaling (from 50% to 200%) to adjust text size comfortably.
- **Export to PDF**: Opens the system print and PDF export dialog (`window.print()`). For side-by-side reading or slide presentations, see [[PDF Viewer & Presentation Mode]].
- **Reveal in File Tree**: Expands parent folders in the sidebar and highlights the active file.
- **Show in System Explorer / Open in Default App**: Reveals the file in Windows File Explorer or macOS Finder, or opens it with your default markdown reader.
- **Copy Path Submenu**: Copies the note title, vault-relative path, full file path, or Wikilink syntax (`[[Note Title]]`) directly to your clipboard.

## 3. Find & Replace in Note
---

Press `Ctrl+F` (or `Cmd+F` on macOS) to open the in-editor search bar at the top of the pane:

- **Pre-Populated Search**: Highlighting any word in your note before pressing `Ctrl+F` automatically fills the search box with that text.
- **Find & Replace**: Press `Ctrl+H` to reveal the Replace input field.
- **Match Navigation**: Shows a live counter (e.g. `3 of 12`). Press `Enter` or `↓` to jump to the next match, and `Shift+Enter` or `↑` for the previous match.
- **Case Matching (`Aa`)**: Toggle case sensitivity for exact casing matches.
- **Batch Replacement**: Click **Replace** to swap the active match, or **Replace All** to update every occurrence across the note at once.
- **Dismissal**: Press `Esc` to close the bar and return focus to your typing position.

## 4. Image Lightbox & Media Viewer
---

Click any image embedded in a note to open the full-screen viewer:

- **Cursor-Centered Zoom**: Use mouse wheel scrolling or trackpad pinch gestures to zoom smoothly up to 25x centered at your cursor.
- **Keyboard Zoom**: Press `+` or `=` to zoom in, `-` or `_` to zoom out, and `0` to reset back to 1x centered fit.
- **Pan Across Images**: Click and drag to pan across high-resolution diagrams. Alternatively, use keyboard arrow keys (`↑`, `↓`, `←`, `→`), holding `Shift` for faster panning.
- **Double-Click Zoom**: Double-clicking anywhere on the image toggles between 1x centered fit and 2x zoom at the cursor coordinates.
- **Exit Lightbox**: Press `Esc` or click the darkened backdrop to return to editing.

## 5. Next Steps
---

- Learn text styling, lists, and wikilinks in [[Basic Formatting]].
- Insert formulas and equations in [[Math & LaTeX]].
- Create interactive tables with [[Tables]].
- Add highlight callouts with [[Callouts]].
