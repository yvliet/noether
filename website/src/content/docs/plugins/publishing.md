# Publishing Extensions & Marketplace Roadmap

Share your creations with the Flint community. This guide walks you through preparing, packaging, and distributing your extensions today, as well as my roadmap for the upcoming centralized Community Marketplace.


## 1. Distribution Today: Local Hearth Installation & GitHub

---

In the current version of Flint, extensions and themes operate on a local-first model:

- **Local Hearth Installation**: Users install extensions by downloading or cloning an extension folder into their Hearth's `.flint/plugins/<extension-id>/` directory.
- **GitHub Distribution**: Developers distribute their extensions as open-source repositories on GitHub, attaching pre-built `main.js` and `manifest.json` bundles to GitHub Releases.

```
<your-hearth>/
└── .flint/
    └── plugins/
        └── markdown-slides/
            ├── manifest.json
            ├── main.js
            └── styles.css (optional)
```


## 2. Release Preparation Checklist

---

Before tagging a release for your extension, ensure your repository satisfies the following standards:

- [ ] **Valid `manifest.json`**:
  - `id`: Unique, lowercase kebab-case (e.g., `markdown-slides`).
  - `name`: Clean, descriptive display title.
  - `version`: Strict Semantic Versioning string (e.g., `1.0.0`).
  - `description`: Crisp summary (40-160 characters).
  - `author`: Your name or organization.
  - `authorUrl`: GitHub profile or project URL.
  - `tags`: Relevant keywords (e.g., `["visualization", "productivity"]`).
- [ ] **Compiled `main.js`**:
  - Bundled as CommonJS (`cjs`) targeting Node/neutral.
  - Core dependencies (`flint`, `react`, `react-dom`) must be marked as **external** in your `esbuild` or `rollup` config so duplicate React runtimes are not bundled.
- [ ] **Optional `styles.css`**: Scoped styles prefixed with your extension identifier to avoid polluting host styling (see [[CSS Variables & Design Tokens]]).
- [ ] **`README.md`**: Clear documentation detailing features, keyboard shortcuts, and registered [[Model Context Protocol (MCP) Tools]].
- [ ] **Desktop Responsiveness**: Verified that UI elements respond instantly with zero frame stutter or artificial animation delays (see [[Flint UI Components]]).


## 3. Packaging for GitHub Releases

---

A clean and convenient way to distribute your extension to users is via GitHub Releases:

1. Build your production bundle:
   ```bash
   npm run build
   ```
2. Create a release archive containing:
   - `manifest.json`
   - `main.js`
   - `styles.css` (if applicable)
   - `README.md`
3. Draft a new Release on your GitHub repository (e.g. `v1.0.0`) and attach the compiled `main.js`, `manifest.json`, and `.zip` archive.
4. Users can simply extract the archive into their `<hearth>/.flint/plugins/` directory and enable it under **Settings > Extensions**.


## 4. Centralized Marketplace Roadmap

---

I am actively engineering an official centralized Community Marketplace:

> [!NOTE]
> The automated Web Publishing Portal, CLI publishing tool (`flint-cli`), and in-app one-click installer are currently in active development. When ready, developers will be able to publish directly from GitHub Actions or CLI with cryptographic verification.

Until the registry service is live:
- Tag your GitHub repositories with `flint-extension` and `flint-notes`.
- Showcase your plugin and gather feedback on the official [Flint GitHub Discussions](https://github.com/yvliet/flint/discussions).
- Read [[Developer Policies & Guidelines]] and [[Plugin Submission Requirements]] to ensure long-term compatibility.
