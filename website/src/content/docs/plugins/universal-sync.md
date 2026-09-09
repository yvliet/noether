# Universal External Sync (`universal-sync`)

Synchronize your Flint notes, knowledge graph, and canvases across desktop and mobile machines using your own free cloud database, with zero user tracking and zero recurring subscriptions.

---

## 1. Why Universal External Sync?

---

Most proprietary note-taking tools charge monthly recurring subscriptions for cloud synchronization. Because Flint is built on a local-first architecture with plain Markdown files and local SQLite indexes, your notes belong to you.

The Universal External Sync extension connects your local Hearth to your own free cloud database:
- **Supabase Free Tier (Recommended)**: 500 MB permanent PostgreSQL database with instant PostgREST HTTP APIs and zero credit card requirements.
- **Turso libSQL**: Edge SQLite databases running over the Hrana v2 HTTP pipeline.
- **Cloudflare D1**: Serverless SQL databases running on Cloudflare Workers edge nodes.
- **Self-Hosted REST**: Generic JSON sync server or private webhook.

---

## 2. Quick Start: Supabase Free Tier (2-Minute Setup)

---

Supabase provides 500 MB of permanent free PostgreSQL storage, which is enough to store over 50,000 markdown notes and metadata records without ever paying a fee.

### Step 1: Create a Free Supabase Project
1. Navigate to [supabase.com](https://supabase.com) and click **New Project**.
2. Select your nearest geographic region and set any secure database password.
3. Click **Create new project**.

### Step 2: Run the 1-Click Table Schema
1. In the Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**, paste the following SQL block, and click **Run**:

```sql
-- 1. Create the Flint Sync Documents table
CREATE TABLE IF NOT EXISTS flint_sync_documents (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content_json TEXT NOT NULL DEFAULT '',
  is_daily_note INTEGER NOT NULL DEFAULT 0,
  is_folder INTEGER NOT NULL DEFAULT 0,
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  doc_type TEXT NOT NULL DEFAULT 'base',
  properties TEXT NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT DEFAULT NULL,
  device_id TEXT
);

-- 2. Create performance indexes for rapid delta queries
CREATE INDEX IF NOT EXISTS idx_flint_sync_updated ON flint_sync_documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_flint_sync_deleted ON flint_sync_documents(deleted_at);

-- 3. Enable Row Level Security (RLS) and permit CRUD access for your API key
ALTER TABLE flint_sync_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Flint Sync CRUD" ON flint_sync_documents;
CREATE POLICY "Allow Flint Sync CRUD" ON flint_sync_documents
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Step 3: Connect Flint
1. In your Supabase project, go to **Project Settings → API**.
2. Copy your **Project URL** (for example: `https://abcdefghijkl.supabase.co`).
3. Copy your **anon public API key** (`eyJhbGci...`).
4. In Flint, open **Settings → Universal Sync**.
5. Paste the Project URL and Anon Key into the guided wizard.
6. Click **Test Connection** to verify database connectivity, then click **Sync Now**.

---

## 3. Alternative Database Providers

---

| Provider | Transport Protocol | Ideal Use Case |
| :--- | :--- | :--- |
| **Supabase** | PostgREST HTTP REST (`/rest/v1/flint_sync_documents`) | Zero-cost permanent free tier with 500 MB storage |
| **Turso libSQL** | Hrana v2 HTTP Pipeline (`/v2/pipeline`) | Sub-10ms global distributed edge SQLite replicas |
| **Cloudflare D1** | Cloudflare v4 REST API (`/d1/database/.../query`) | Serverless edge SQL integrated with Cloudflare accounts |
| **Custom REST** | Standard JSON REST (`/pull`, `/push`, `/health`) | Private VPS, self-hosted Docker container, or internal proxy |

### Setting Up Turso
1. Create a database using the Turso CLI:
   ```bash
   turso db create flint-sync
   ```
2. Open the SQL shell and run the schema:
   ```bash
   turso db shell flint-sync
   ```
   ```sql
   CREATE TABLE IF NOT EXISTS flint_sync_documents (
     id TEXT PRIMARY KEY,
     parent_id TEXT,
     title TEXT NOT NULL DEFAULT 'Untitled',
     content_json TEXT NOT NULL DEFAULT '',
     is_daily_note INTEGER NOT NULL DEFAULT 0,
     is_folder INTEGER NOT NULL DEFAULT 0,
     is_bookmarked INTEGER NOT NULL DEFAULT 0,
     doc_type TEXT NOT NULL DEFAULT 'base',
     properties TEXT NOT NULL DEFAULT '{}',
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     deleted_at INTEGER DEFAULT NULL,
     device_id TEXT
   );
   CREATE INDEX IF NOT EXISTS idx_flint_sync_updated ON flint_sync_documents(updated_at);
   CREATE INDEX IF NOT EXISTS idx_flint_sync_deleted ON flint_sync_documents(deleted_at);
   ```
3. Generate a database token:
   ```bash
   turso db tokens create flint-sync
   ```
4. Enter the database URL (`libsql://...`) and auth token in Flint Settings.

---

## 4. Conflict Resolution & Sync Mechanics

---

- **Debounced Auto-Sync**: When you edit notes, changes are debounced by 2.5 seconds before uploading to ensure fluid 60 FPS typing with zero UI interruptions.
- **Tombstone Deletion Propagation**: When you delete a note, a tombstone record is created with a `deleted_at` timestamp. This propagates to all other devices, ensuring deleted notes never resurrect on future sync cycles. Old tombstones are pruned automatically after 30 days.
- **Conflict Strategies**:
  - `Newer Timestamp (Last Write Wins)`: Automatically keeps whichever version has the latest timestamp.
  - `Keep Both (Create Conflict Copy)`: Creates a duplicate note titled `[Conflict Copy] Note Title` so no edits are ever lost.
  - `Local Always Wins`: Retains local changes and ignores conflicting remote changes.
  - `Remote Always Wins`: Overwrites local modifications with incoming remote changes.

---

## 5. Keyboard Shortcuts & MCP Tools

---

### Command Palette Shortcuts
- `Ctrl+Shift+S`: Triggers an immediate bidirectional sync cycle.
- `Universal Sync: Test Database Connection`: Validates reachability and table status.
- `Universal Sync: Open Sync Settings & Setup Wizard`: Opens the configuration pane.

### Model Context Protocol (MCP) AI Tools
The extension exposes the following tools to in-app AI copilots and external desktop agents:
- `universal-sync_sync_now`: Triggers an immediate sync cycle and returns telemetry.
- `universal-sync_get_sync_status`: Inspects telemetry, database status, and pending change counts.
- `universal-sync_test_connection`: Verifies database reachability and table readiness.

---

## 6. Related Reading & References

---

- [[Extension Points Reference]]: Learn how the status bar and commands are registered.
- [[Events & Relational Storage]]: How Flint coordinates local SQLite storage with EventBus events.
- [[Model Context Protocol (MCP) Tools]]: How AI copilots interact with extension tools.
