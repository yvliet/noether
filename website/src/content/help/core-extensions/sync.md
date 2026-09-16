# Sync

Sync synchronizes your notes and settings seamlessly across multiple computers and devices using cloud database providers.

## 1. Overview
---

Noether gives you complete freedom over where your sync data lives. Instead of a locked-in proprietary server, you can connect your vault to free cloud databases like **Turso (LibSQL)**, **Supabase**, **Cloudflare D1**, or your own custom REST server.

## 2. Set Up Cloud Sync
---

Open **Settings (`Ctrl+,`) → Sync**, enable **Sync**, and choose your provider below:

<details open>
<summary><b>Turso / LibSQL (Recommended)</b></summary>

Turso provides distributed SQLite at edge locations worldwide with a generous free tier.

### Setup Instructions

1. Install the Turso CLI or log in to [turso.tech](https://turso.tech).
2. Create a database for Noether:
   ```bash
   turso db create noether-vault
   ```
3. Generate an authentication token:
   ```bash
   turso db tokens create noether-vault
   ```
4. Copy your database URL (`libsql://noether-vault-[org].turso.io`) and auth token into Noether's Sync settings.
5. Click **Test Connection** followed by **Initialize Sync Vault**.

</details>

<details>
<summary><b>Supabase Setup</b></summary>

Supabase provides a managed PostgreSQL database with automated realtime updates.

### Setup Instructions

1. Create a free project at [supabase.com](https://supabase.com).
2. Copy your Project URL (`https://[project-id].supabase.co`) and `anon public` API key from **Project Settings → API**.
3. Paste both into Noether's Sync settings.
4. Click **Initialize Sync Vault**. Noether automatically provisions the required sync tables.

</details>

<details>
<summary><b>Cloudflare D1 Setup</b></summary>

Cloudflare D1 runs serverless SQLite at Cloudflare's global edge network.

### Setup Instructions

1. Log in to your Cloudflare Dashboard and navigate to **Workers & Pages → D1 SQL Database**.
2. Create a new database named `noether-sync`.
3. Create an API token with D1 write permissions under **My Profile → API Tokens**.
4. Enter your Account ID, Database ID, and API Token in Noether's Sync settings.
5. Click **Initialize Sync Vault**.

</details>

<details>
<summary><b>Custom REST Backend (Self-Hosted)</b></summary>

You can point Noether at any custom HTTP server that implements the standard sync endpoint contract.

### Setup Instructions

1. Host your custom REST sync server.
2. Enter your server's base URL (e.g. `https://sync.my-domain.com/api/v1`) and Bearer token in Noether Sync settings.
3. Click **Test Connection**.

</details>

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
