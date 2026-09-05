# About Styling in Flint

Flint provides a clean, modular styling architecture built on standard CSS Custom Properties (design tokens). Flint operates on a live hot-reloading architecture: when you edit your theme's `styles.css` file, changes reflect instantly across the active workspace.


## 1. The Design Token Philosophy

---

Flint avoids hardcoded color hex values and proprietary CSS runtimes. Every visual element, from application windows and navigation trees to TipTap editor blocks and status widgets, consumes standardized `--flint-*` CSS custom properties.

### Key Benefits
- **Zero Layout Shifts**: Design tokens evaluate synchronously in the browser engine.
- **Dark & Light Mode Support**: Themes provide definitions for dark mode (`:root`) and light mode (`.theme-light`).
- **Seamless Extension Integration**: Extensions and plugins inherit host design tokens automatically.


## 2. Token Cascade & Scopes

---

Flint resolves styling rules using a clear cascade:

| Cascade Priority | Token Scope & Target Layer |
|:---|:---|
| **Level 1: Host Base Defaults** | `flintDark.ts` / `flintLight.ts` fallback palette for standard core views |
| **Level 2: Active Theme Overrides** | `.flint/themes/<theme>/theme.json` + `styles.css` custom palette tokens |
| **Level 3: User Customizations** | Settings UI accent color selection, interface scale, and custom fonts |
| **Level 4: Extension Custom Scopes** | Plugin-specific CSS namespaces (`.flint-ext-*`) inheriting standard variables |


## 3. Dark & Light Theme Structure

---

A standard theme stylesheet defines rules for both appearance modes:

```css
/* ==========================================================================
   Dark Mode (Default Root Scope)
   ========================================================================== */
:root {
  --flint-bg-app: #141414;
  --flint-bg-sidebar: #181818;
  --flint-bg-main: #1e1e1e;
  --flint-bg-card: #242424;
  --flint-border-base: #2e2e2e;
  --flint-text-primary: #ffffff;
  --flint-text-secondary: #d4d4d4;
  --flint-accent: #ea580c;
}

/* ==========================================================================
   Light Mode (Applied when user switches appearance to Light)
   ========================================================================== */
.theme-light {
  --flint-bg-app: #f8fafc;
  --flint-bg-sidebar: #f1f5f9;
  --flint-bg-main: #ffffff;
  --flint-bg-card: #f8fafc;
  --flint-border-base: #e2e8f0;
  --flint-text-primary: #0f172a;
  --flint-text-secondary: #334155;
  --flint-accent: #ea580c;
}
```


## 4. Instant UI Responsiveness

---

All micro-interactions in Flint (buttons, toggles, menus, tabs) render with zero artificial transition delays for an instant desktop feel.


## 5. Related Reading

---

- [[Foundations]]: Colors, typography, elevations, and spacing tokens.
- [[Window Variables]]: Window titlebars, frames, and draggable regions.
- [[Editor Variables]]: Markdown reading canvas and TipTap typography tokens.
- [[Component Variables]]: Form controls, buttons, cards, and modal dialogs.
