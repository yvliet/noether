# Version History

Travel back in time to inspect earlier drafts, compare changes with clean visual diffs, and safely restore previous versions of your notes.

## 1. Overview & Peace of Mind

---

Writing is an iterative journey. As you refine essays, update documentation, and brainstorm ideas, you often want to revisit an earlier draft or recover an idea you removed earlier.

The **Version History** extension turns your notes into a personal time machine. Every time you write, Noether automatically captures lightweight revision checkpoints directly on your computer using standard Git.

- **Zero Cloud Lock-In**: Revisions live directly inside your vault in standard Git format. There are no proprietary databases, no remote server dependencies, and zero monthly subscriptions.
- **Effortless Privacy**: Your drafts never leave your device unless you choose to back them up.
- **Instant Side-by-Side Comparison**: Review added and removed lines with clean, syntax-tinted visual diffs.
- **Safe 1-Click Restoration**: Revert to any historical version with complete confidence. Noether captures a safety checkpoint before restoring so you never lose your current writing.

## 2. How Local History Works

---

Under the hood, Version History utilizes standard Git repositories initialized directly inside your active vault.

- **Local Git Repository**: When you click **Enable History**, Noether runs `git init` within your vault directory and provisions an automatic `.gitignore` file to ignore `.trash/` and temporary workspace caches.
- **Automated Snapshots**: As you write, Noether monitors your writing pauses. A few seconds after you stop typing following a save, a lightweight revision snapshot is recorded.
- **Non-Technical Experience**: You do not need to memorize Git commands or terminal syntax. The extension handles staging, commits, and diffing behind the scenes through a clean, intuitive interface.

## 3. Viewing Diffs & Restoring Drafts

---

### Opening the Version History Timeline
1. Open any note in your vault.
2. Click the **History** clock icon in the right sidebar, or press `Ctrl+Shift+H`.
3. Browse the chronological list of drafts. Each entry displays a human-readable timestamp (`"Just now"`, `"10m ago"`, `"Yesterday, 3:15 PM"`), a clean non-monospace commit hash, and a dimmed draft count.

### Inspecting Changes
1. Click on any draft in the timeline list to open the detail view.
2. Switch between **Diff** and **Draft** view using the top toggle:
   - **Diff View**: Highlights additions in green and deletions in red.
   - **Draft View**: Displays the complete markdown text as it existed at that exact moment.
3. Click the **Copy** button to copy the historical text directly to your clipboard.

### Restoring an Earlier Draft
1. Inside the revision detail view, click **Restore draft**.
2. Noether creates a safety checkpoint of your active note first, then replaces the active document buffer with the historical draft and saves it.
3. Your note updates instantly without needing to restart or reload.

## 4. Synergy with Cloud & Community Sync

---

Version History pairs naturally with synchronization extensions, including the built-in Cloud Sync engine and community remote sync tools.

- **Collision Protection**: If an unexpected remote conflict occurs or a note is accidentally overwritten during synchronization, Version History ensures every local revision is preserved.
- **Remote Git Compatibility**: If you use community Git tools to sync your vault to GitHub, GitLab, or a self-hosted server, Version History works right inside the same Git repository without collisions.
- **Offline Confidence**: Work completely offline on airplanes or remote locations. Your version timeline continues recording snapshots locally, ready whenever you return online.

## 5. Keyboard Shortcuts & Settings

---

### Commands & Hotkeys

| Action | Shortcut / Access | Description |
| :--- | :--- | :--- |
| **Open Note History** | `Ctrl+Shift+H` | Opens the right sidebar and activates the Version History tab. |
| **Take Snapshot Now** | Command Palette (`Ctrl+K`) | Captures an immediate revision snapshot of the current note. |
| **Enable in Vault** | Command Palette (`Ctrl+K`) | Initializes local Git tracking inside the active vault root. |

### Settings & Customization
Navigate to **Settings** (`Ctrl+,`) → **Version History** to configure preferences:
- **Automatic Snapshots**: Toggle automatic checkpoint creation on or off.
- **Snapshot Idle Delay**: Fine-tune the typing pause duration (1 to 30 seconds) using the settings slider (default: 5 seconds).
- **Timeline History Limit**: Set the maximum number of historical drafts to display (default: 50).
