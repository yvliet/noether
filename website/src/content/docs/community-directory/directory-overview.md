# Community Directory Overview

The Flint Community Directory connects creators with users who want to extend their personal knowledge workspace with custom extensions, visualizations, and AI tools.


## 1. Dynamic Turso Registry & Architecture

---

Flint isolates all third-party community extensions from the native desktop binary. Community extensions are never baked into the native host distribution; instead, they are indexed and served on-demand from an edge-replicated Turso libSQL database:

- **Turso Edge Registry**: Extension metadata, SemVer release histories, Markdown readmes, and compiled JavaScript bundles are stored directly inside libSQL edge database tables (`authors`, `plugins`, `plugin_versions`).
- **Dynamic In-App Discovery**: The Flint Marketplace queries the Turso registry over REST / libSQL HTTP endpoints with Stale-While-Revalidate (SWR) caching for instant 0ms initial render latency.
- **One-Click Installation**: Installing an extension fetches the compiled `main.js` bundle and `manifest.json` from Turso, writes them into `<hearth>/.flint/extensions/<id>/` on disk, and executes them inside the runtime sandbox.
- **Strict Native Core Isolation**: True core extensions (`isCore: true`) provide fundamental host capabilities, while all community extensions remain modular, hot-swappable, and independently updatable.


## 2. Local-First Extension Storage

---

Flint remains fundamentally local-first. Once installed from the Turso registry (or cloned manually for local development):

- **Local Discovery**: Installed extensions reside within your active workspace at `<hearth>/.flint/extensions/<id>/`.
- **Zero Network Required After Download**: Extensions execute completely offline inside the local sandbox without making telemetry or licensing calls.
- **Seamless Portability**: Moving your Hearth folder to another machine or backing it up automatically carries your installed extensions and settings with it.

```
My-Hearth/
└── .flint/
    └── extensions/
        ├── flint-cascade/
        │   ├── manifest.json
        │   └── main.js
        └── word-counter/
            ├── manifest.json
            ├── main.js
            └── styles.css
```


## 3. Getting Involved & Developing Extensions

---

- To build your first extension, follow [[Plugin Quick Start]].
- To style custom themes, follow [[Build Your First Theme]].
- To publish your extension to the Turso registry, follow [[Publishing Extensions & Marketplace Roadmap]].
- Review privacy and performance standards in [[Developer Policies & Guidelines]].
- Share your extensions and discuss new APIs with me and fellow developers on [GitHub Discussions](https://github.com/yvliet/flint/discussions).
