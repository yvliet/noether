# Community Marketplace

Community Marketplace lets you discover, install, update, and manage community-built extensions and themes directly inside Noether.

## 1. Overview
---

The Marketplace connects to the decentralized Turso and GitHub extension registry. You can browse extensions, read their documentation, inspect permissions, and install them into your vault with one click.

## 2. Browse and Install Extensions
---

1. Open **Settings (`Ctrl+,`) → Community Extensions**.
2. Click **Browse Community Extensions**.
3. Use the search bar to filter by name, author, or tag (e.g. `calendar`, `git`, `formatter`).
4. Click on any extension card to view its README, screenshot gallery, version history, and required permissions.
5. Click **Install**. Once downloaded, click **Enable** to activate the extension immediately without restarting Noether.

## 3. Manage and Update Extensions
---

- **Update Check**: Noether checks for updates in the background. When an update is ready, an **Update** badge appears next to the extension.
- **Toggle Extension**: Enable or disable installed extensions on a per-vault basis.
- **Uninstall**: Click the trash icon next to any extension to remove its files from `.noether/extensions/`.

## 4. Install Community Themes
---

1. Open **Settings (`Ctrl+,`) → Appearance**.
2. Click **Browse Community Themes**.
3. Preview light and dark color palettes live before installing.
4. Click **Apply Theme** to switch the interface instantly.

## 5. Keyboard Shortcuts & Commands
---

| Command | Action |
| :--- | :--- |
| `Command Palette → Marketplace: Browse extensions` | Open community extension catalog |
| `Command Palette → Marketplace: Check for updates` | Check for latest extension versions |

> [!NOTE]
> Community extensions run locally inside a sandboxed JavaScript runtime and can never execute uncontained system commands.
