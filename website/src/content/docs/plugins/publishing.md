# Publishing Extensions & Marketplace Registry

Share your creations with the Flint community. This guide walks you through preparing, packaging, and publishing your extensions to the Turso-backed Community Marketplace registry.


## 1. Turso libSQL Registry Architecture

---

The Flint Community Registry is powered by a serverless Turso / libSQL edge database. When you publish an extension:

- **Edge Metadata & Release Indexing**: Author profiles, plugin manifests, tags, and SemVer version histories are indexed across global edge replicas.
- **Direct Bundle Distribution**: Your compiled JavaScript `main.js` and optional `styles.css` bundles are stored directly in the database or served via high-speed CDN URLs.
- **Instant In-App Installation**: Flint users can browse, search, and install your extension with a single click in the Marketplace view without manually copying files or restarting the app.


## 2. Release Preparation Checklist

---

Before publishing your extension, verify that your package satisfies the following standards:

- [ ] **Valid `manifest.json`**:
  - `id`: Unique, lowercase kebab-case (e.g., `markdown-mindmap`).
  - `name`: Clean, descriptive display title.
  - `version`: Strict Semantic Versioning string (e.g., `1.0.0`).
  - `description`: Crisp summary (40-160 characters).
  - `author`: Your name or organization.
  - `category`: One of `Productivity`, `Visualization`, `Integration`, `Formatting`.
  - `tags`: Relevant keywords (e.g., `["mindmap", "graph", "diagram"]`).
- [ ] **Compiled `main.js`**:
  - Bundled as CommonJS (`cjs`) targeting modern browser/desktop environments (`es2022`).
  - Core dependencies (`flint`, `@flint/api`, `react`, `react-dom`, `zod`) must be marked as **external** so duplicate runtimes are not bundled.
- [ ] **Optional `styles.css`**: Scoped styles prefixed with your extension identifier to avoid polluting host styling (see [[CSS Variables & Design Tokens]]).
- [ ] **`README.md`**: Clear documentation detailing features, keyboard shortcuts, and registered [[Model Context Protocol (MCP) Tools]].
- [ ] **Desktop Responsiveness**: Verified that UI elements respond instantly with zero artificial animation delays (see [[Flint UI Components]]).


## 3. Publishing to the Turso Registry

---

You can publish new extensions or version updates via the Registry REST API:

### Publishing Endpoint

```http
POST /api/v1/plugins/publish
Content-Type: application/json
```

### Request Payload

```json
{
  "manifest": {
    "id": "markdown-mindmap",
    "name": "Markdown Mindmap",
    "version": "1.0.0",
    "description": "Generate dynamic visual mindmaps from nested markdown lists and headers.",
    "category": "Visualization",
    "tags": ["mindmap", "visualization", "diagram"],
    "minAppVersion": "0.4.0"
  },
  "bundleCode": "/* Compiled JavaScript bundle */",
  "stylesCode": "/* Optional CSS styles */",
  "readme": "# Markdown Mindmap\n\nTransforms markdown lists into interactive node trees.",
  "author": {
    "githubUsername": "yourname",
    "displayName": "Your Name",
    "avatarUrl": "https://avatars.githubusercontent.com/u/1234567"
  }
}
```

### Automated GitHub Actions Publishing

You can automate publishing on GitHub release creation using a simple workflow that compiles your extension with `esbuild` and sends a `POST` request to the registry endpoint.


## 4. Local Testing Before Publication

---

To test your extension locally before publishing:

1. Build your production bundle:
   ```bash
   npm run build
   ```
2. Copy your folder containing `manifest.json` and `main.js` into `<your-hearth>/.flint/extensions/<your-extension-id>/`.
3. Open Flint, navigate to **Settings > Extensions**, and enable your extension to test it live.
