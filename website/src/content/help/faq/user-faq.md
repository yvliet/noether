# Frequently Asked Questions

Answers to the most common questions about using Noether, local file safety, privacy, and synchronization.

## 1. Where are my notes actually stored?
---

Your notes live in whatever folder you selected as your Vault root (for example, `C:\Users\You\Documents\My-Vault` or `/home/you/notes`). Every note is a standard, plain-text `.md` Markdown file.

Noether creates a small hidden directory called `.noether/` inside that folder to store local settings and a high-speed SQLite database (`noether.sqlite`). This database is strictly a local search index and relational cache; your actual Markdown files on disk remain the ground truth.

## 2. Can I open or edit my notes in other apps?
---

**Yes, completely.** Because your notes are standard CommonMark files, you can open, edit, or grep them in VS Code, Obsidian, Vim, Sublime Text, Notepad, or any terminal tool at any time.

Noether features an intelligent file watcher with internal write tracking: when you edit a file externally, Noether detects the change and updates the editor buffer without clobbering your work.

## 3. How do I sync my notes across multiple devices?
---

Because your Vault is just a regular folder on your computer, you have total freedom in how you sync it:

- **Git**: Initialize a Git repository in your Vault root. Push and pull to GitHub or your private Git server.
- **Syncthing**: Free, open-source, encrypted device-to-device synchronization with zero third-party cloud servers.
- **iCloud Drive / Dropbox / OneDrive**: Place your Vault folder inside your cloud sync directory.
- **Noether Sync Extension**: Connect your Vault directly to free cloud databases like Supabase, Turso, or Cloudflare D1.

## 4. Does Noether collect any telemetry or tracking?
---

**No.** Noether collects zero telemetry, zero analytics, zero keystroke logs, and zero tracking data. There are no mandatory user accounts and no background network calls to third-party tracking services.

When you run Noether, it runs entirely on your local machine. The only network calls that occur are explicit user actions, such as checking for application updates or downloading an extension from the Community Registry.

## 5. What happens if I accidentally delete a note?
---

Noether includes a safe soft-delete mechanism. Deleting a note moves it into a hidden `.trash/` directory inside your Vault root rather than wiping it permanently from your disk. You can recover deleted notes at any time by inspecting the `.trash/` folder.

## 6. How do I request an Obsidian plugin to be ported to Noether?
---

Noether's extension catalog is young, and I am actively rewriting popular Obsidian plugins as native Noether community extensions.

If there is an Obsidian plugin you depend on that isn't available yet in Noether, reach out to me directly on Discord: **[@yvliet](https://discord.com/users/1271415962909933680)**. You don't need to know how to code; just share the plugin name and how you use it, and I'll see if I can port it for you.

## 7. Will there be a mobile app for Noether?
---

**Yes, an Android version is planned after the desktop reaches 1.0.0.**

Believe me, having quick access to notes on the go is something I want just as much as anyone else. But spreading development too thin before the core desktop experience is mature almost always leads to two half-baked apps. The immediate focus is getting the desktop build fast, stable, and completely polished first.

Once desktop reaches `v1.0.0`, an Android build will follow. iOS is not planned in the near term because Apple's restrictive filesystem sandboxing makes local-first folder access a headache without proprietary cloud servers, alongside annual App Store developer fees.

In the meantime, you can sync your Vault folder to your phone via Syncthing or Git and read or edit notes using any standard markdown editor.
