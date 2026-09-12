# About Styling in Noether

Noether provides a clean, modular styling architecture built on standard CSS Custom Properties (design tokens). Noether operates on a live hot-reloading architecture: when you edit your theme's `styles.css` file, changes reflect instantly across the active workspace.


## 1. The Design Token Philosophy

---

Noether avoids hardcoded color hex values and proprietary CSS runtimes. Every visual element, from application windows and navigation trees to TipTap editor blocks and status widgets, consumes standardized `--noether-*` CSS custom properties.

### Key Benefits
- **Zero Layout Shifts**: Design tokens evaluate synchronously in the browser engine.
- **Dark & Light Mode Support**: Themes provide definitions for dark mode (`:root`) and light mode (`.theme-light`).
- **Seamless Extension Integration**: Extensions inherit host design tokens automatically.


## 2. Token Cascade & Scopes

---

Noether resolves styling rules using a clear cascade:

| Cascade Priority | Token Scope & Target Layer |
|:---|:---|
| **Level 1: Host Base Defaults** | `noetherDark.ts` / `noetherLight.ts` fallback palette for standard core views |
| **Level 2: Active Theme Overrides** | `.noether/themes/<theme>/theme.json` + `styles.css` custom palette tokens |
| **Level 3: User Customizations** | Settings UI accent color selection, interface scale, and custom fonts |
| **Level 4: Extension Custom Scopes** | Extension-specific CSS namespaces (`.noether-ext-*`) inheriting standard variables |


## 3. Dark & Light Theme Structure

---

A standard theme stylesheet defines rules for both appearance modes:

```css
/* ==========================================================================
   Dark Mode (Default Root Scope)
   ========================================================================== */
:root {
  --noether-bg-app: #141414;
  --noether-bg-sidebar: #181818;
  --noether-bg-main: #1e1e1e;
  --noether-bg-card: #242424;
  --noether-border-base: #2e2e2e;
  --noether-text-primary: #ffffff;
  --noether-text-secondary: #d4d4d4;
  --noether-accent: #eb584d;
}

/* ==========================================================================
   Light Mode (Applied when user switches appearance to Light)
   ========================================================================== */
.theme-light {
  --noether-bg-app: #f8fafc;
  --noether-bg-sidebar: #f1f5f9;
  --noether-bg-main: #ffffff;
  --noether-bg-card: #f8fafc;
  --noether-border-base: #e2e8f0;
  --noether-text-primary: #0f172a;
  --noether-text-secondary: #334155;
  --noether-accent: #eb584d;
}
```


## 4. Native Desktop Responsiveness

---

Noether is designed to feel like a classic desktop utility: buttons, toggles, menus, and tabs respond immediately without decorative CSS transition delays.


## 5. Related Reading

---

- [[Foundations]]: Colors, typography, elevations, and spacing tokens.
- [[Window Variables]]: Window titlebars, frames, and draggable regions.
- [[Editor Variables]]: Markdown reading canvas and TipTap typography tokens.
- [[Component Variables]]: Form controls, buttons, cards, and modal dialogs.
