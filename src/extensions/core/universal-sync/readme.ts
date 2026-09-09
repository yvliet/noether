/**
 * @module universalSyncReadme
 * @description
 * Documentation for the Universal External Sync core extension.
 */

export const universalSyncReadme = `# Universal External Sync

Bidirectional, multi-provider cloud synchronization engine for Flint notes and metadata.

## 1. Overview
---
Universal External Sync connects your local Flint workspace to external cloud databases, allowing you to synchronize notes across desktop and mobile devices while retaining local-first Markdown files.

Supported storage backends:
- **Supabase**: Free-tier PostgreSQL cloud database with zero subscription costs.
- **Turso**: Serverless LibSQL database with global edge replication.
- **Cloudflare D1**: Serverless SQLite database running on Cloudflare Workers.
- **Custom REST API**: Connect to any custom or self-hosted sync backend.

## 2. Key Capabilities
---
- **Incremental Delta Sync**: Only notes modified since the last sync timestamp are transmitted over the wire.
- **Tombstone Tracking**: Note deletions on one device propagate cleanly to other devices without resurrecting old notes.
- **Auto-Sync on Save**: Automatically debounces synchronization 2.5 seconds after note edits or additions.
- **Configurable Conflict Resolution**: Choose between Last Write Wins, Remote Cloud Wins, Local Device Wins, or Keep Both (conflict duplicates).
- **Status Bar Integration**: Direct visual indicator in the status bar showing current sync health, progress, and error alerts.
- **Native MCP Tools**: Exposes AI tool actions to trigger sync, verify connection, and inspect sync telemetry.

## 3. Getting Started
---
1. Open Flint Settings → **Universal Sync**.
2. Select your storage backend (e.g. Supabase).
3. Follow the guided setup wizard to run the SQL schema initialization and paste your database credentials.
4. Click **Verify Connection** and trigger **Sync Now**.
`;
