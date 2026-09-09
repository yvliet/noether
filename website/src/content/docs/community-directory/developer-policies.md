# Developer Policies & Guidelines

Flint is committed to providing a secure, private, and distraction-free knowledge environment. All extensions must adhere to these policies.


## 1. Zero Telemetry & User Privacy

---

- **No Unauthorized Tracking**: Extensions must never transmit telemetry, user keystrokes, document contents, note metadata, or IP addresses to third-party servers without explicit, informed user consent.
- **Local-First by Default**: If an extension integrates with an external cloud service (such as an LLM provider or cloud backup), all API keys must be entered by the user (Bring Your Own Key) and stored locally.


## 2. Responsive Native Performance

---

- **Instant Desktop UI**: Flint is built to feel like a classic, responsive desktop utility. Avoid adding artificial animation delays or slow CSS fade transitions to buttons, toggles, or menus (see [[Flint UI Components]]).
- **Non-Blocking Main Thread**: Heavy operations (text embeddings, graph physics, large PDF parsing) must be offloaded to Web Workers via `app.workerPool` or debounced. The editor input latency must remain under 8ms.
- **Fast Activation**: Extensions must activate in less than 50ms. Dynamic imports should be used for heavy submodules. Read [[Optimizing Extension Load Time]].


## 3. Sandboxing & Cross-Platform Neutrality

---

- **Cross-Platform Safety**: Avoid invoking desktop-only platform APIs directly inside view components. Use the Flint SDK's cross-platform bridges so extensions remain functional across macOS, Windows, and Linux.
- **Clean Uninstallation**: When uninstalled, extensions must drop any custom SQLite tables they created and leave no lingering artifacts.


## 4. Model Context Protocol (MCP) Standards

---

- Extensions that manage structured data should expose MCP tools for AI copilot interaction (see [[Model Context Protocol (MCP) Tools]]).
- Destructive operations (permanent note deletions, mass modifications) must declare `isDestructive: true` to require explicit user confirmation.
