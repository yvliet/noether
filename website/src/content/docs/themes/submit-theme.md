# Submitting Themes

Ready to share your custom theme with the Flint developer community? This guide outlines packaging requirements, preview standards, and sharing workflows.


## 1. Theme Submission Checklist

---

Before publishing your theme repository, verify that your theme package satisfies the following criteria:

- [ ] **Valid Manifest**: `manifest.json` contains valid JSON with `"type": "theme"`, a unique lowercase `id`, semantic `version`, and `minAppVersion`.
- [ ] **Both Modes Supported**: Includes accessible color definitions for both `:root` (dark mode) and `.theme-light` (light mode).
- [ ] **Native Design Tokens**: Relies on standard tokens from [[CSS Variables & Design Tokens]] instead of arbitrary hardcoded styles.
- [ ] **Preview Banner**: Contains a `banner.png` image (recommended: 800x500px, 16:10 ratio) showcasing your theme in action.
- [ ] **No Destructive Overrides**: Does not alter window controls, minimize/maximize buttons, or essential layout containers.


## 2. Directory Structure

---

A clean theme repository should follow this layout:

```
solar-ember-theme/
├── manifest.json
├── styles.css
├── banner.png
├── README.md
└── LICENSE
```


## 3. How Users Install Your Theme Today

---

Flint is currently developing an automated community directory. In the current release, users install themes manually by cloning or copying the theme folder into their local workspace:

```bash
# Clone directly into the Hearth's themes folder

---
cd /path/to/my-hearth/.flint/themes/
git clone https://github.com/yvliet/solar-ember-theme.git solar-ember
```

Once placed in `.flint/themes/`, the theme appears immediately under **Settings > Appearance** without requiring an application restart.


## 4. Community Showcase on GitHub

---

While the centralized marketplace registry is in development:

1. Push your theme repository to GitHub.
2. Tag your repository with the topics `flint-theme` and `flint-notes`.
3. Share your theme in the [Flint GitHub Discussions Showcase](https://github.com/yvliet/flint/discussions) with a screenshot and installation steps.

To learn more about developer standards, read [[Developer Policies & Guidelines]].
