# Canvas

Canvas provides an infinite 2D visual whiteboard to organize thoughts, lay out research, connect ideas with arrows, and build visual knowledge boards.

## 1. Overview
---

Every canvas is saved as an open JSON file (`.canvas`) inside your vault. You can place live Markdown notes, standalone text cards, images, and colored group containers, then connect them with directional arrows.

## 2. Create a Canvas
---

1. Click **New Canvas** in the left sidebar or Action Rail (or press `Ctrl+Shift+C`).
2. Type a title for your canvas and press `Enter`.
3. The infinite canvas opens with an interactive grid.

## 3. Add Items to Canvas
---

You can populate your canvas using the bottom dock or drag-and-drop:

- **Add Note Card**: Drag any note from the file tree directly onto the canvas. A live preview of the note content appears as you drag.
- **Add Text Card**: Double-click anywhere on the canvas grid, or click the **Text** tool in the bottom dock (`Alt+1`).
- **Add Group**: Click the **Group** tool (`Alt+2`) and drag a bounding box around multiple cards to group them with a custom background color and label.
- **Connect Cards**: Hover over any card edge to reveal the connector dot, then drag an arrow to another card.

## 4. Resize and Align Cards
---

- **Axis-Locked Resizing**: Drag any edge handle to resize width or height independently.
- **Shift Symmetric Resizing**: Hold `Shift` while dragging a corner handle to scale cards proportionally from their center anchor.
- **Auto-Size Images**: Images dropped into canvas automatically preserve their native aspect ratios.

## 5. Keyboard Shortcuts & Navigation
---

| Shortcut | Action |
| :--- | :--- |
| `Space + Drag` | Pan around the canvas |
| `Mouse Wheel` | Pan vertically or horizontally (`Shift + Wheel`) |
| `Ctrl + Wheel` | Zoom in and out |
| `Ctrl+0` | Reset zoom to 100% |
| `Shift+1` | Fit all cards into center view |
| `Delete` / `Backspace` | Delete selected cards, groups, or arrows |
| `Ctrl+D` | Duplicate selected cards |

> [!TIP]
> Changes made inside a note card on the canvas sync directly to the original `.md` note file on disk.
