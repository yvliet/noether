# Tables

Noether provides interactive Markdown tables with visual grid insertion, edge hover controls, and drag column resizing.

## 1. Creating Tables
---

You can write Markdown tables manually or use visual shortcuts:

- **Slash Command Picker**: Type `/table` on any empty line to open the interactive grid picker. Hover your mouse over the grid to select your row and column count (e.g. 4x3) and click to insert.
- **Markdown Syntax**: Type pipes and dashes directly:

```markdown
| Feature | Status | Priority |
| :--- | :--- | :--- |
| Editor | Active | High |
| Canvas | Active | Medium |
```

## 2. Table Edge Controls
---

When hovering your mouse near any table in Live Preview, quick-action buttons appear:

- **Add Column (`+ Col`)**: Hover over the right edge of any table to reveal a `+ Col` button for instant column insertion.
- **Add Row (`+ Row`)**: Hover over the bottom border of any table to reveal a `+ Row` button for instant row insertion.

## 3. Floating Toolbar & Column Resizing
---

Clicking any table cell displays a contextual floating toolbar:

- **Row Operations**: Add Row Above (`+ Row ↑`), Add Row Below (`+ Row ↓`), or Delete Row (`- Row`).
- **Column Operations**: Add Column Left (`+ Col ←`), Add Column Right (`+ Col →`), or Delete Column (`- Col`).
- **Header Controls**: Toggle Header Row on or off, or Delete Table entirely.
- **Drag Resizing**: Hover over any vertical column divider line and drag horizontally to customize cell widths.

## 4. Keyboard Navigation
---

- Press `Tab` to jump to the next cell. Pressing `Tab` while inside the bottom-right cell automatically creates a new row.
- Press `Shift+Tab` to step backward to the previous cell.
- Use `↑` and `↓` arrow keys to move vertically between cells in the same column.

## 5. Next Steps
---

- Highlight notes and warnings with [[Callouts]].
- Review markdown shortcuts in [[Basic Formatting]].
- Organize your vault folders in [[Vaults & Storage]].
