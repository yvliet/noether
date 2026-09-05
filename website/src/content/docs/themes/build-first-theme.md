# Build Your First Theme

Themes in Flint allow you to completely customize the colors, font typography, surface gradients, and syntax highlights of the workspace using standard CSS.

Flint includes live hot-reloading for theme development: whenever you edit and save your theme's `styles.css` file, Flint updates the running desktop application immediately without requiring a restart.


## 1. Theme Directory Layout

---

Themes are stored within your active Hearth in the `.flint/themes/` directory. Each theme resides in its own folder:

```
<your-hearth>/
└── .flint/
    └── themes/
        └── my-custom-theme/
            ├── manifest.json   <-- Theme metadata
            ├── styles.css      <-- CSS variable overrides & rules
            └── banner.png      <-- Optional preview thumbnail (400x250)
```


## 2. Creating the Manifest (`manifest.json`)

---

Create `manifest.json` inside your theme folder:

```json
{
  "id": "solar-ember",
  "name": "Solar Ember",
  "version": "1.0.0",
  "minAppVersion": "0.1.0",
  "type": "theme",
  "description": "A high-contrast dark theme with warm embers and deep charcoal surfaces.",
  "author": "Yuliet Li",
  "authorUrl": "https://github.com/yvliet"
}
```


## 3. Writing Theme CSS (`styles.css`)

---

Flint uses semantic CSS custom properties defined in [[CSS Variables & Design Tokens]]. You only need to declare the tokens you wish to change:

```css
/* ==========================================================================
   Solar Ember Theme for Flint
   ========================================================================== */

/* Dark Mode Overrides */
:root {
  /* Surfaces */
  --flint-bg-app: #181412;
  --flint-bg-sidebar: #1f1a17;
  --flint-bg-main: #241e1a;
  --flint-bg-card: #2c2520;
  --flint-bg-popover: #2c2520;
  --flint-bg-input: #1a1613;

  /* Borders */
  --flint-border-subtle: #2d241e;
  --flint-border-base: #3d322a;
  --flint-border-strong: #544438;

  /* Typography */
  --flint-text-primary: #fdf6e2;
  --flint-text-secondary: #e6dac3;
  --flint-text-muted: #a89984;

  /* Accent */
  --flint-accent: #f97316;
  --flint-accent-hover: #fb923c;
  --flint-accent-active: #ea580c;
  --flint-accent-subtle: rgba(249, 115, 22, 0.16);

  /* Code Syntax Blocks */
  --flint-code-bg: #1c1714;
  --flint-code-text: #fbeee0;
}

/* Light Mode Overrides (when user selects light appearance) */
.theme-light {
  --flint-bg-app: #fffbf5;
  --flint-bg-sidebar: #f7ede0;
  --flint-bg-main: #ffffff;
  --flint-bg-card: #f2e4d4;
  --flint-border-base: #e0ceba;

  --flint-text-primary: #3d2c1d;
  --flint-text-secondary: #5c432d;
  --flint-text-muted: #8c6e51;

  --flint-accent: #ea580c;
  --flint-accent-hover: #c2410c;
}
```


## 4. Activating & Testing Your Theme

---

1. Open Flint.
2. Go to **Settings > Appearance** (`Cmd+,` / `Ctrl+,`).
3. Under the **Installed Themes** dropdown, select **Solar Ember**.
4. Flint immediately applies your CSS rules.
5. Keep `styles.css` open in your favorite code editor; each time you save, Flint updates the preview instantly.


## 5. Next Steps

---

- Explore the complete list of design tokens in [[CSS Variables & Design Tokens]].
- See how native controls adapt to your theme in [[Flint UI Components]].
- Ready to share your theme? Check out [[Submitting Themes]].
