# Plugin & Extension CSS Variables

Standards and design tokens for styling custom extension UI components, dynamic React portal slots, sidebar views, settings tabs, and status bar badges.


## 1. Scoped Extension Styling

---

Extensions should scope their CSS rules to prevent unintended pollution of host application styles:

```css
/* Good: Scoped to the extension unique identifier */
.flint-ext-word-counter {
  background-color: var(--flint-bg-card);
  border: 1px solid var(--flint-border-base);
  border-radius: 6px;
  padding: 8px 12px;
}

.flint-ext-word-counter .counter-badge {
  color: var(--flint-text-secondary);
  font-size: 0.85em;
}
```


## 2. Dynamic Portal Slot Tokens

---

When mounting into portal slots (`workspace:root`, `editor:floating-toolbar`, `editor:minimap`), use standard host layout tokens:

| Token | Description |
| :--- | :--- |
| `--flint-portal-z-floating` | `z-index: 40`: Floating toolbars and active note HUDs. |
| `--flint-portal-z-modal` | `z-index: 100`: Full-screen modals and lightboxes. |
| `--flint-portal-z-popover` | `z-index: 60`: Dropdown menus and slash command menus. |


## 3. Settings Preferences Tokens

---

When implementing a custom settings tab via `this.registerSettingTab()`:

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-setting-row-border` | `var(--flint-border-subtle)` | Divider between setting items. |
| `--flint-setting-title-color`| `var(--flint-text-primary)` | Setting title text color. |
| `--flint-setting-desc-color` | `var(--flint-text-muted)` | Setting description subtext color. |


## 4. Status Bar Extension Badges

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-status-badge-bg` | `#282828` | Background of pill badges in the status bar. |
| `--flint-status-badge-text` | `#b3b3b3` | Foreground text in status bar badges. |
