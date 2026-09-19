# Version History

Track local snapshots of your notes as you edit, inspect visual diffs, and recover deleted paragraphs or restore earlier drafts.

## 1. How Local Snapshots Work
---

Version History uses an embedded Git repository stored entirely on your computer inside `.noether/history/`. It never uploads your drafts to external servers or requires a Git account.

- **Automatic Checkpoints**: Whenever you edit a note and pause typing, Noether saves a lightweight revision snapshot.
- **Viewing History**: Press `Ctrl+Shift+H` (or select **Version history** from the `...` menu in the editor header) to open the history panel.
- **Diff Inspection**: Each entry shows when it was saved (`"5m ago"`, `"Yesterday, 4:10 PM"`). Click any revision to view additions in green and deletions in red.

## 2. Restoring & Selective Copying
---

You don't always want to roll back an entire document just to get one deleted paragraph back.

- **Restore Draft**: Overwrites the active editor buffer with the chosen revision snapshot. Noether automatically takes a quick safety snapshot of your current text before reverting.
- **Selective Copying**: Highlight and copy specific sentences or code blocks directly from the diff view and paste them into your current note.
- **Inline vs Split Diff**: Toggle between unified inline view or split side-by-side panes depending on how wide your window is.

## 3. Storage & Cleanup
---

All history files live inside `.noether/history/` within your vault. If you use external Git or cloud sync tools, `.noether/` is ignored by default so revision snapshots remain purely local to that machine.

In **Settings (`Ctrl+,`) → Version History**, you can adjust how frequently snapshots trigger (default: 5 minutes of active writing) and set retention limits (e.g. automatically purge revisions older than 30 days to save disk space).

