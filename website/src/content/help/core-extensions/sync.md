# Sync

Sync synchronizes your notes and settings seamlessly across multiple computers and devices using cloud database providers.

## 1. Overview
---

Noether gives you complete freedom over where your sync data lives. Instead of a locked-in proprietary server, you can connect your vault to free cloud databases like **Supabase**, **Turso (LibSQL)**, **Cloudflare D1**, or your own custom REST server.

## 2. Set Up Cloud Sync
---

1. Open **Settings (`Ctrl+,`) → Sync**.
2. Turn on **Enable Sync**.
3. Select your preferred provider:
   - **Turso / LibSQL**: Recommended for speed, edge distribution, and generous free tier.
   - **Supabase**: PostgreSQL backend with automated realtime updates.
   - **Cloudflare D1**: Serverless SQLite distributed at edge locations worldwide.
   - **Custom REST Endpoint**: Self-host your own sync backend.
4. Paste your database credentials (URL and authentication token).
5. Click **Test Connection** followed by **Initialize Sync Vault**.

## 3. Conflict Resolution & Offline Support
---

- **Local-First Ground Truth**: Noether writes changes locally to your disk first, then syncs upstream in the background.
- **Offline Mode**: When offline, edits queue locally and upload automatically the moment you reconnect.
- **Conflict Handling**: If the same note is edited simultaneously on two offline devices, Noether merges changes safely and saves conflicting revisions in your Version History.

## 4. End-to-End Encryption (E2EE)
---

You can optionally protect your synced notes with client-side AES-256-GCM encryption:

1. Under **Sync Settings**, enable **End-to-End Encryption**.
2. Enter a master passphrase.
3. Your notes are encrypted locally before uploading, ensuring even your database provider cannot read your plain text.

## 5. Keyboard Shortcuts & Commands
---

| Command | Action |
| :--- | :--- |
| `Command Palette → Sync: Force sync now` | Trigger immediate bi-directional sync |
| `Command Palette → Sync: View sync log` | Inspect live sync transfer events |

> [!IMPORTANT]
> If you enable End-to-End Encryption, keep your passphrase in a secure password manager. Noether cannot recover a forgotten sync passphrase.
