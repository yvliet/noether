# Component Variables

CSS variables and class tokens for interactive UI components: 3D tactile buttons (`noether-btn`), form inputs, checkboxes, toggles, select menus, dropdowns, and modal dialogs.


## 1. Tactile 3D Buttons (`noether-btn`)

---

Noether features tactile buttons with crisp borders and visual depth:

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-btn-bg` | `#232323` | Default button background. |
| `--noether-btn-bg-hover` | `#2d2d2d` | Hover state background. |
| `--noether-btn-border` | `#383838` | Button boundary border. |
| `--noether-btn-border-bottom` | `#181818` | Darker bottom border producing tactile 3D depth. |
| `--noether-btn-primary-bg` | `var(--noether-accent)` | Primary action button background. |
| `--noether-btn-primary-hover` | `var(--noether-accent-hover)` | Primary action hover background. |

```css
.noether-btn {
  background-color: var(--noether-btn-bg);
  border: 1px solid var(--noether-btn-border);
  border-bottom: 2px solid var(--noether-btn-border-bottom);
  color: var(--noether-text-primary);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
```


## 2. Text Inputs & Search Boxes

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-input-bg` | `#181818` | Text input background. |
| `--noether-input-border` | `#2e2e2e` | Text input border. |
| `--noether-input-focus-border`| `var(--noether-accent)` | Focused input outline color. |
| `--noether-input-text` | `#ffffff` | Typed input text color. |
| `--noether-input-placeholder`| `#666666` | Placeholder text color. |


## 3. Toggle Switches & Checkboxes

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-toggle-bg-off` | `#2e2e2e` | Inactive toggle pill background. |
| `--noether-toggle-bg-on` | `var(--noether-accent)` | Active toggle pill background. |
| `--noether-toggle-knob` | `#ffffff` | Circular sliding knob color. |


## 4. Modal Dialogs & Overlays

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-modal-backdrop` | `rgba(0, 0, 0, 0.70)` | Darkened background overlay. |
| `--noether-modal-bg` | `#1e1e1e` | Modal surface background. |
| `--noether-modal-border` | `#383838` | Modal outer border. |
| `--noether-modal-shadow` | `var(--noether-shadow-3)`| 3D drop shadow. |


## 5. Dropdowns & Context Menus

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--noether-menu-bg` | `#232323` | Context menu container background. |
| `--noether-menu-border` | `#363636` | Menu container border. |
| `--noether-menu-item-hover` | `rgba(255, 255, 255, 0.08)` | Hovered menu row background. |
