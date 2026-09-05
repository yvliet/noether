# Setting Up & Claiming Extensions

This guide describes how extension namespaces, IDs, and publisher identities are handled in Flint.


## 1. Extension Identifiers (`id`)

---

Every Flint extension is uniquely identified by the `id` property in its `manifest.json`.

```json
{
  "id": "pomodoro-timer",
  "name": "Pomodoro Focus Timer",
  "version": "1.0.0"
}
```

### Identifier Invariants

- **Characters**: Lowercase letters (`a-z`), numbers (`0-9`), and single hyphens (`-`).
- **No Namespace Collisions**: The identifier should be descriptive and avoid generic collisions (e.g., prefer `reading-stats` or `org-reading-stats` over `stats`).
- **Command & Tool Scoping**: Flint automatically prefixes all commands (`pomodoro-timer:start`) and MCP tools (`pomodoro-timer_start`) with this `id` to prevent conflicts between extensions.


## 2. Claiming Ownership on GitHub

---

Currently, extension development and ownership are tracked via public GitHub repositories:

1. Host your extension code in a public GitHub repository.
2. Maintain your `manifest.json` at the root of the repository.
3. Ensure the `author` and `authorUrl` fields in `manifest.json` link directly to your GitHub profile or organization.
4. When the upcoming community directory registry opens, publisher accounts will authenticate directly via GitHub OAuth to bind repository ownership to your published extension identifier.


## 3. Related Reading

---

- Review the required manifest format in [[Manifest Specification]].
- Ensure your extension satisfies [[Plugin Submission Requirements]].
- Check my core principles in [[Developer Policies & Guidelines]].
