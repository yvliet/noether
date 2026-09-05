# Plugin Submission Requirements

These guidelines define the standards that extensions must meet to ensure security, reliability, and code quality across the Flint ecosystem.


## 1. Manifest Requirements

---

- `id`: Lowercase alphanumeric string with hyphens. Must be unique.
- `name`: Human-readable display title.
- `version`: Valid Semantic Versioning string (e.g. `1.0.0`).
- `minAppVersion`: Specifies the lowest compatible Flint version.
- `description`: Clear, concise summary of capabilities.
- `author`: Developer or team name.

See [[Manifest Specification]] for the complete schema.


## 2. Code Quality & Bundling

---

- **Single Bundle**: Extensions must compile into a self-contained `main.js` bundle (CommonJS or ESM).
- **No Unused Boilerplate**: Remove sample counter buttons, debug logs, and unused boilerplate code before publishing.
- **Strict Native Core Isolation**: Plugins must never import native core paths. Only import from the public `flint` SDK module. Read [[Micro-Kernel & Extension Architecture]].
- **Proper Command IDs**: Do not include your plugin ID in the `id` field passed to `this.addCommand()`; Flint prefixes it automatically.


## 3. Financial Support & Links

---

If you accept donations or patronage for your open-source work:
- You may include a `fundingUrl` in your `manifest.json` linking to services like GitHub Sponsors, Buy Me a Coffee, or Patreon.
- Extensions must not display unsolicited intrusive popups requesting donations.

For questions, open a discussion in the [Flint GitHub Discussions](https://github.com/yvliet/flint/discussions).
