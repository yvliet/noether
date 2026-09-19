# Tags

Categorize and filter notes using `#tags` and nested hierarchies in the sidebar.

## 1. Using Tags in Notes
---

Write `#tags` anywhere in your note text or add them to the `tags` property in frontmatter:

- Inline: `#project`, `#research/physics`, `#reading/2026`
- Frontmatter: `tags: [physics, notes]`

Use slashes (`/`) to create nested tag hierarchies (e.g. `#work/client-a`, `#work/client-b`). The Tags pane automatically groups these into collapsible branches.

## 2. Browsing & Filtering
---

Press `Ctrl+Shift+T` or click the tag icon in the right sidebar rail:

- Click any tag to search for notes containing it.
- Hold `Ctrl` and click multiple tags to filter by `AND` (e.g. notes that have both `#work` and `#urgent`).
- Tag searches are indexed in the local SQLite database so filtering is fast even in large vaults.

