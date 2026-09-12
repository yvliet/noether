# Build Your First Theme

Themes in Noether allow you to completely customize the colors, font typography, surface gradients, and syntax highlights of the workspace using standard CSS.

Noether includes live hot-reloading for theme development: whenever you edit and save your theme's `styles.css` file, Noether updates the running desktop application immediately without requiring a restart.


## 1. Theme Directory Layout

---

Themes are stored within your active Vault in the `.noether/themes/` directory. Each theme resides in its own folder:

```
<your-vault>/
└── .noether/
    └── themes/
        └── my-custom-theme/
            ├── manifest.json   ← Theme metadata
            ├── styles.css      ← CSS variable overrides & rules
            └── banner.png      ← Optional preview thumbnail (400x250)
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

Noether uses semantic CSS custom properties defined in [[CSS Variables & Design Tokens]]. You only need to declare the tokens you wish to change:

```css
/* ==========================================================================
   Solar Ember Theme for Noether
   ========================================================================== */

/* Dark Mode Overrides */
:root {
  /* Surfaces */
  --noether-bg-app: #181412;
  --noether-bg-sidebar: #1f1a17;
  --noether-bg-main: #241e1a;
  --noether-bg-card: #2c2520;
  --noether-bg-popover: #2c2520;
  --noether-bg-input: #1a1613;

  /* Borders */
  --noether-border-subtle: #2d241e;
  --noether-border-base: #3d322a;
  --noether-border-strong: #544438;

  /* Typography */
  --noether-text-primary: #fdf6e2;
  --noether-text-secondary: #e6dac3;
  --noether-text-muted: #a89984;

  /* Accent */
  --noether-accent: #d94338;
  --noether-accent-hover: #fb923c;
  --noether-accent-active: #eb584d;
  --noether-accent-subtle: rgba(249, 115, 22, 0.16);

  /* Code Syntax Blocks */
  --noether-code-bg: #1c1714;
  --noether-code-text: #fbeee0;
}

/* Light Mode Overrides (when user selects light appearance) */
.theme-light {
  --noether-bg-app: #fffbf5;
  --noether-bg-sidebar: #f7ede0;
  --noether-bg-main: #ffffff;
  --noether-bg-card: #f2e4d4;
  --noether-border-base: #e0ceba;

  --noether-text-primary: #3d2c1d;
  --noether-text-secondary: #5c432d;
  --noether-text-muted: #8c6e51;

  --noether-accent: #eb584d;
  --noether-accent-hover: #d94338;
}
```


## 4. Activating & Testing Your Theme

---

1. Open Noether.
2. Go to **Settings > Appearance** (`Cmd+,` / `Ctrl+,`).
3. Under the **Installed Themes** dropdown, select **Solar Ember**.
4. Noether immediately applies your CSS rules.
5. Keep `styles.css` open in your favorite code editor; each time you save, Noether updates the preview instantly.


## 5. Next Steps

---

- Explore the complete list of design tokens in [[CSS Variables & Design Tokens]].
- See how native controls adapt to your theme in [[Noether UI Components]].
- Ready to share your theme? Check out [[Submitting Themes]].
