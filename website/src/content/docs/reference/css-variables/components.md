# Component Variables

CSS variables and class tokens for interactive UI components: 3D tactile buttons (`flint-btn`), form inputs, checkboxes, toggles, select menus, dropdowns, and modal dialogs.


## 1. Tactile 3D Buttons (`flint-btn`)

---

Flint features tactile buttons with crisp borders and visual depth:

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-btn-bg` | `#232323` | Default button background. |
| `--flint-btn-bg-hover` | `#2d2d2d` | Hover state background. |
| `--flint-btn-border` | `#383838` | Button boundary border. |
| `--flint-btn-border-bottom` | `#181818` | Darker bottom border producing tactile 3D depth. |
| `--flint-btn-primary-bg` | `var(--flint-accent)` | Primary action button background. |
| `--flint-btn-primary-hover` | `var(--flint-accent-hover)` | Primary action hover background. |

```css
.flint-btn {
  background-color: var(--flint-btn-bg);
  border: 1px solid var(--flint-btn-border);
  border-bottom: 2px solid var(--flint-btn-border-bottom);
  color: var(--flint-text-primary);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
```


## 2. Text Inputs & Search Boxes

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-input-bg` | `#181818` | Text input background. |
| `--flint-input-border` | `#2e2e2e` | Text input border. |
| `--flint-input-focus-border`| `var(--flint-accent)` | Focused input outline color. |
| `--flint-input-text` | `#ffffff` | Typed input text color. |
| `--flint-input-placeholder`| `#666666` | Placeholder text color. |


## 3. Toggle Switches & Checkboxes

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-toggle-bg-off` | `#2e2e2e` | Inactive toggle pill background. |
| `--flint-toggle-bg-on` | `var(--flint-accent)` | Active toggle pill background. |
| `--flint-toggle-knob` | `#ffffff` | Circular sliding knob color. |


## 4. Modal Dialogs & Overlays

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-modal-backdrop` | `rgba(0, 0, 0, 0.70)` | Darkened background overlay. |
| `--flint-modal-bg` | `#1e1e1e` | Modal surface background. |
| `--flint-modal-border` | `#383838` | Modal outer border. |
| `--flint-modal-shadow` | `var(--flint-shadow-3)`| 3D drop shadow. |


## 5. Dropdowns & Context Menus

---

| Token | Dark Default | Description |
| :--- | :--- | :--- |
| `--flint-menu-bg` | `#232323` | Context menu container background. |
| `--flint-menu-border` | `#363636` | Menu container border. |
| `--flint-menu-item-hover` | `rgba(255, 255, 255, 0.08)` | Hovered menu row background. |
