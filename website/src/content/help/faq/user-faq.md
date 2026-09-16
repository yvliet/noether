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
<summary><b>What happens if I accidentally delete a note or folder?</b></summary>

Noether includes a safe soft-delete mechanism. Deleting a note moves it into a hidden `.trash/` directory inside your vault root rather than wiping it permanently from your disk. You can recover deleted notes at any time in **Settings (`Ctrl+,`) → Trash**.

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
