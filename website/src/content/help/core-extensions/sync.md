# Sync

Sync notes and settings across multiple computers using your own cloud database backend.

## 1. How Sync Works
---

Noether doesn't force you into a proprietary cloud subscription. Instead, you connect your vault directly to a database you control, such as **Turso (LibSQL)**, **Cloudflare D1**, **Supabase**, or a self-hosted REST server.

Edits are always written to your local disk first. When you are connected, Noether pushes changes upstream in the background. If you edit offline, changes queue locally and sync automatically when you reconnect.

If two devices edit the same note while offline, Noether flags the conflict, preserves both revisions, and logs the collision in [[Version History]] so nothing gets overwritten.

## 2. Connecting a Database
---

Open **Settings (`Ctrl+,`) → Sync**, toggle **Sync** on, and pick your backend:

<details open>
<summary><b>Turso / LibSQL (Recommended)</b></summary>

Turso runs SQLite at edge locations and works well with Noether's data model.

1. Install the Turso CLI or create an account at [turso.tech](https://turso.tech).
2. Create a database:
   ```bash
   turso db create noether-vault
   ```
3. Generate an authentication token:
   ```bash
   turso db tokens create noether-vault
   ```
4. Copy your database URL (`libsql://noether-vault-[org].turso.io`) and auth token into Noether's Sync settings.
5. Click **Test Connection**, then **Initialize Sync Vault**.

</details>

<details>
<summary><b>Cloudflare D1</b></summary>

[Cloudflare D1](https://developers.cloudflare.com/d1/) runs serverless SQLite on Cloudflare's global edge network.

1. In the Cloudflare Dashboard, go to **Workers & Pages → D1 SQL Database** and create `noether-sync`.
2. Generate an API token with D1 write permissions under **My Profile → API Tokens**.
3. Enter your Account ID, Database ID, and API Token in Noether's Sync settings.
4. Click **Initialize Sync Vault**.

</details>

<details>
<summary><b>Supabase</b></summary>

1. Create a project at [supabase.com](https://supabase.com).
2. Copy your Project URL and `anon public` API key from **Project Settings → API**.
3. Paste both into Noether's Sync settings and click **Initialize Sync Vault**. Noether creates the required tables automatically.

</details>

<details>
<summary><b>Custom Self-Hosted REST</b></summary>

If you run your own sync service:
1. Enter your server base URL (e.g. `https://sync.example.com/api/v1`) and Bearer token in Sync settings.
2. Click **Test Connection**.

</details>

## 3. End-to-End Encryption (E2EE)
---

You can encrypt your notes before they leave your computer using AES-256-GCM:

1. In **Sync Settings**, turn on **End-to-End Encryption**.
2. Enter a master passphrase.
3. All note text and frontmatter are encrypted locally before uploading.

> [!WARNING]
> Save your encryption passphrase in a password manager. Noether has zero access to your passphrase and cannot recover encrypted notes if you lose it.

