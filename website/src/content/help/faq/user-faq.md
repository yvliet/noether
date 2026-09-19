# Frequently Asked Questions

Find answers to common questions about using Noether, local file safety, privacy, and synchronization.

## 1. General & Storage Questions
---

<details open>
<summary><b>Where are my notes actually stored on my computer?</b></summary>

Your notes live in whichever folder you selected as your vault root (for example, `C:\Users\You\Documents\Notes` or `/home/you/notes`). Every note is a standard, plain-text `.md` Markdown file.

Noether creates a small hidden directory called `.noether/` inside that folder to store local settings and a high-speed SQLite database (`noether.sqlite`). This database is strictly a local search index and relational cache; your actual Markdown files on disk remain the ground truth.

</details>

<details open>
<summary><b>Can I open and edit my notes in other apps like VS Code or Obsidian?</b></summary>

**Yes, completely.** Because your notes are standard CommonMark files, you can open, edit, or grep them in VS Code, Obsidian, Vim, Sublime Text, Notepad, or any terminal tool at any time.

Noether includes an intelligent file watcher: when you edit a file externally, Noether detects the change and updates the editor buffer without overwriting your changes.

</details>

<details>
<summary><b>How do I restore accidentally deleted notes or empty the Trash?</b></summary>

When you delete a note or folder in Noether, it is moved to the `.trash/` directory inside your vault instead of being permanently erased:

1. Open **Settings (`Ctrl+,`) → Files & Links → Trash**.
2. Browse or search through soft-deleted notes.
3. Select a note to preview its markdown content.
4. Click **Restore** to reinstate the note to its original directory, or click **Empty Trash** to permanently purge all deleted items.

</details>

<details>
<summary><b>How do I lock a note so I don't accidentally edit or overwrite it?</b></summary>

You can set any note to read-only mode by opening the **Document Options menu (`...`)** in the top-right corner of the editor and selecting **Lock Note (Read-Only)**.

Alternatively, add `locked: true` to your YAML frontmatter properties. When locked, typing and text mutations are disabled, preserving reference notes and completed drafts.

</details>

<details>
<summary><b>How does in-note Find & Replace work?</b></summary>

Press `Ctrl+F` to open the in-editor Find bar, or `Ctrl+H` to open Find & Replace:

- If you select text before pressing `Ctrl+F`, it automatically fills the search box.
- Press `Enter` or `↓` to jump to the next match, and `Shift+Enter` or `↑` for the previous match.
- Toggle strict case sensitivity with the `Aa` button.
- Click **Replace** to substitute the active match, or **Replace All** to replace every occurrence across the document in one atomic step.

</details>

<details>
<summary><b>How do I customize typography, font sizes, and accent colors?</b></summary>

Open **Settings (`Ctrl+,`) → Appearance**:

- Choose your base color mode (Dark, Light, OLED Black, or System).
- Select from curated accent color palettes.
- Choose your preferred font families for **Interface Font**, **Text Font**, and **Monospace Font** using the system font picker.
- Adjust base font sizing, line height, and editor padding to fit your reading preferences.

</details>

<details>
<summary><b>How do I dock tabs and panels into sidebars?</b></summary>

Noether includes a **4-Zone Docking Engine** (`left-top`, `left-bottom`, `right-top`, `right-bottom`):

- Click and drag any tab from the workspace tab strip or secondary rail directly toward the top or bottom of either sidebar.
- Drop the tab when the dock zone highlights to pin the view into that quadrant.
- Drag the separator bar between top and bottom dock panes to resize vertical height distribution.

</details>

<details>
<summary><b>Can I zoom in on images and diagrams inside my notes?</b></summary>

**Yes.** Click any image in Live Preview or Reading View to open the full-screen **Image Lightbox**:

- Scroll your mouse wheel or pinch your trackpad to zoom up to 25x magnification centered at your cursor.
- Press `+` / `-` to zoom in or out, and `0` to reset to 1x centered fit.
- Click and drag or use keyboard arrow keys (`Shift + Arrows` for 100px steps) to pan across large architecture diagrams.
- Double-click to toggle between 1x fit and 2x magnification.

</details>

<details>
<summary><b>What happens if I move a file to a folder that already has a note with the same name?</b></summary>

Noether features a non-destructive **Duplicate Name Safeguard**. When dragging or moving a file into a destination folder that already contains an identical filename, Noether displays a confirmation dialog offering to automatically create a numbered copy (e.g. `Note (1).md`) rather than silently overwriting your work.

</details>

<details>
<summary><b>How do I sync my notes across multiple devices for free?</b></summary>

Because your vault is a regular folder on your computer, you have total freedom in how you sync it:

- **Noether Sync Extension**: Connect your vault directly to free cloud databases like Supabase, Turso, or Cloudflare D1 with optional end-to-end encryption.
- **Git**: Initialize a Git repository in your vault root. Push and pull to GitHub or your private Git server.
- **Syncthing**: Free, open-source, encrypted device-to-device synchronization with zero third-party cloud servers.
- **Cloud Drives**: Place your vault folder inside iCloud Drive, Dropbox, Google Drive, or OneDrive.

</details>

<details>
<summary><b>Does Noether collect any telemetry, analytics, or tracking?</b></summary>

**No.** Noether collects zero telemetry, zero analytics, zero keystroke logs, and zero tracking data. There are no mandatory user accounts and no background network calls to third-party tracking services.

When you run Noether, it runs entirely on your local machine. The only network calls that occur are explicit user actions, such as checking for application updates or downloading an extension from the Community Marketplace.

</details>

<details>
<summary><b>How do I request an extension or report an issue?</b></summary>

Noether's extension catalog is actively growing, and I am porting popular tools and plugins to native Noether community extensions.

If there is a specific workflow or plugin you depend on that is not yet available in Noether, reach out directly on Discord: **[@yvliet](https://discord.com/users/1271415962909933680)**. Share what features you rely on, and I will see if I can build a native Noether extension for you. You can also file bug reports and feature requests on [GitHub Issues](https://github.com/yvliet/Noether/issues).

</details>

<details>
<summary><b>What is the roadmap for Android and iOS mobile apps?</b></summary>

**An Android version is planned after the desktop reaches 1.0.0.**

The immediate focus is getting the desktop build fast, stable, and completely polished first. Once desktop reaches `1.0.0`, an Android build will follow.

In the meantime, you can sync your vault folder to your phone via Syncthing or Git and read or edit notes using any standard mobile markdown editor.

</details>

