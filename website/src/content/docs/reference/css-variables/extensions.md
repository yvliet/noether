# Extension CSS Variables

Standards and design tokens for styling custom extension UI components, dynamic React portal slots, sidebar views, settings tabs, and status bar badges.


## 1. Scoped Extension Styling

---

Extensions should scope their CSS rules to prevent unintended pollution of host application styles:

```css
/* Good: Scoped to the extension unique identifier */
.noether-ext-word-counter {
  background-color: var(--noether-bg-card);
  border: 1px solid var(--noether-border-base);
  border-radius: 6px;
  padding: 8px 12px;
}

.noether-ext-word-counter .counter-badge {
  color: var(--noether-text-secondary);
  font-size: 0.85em;
}
```


## 2. Dynamic Portal Slot Tokens

---

When mounting into portal slots (`workspace:root`, `editor:floating-toolbar`, `editor:minimap`), use standard host layout tokens:

| Token | Description |
| :--- | :--- |
| `--noether-portal-z-floating` | `z-index: 40`: Floating toolbars and active note HUDs. |
| `--noether-portal-z-modal` | `z-index: 100`: Full-screen modals and lightboxes. |
| `--noether-portal-z-popover` | `z-index: 60`: Dropdown menus and slash command menus. |


## 3. Settings Preferences Tokens

---

When implementing a custom settings tab via `this.registerSettingTab()`:

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-setting-row-border` | `var(--noether-border-subtle)` | Divider between setting items. |
| `--noether-setting-title-color`| `var(--noether-text-primary)` | Setting title text color. |
| `--noether-setting-desc-color` | `var(--noether-text-muted)` | Setting description subtext color. |


## 4. Status Bar Extension Badges

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-status-badge-bg` | `#282828` | Background of pill badges in the status bar. |
| `--noether-status-badge-text` | `#b3b3b3` | Foreground text in status bar badges. |
