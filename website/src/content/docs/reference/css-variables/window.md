# Window & Frame Variables

Variables controlling the desktop window title bar, frameless window boundaries, draggable regions, native window controls, and global status bar.


## 1. Title Bar & Header Strip

---

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--noether-bg-topbar` | `#0d0d0d` | `#f1f5f9` | Title bar background. |
| `--noether-topbar-height` | `38px` | `38px` | Height of the draggable top title bar. |
| `--noether-topbar-title-color` | `#ffffff` | `#0f172a` | Color of active Vault name in title bar. |
| `--noether-topbar-border` | `1px solid var(--noether-border-subtle)` | Bottom border dividing title bar from workspace. |


## 2. Window Controls (Minimize / Maximize / Close)

---

Noether utilizes custom desktop title bar buttons that match the native platform feel:

```css
/* Custom title bar drag region */
.titlebar-drag-region {
  -webkit-app-region: drag;
}

/* Non-draggable controls inside titlebar */
.titlebar-no-drag {
  -webkit-app-region: no-drag;
}
```

| Token | Value | Description |
| :--- | :--- | :--- |
| `--noether-window-btn-hover` | `rgba(255, 255, 255, 0.08)` | Background on window control hover. |
| `--noether-window-close-hover`| `#ef4444` | Red background on window close button hover. |
| `--noether-window-close-text` | `#ffffff` | Close icon color when hovered. |


## 3. Left Action Rail / Ribbon

---

The Action Rail provides quick-access launchers:

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--noether-bg-ribbon` | `#111111` | `#e2e8f0` | Action rail icon column background. |
| `--noether-ribbon-width` | `44px` | `44px` | Standard ribbon width. |
| `--noether-ribbon-icon` | `#888888` | `#64748b` | Inactive ribbon icon color. |
| `--noether-ribbon-icon-hover`| `#ffffff` | `#0f172a` | Hovered ribbon icon color. |
| `--noether-ribbon-icon-active`| `var(--noether-accent)` | Active launcher icon color. |


## 4. Status Bar Tokens

---

The bottom status bar hosts live word counts, sync indicators, and extension widgets:

| Token | Dark Default | Light Default | Description |
| :--- | :--- | :--- | :--- |
| `--noether-bg-statusbar` | `#1f1f1f` | `#f1f5f9` | Bottom status bar strip background. |
| `--noether-statusbar-height`| `26px` | `26px` | Height of the status bar. |
| `--noether-statusbar-text` | `#888888` | `#64748b` | Status bar text color. |
| `--noether-statusbar-border` | `1px solid var(--noether-border-subtle)` | Top border of status bar. |
