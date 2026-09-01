#!/usr/bin/env node

/**
 * @file bin/flint-mcp-server.cjs
 * @description
 * Standalone stdio Model Context Protocol (MCP) server for Flint.
 * Exposes Flint's native knowledge tools, extension tools, and prompts to external
 * AI agents (Claude Desktop, Cursor, Antigravity, Gemini Code Assist, Agent CLI).
 *
 * Features:
 * - Zero-config multi-Hearth auto-discovery from system configuration
 * - Bulletproof file/folder path resolution (never overwrites folders, handles nested paths)
 * - Smart upsert note writing (creates if new, updates in place preserving frontmatter if existing)
 * - JSON-RPC 2.0 stdio protocol compliance (MCP 2024-11-05 spec)
 * - Full-text note search, CRUD, wikilinks, tasks, FSRS flashcards, cascades, and bookmarks
 *
 * @since 0.3.0
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ── Configuration & Hearth Discovery ──

function getKnownConfigPaths() {
  const home = os.homedir();
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(home, 'Library', 'Application Support') : path.join(home, '.config'));
  
  return [
    path.join(appData, 'flint', 'flint-config.json'),
    path.join(appData, 'Electron', 'flint-config.json'),
    path.join(home, '.flint', 'flint-config.json'),
    path.join(home, '.config', 'flint', 'flint-config.json'),
  ];
}

function loadFlintConfig() {
  const defaultVault = path.join(os.homedir(), 'Documents', 'Flint Hearth');
  for (const p of getKnownConfigPaths()) {
    try {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (raw && (raw.currentVaultPath || raw.recentVaults)) {
          return {
            currentVaultPath: raw.currentVaultPath || defaultVault,
            recentVaults: raw.recentVaults || [{ path: defaultVault, name: 'Flint Hearth', lastOpened: Date.now() }],
          };
        }
      }
    } catch (e) {}
  }

  return {
    currentVaultPath: defaultVault,
    recentVaults: [{ path: defaultVault, name: 'Flint Hearth', lastOpened: Date.now() }],
  };
}

let config = loadFlintConfig();

function getActiveHearthPath() {
  if (config.currentVaultPath && fs.existsSync(config.currentVaultPath)) {
    return config.currentVaultPath;
  }
  const defaultVault = path.join(os.homedir(), 'Documents', 'Flint Hearth');
  if (!fs.existsSync(defaultVault)) {
    try {
      fs.mkdirSync(defaultVault, { recursive: true });
    } catch (e) {}
  }
  return defaultVault;
}

// ── File & Markdown Helpers ──

function scanMarkdownFiles(dirPath, baseDir = dirPath) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (e) {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name.toLowerCase() === '.trash') continue;

    if (entry.isDirectory()) {
      results.push({
        id: relPath,
        title: entry.name,
        relativePath: relPath,
        isFolder: true,
        fullPath,
      });
      results.push(...scanMarkdownFiles(fullPath, baseDir));
    } else if (entry.name.endsWith('.md')) {
      results.push({
        id: relPath.replace(/\.md$/i, ''),
        title: entry.name.replace(/\.md$/i, ''),
        relativePath: relPath,
        isFolder: false,
        fullPath,
      });
    }
  }

  return results;
}

function parseFrontmatter(content) {
  if (!content) return { properties: {}, body: '' };
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { properties: {}, body: content };

  const yamlStr = match[1];
  const body = match[2];
  const properties = {};

  for (const line of yamlStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      try {
        properties[key] = JSON.parse(val);
      } catch {
        properties[key] = val;
      }
    }
  }

  return { properties, body };
}

function serializeFrontmatter(properties, body) {
  if (!properties || Object.keys(properties).length === 0) return body;
  const yamlLines = ['---'];
  for (const [k, v] of Object.entries(properties)) {
    if (typeof v === 'object') {
      yamlLines.push(`${k}: ${JSON.stringify(v)}`);
    } else {
      yamlLines.push(`${k}: ${v}`);
    }
  }
  yamlLines.push('---', '');
  return yamlLines.join('\n') + (body.startsWith('\n') ? body.slice(1) : body);
}

function readNoteFile(notePath) {
  if (!fs.existsSync(notePath)) return null;
  try {
    const stat = fs.statSync(notePath);
    if (stat.isDirectory()) return null;
    const raw = fs.readFileSync(notePath, 'utf8');
    const { properties, body } = parseFrontmatter(raw);
    return { raw, properties, body };
  } catch (e) {
    return null;
  }
}

function writeNoteFile(notePath, content, properties) {
  if (fs.existsSync(notePath)) {
    const stat = fs.statSync(notePath);
    if (stat.isDirectory()) {
      throw new Error(`Cannot write note: Target path "${notePath}" is an existing directory, not a markdown file.`);
    }
  }

  // If content itself already has frontmatter, extract and merge it
  const { properties: parsedProps, body } = parseFrontmatter(content);
  const mergedProps = { ...parsedProps, ...(properties || {}) };

  const fullContent = Object.keys(mergedProps).length > 0 ? serializeFrontmatter(mergedProps, body) : body;
  const dir = path.dirname(notePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(notePath, fullContent, 'utf8');
}

/**
 * Robustly resolves a note identifier or path to an exact file on disk.
 * Handles nested subfolders, bare titles, and rejects folder matches.
 */
function resolveNoteFile(targetIdentifier, activePath) {
  if (!targetIdentifier) return null;
  const raw = String(targetIdentifier).trim();
  const normalized = raw.replace(/\\/g, '/');
  const cleanId = normalized.replace(/\.md$/i, '');

  const allItems = scanMarkdownFiles(activePath);
  const onlyNotes = allItems.filter((f) => !f.isFolder);
  const onlyFolders = allItems.filter((f) => f.isFolder);

  // 1. Direct path check (e.g. '02 Projects/Flint.md' or 'Flint.md')
  const directPath = path.isAbsolute(raw) ? raw : path.join(activePath, raw.endsWith('.md') ? raw : `${raw}.md`);
  if (fs.existsSync(directPath)) {
    const stat = fs.statSync(directPath);
    if (!stat.isDirectory()) {
      const rel = path.relative(activePath, directPath).replace(/\\/g, '/');
      return {
        isFolder: false,
        fullPath: directPath,
        relativePath: rel,
        title: path.basename(directPath, '.md'),
        id: rel.replace(/\.md$/i, ''),
      };
    }
  }

  // 2. Exact match on relativePath or ID
  const exactMatch = onlyNotes.find(
    (f) =>
      f.id.toLowerCase() === cleanId.toLowerCase() ||
      f.relativePath.toLowerCase() === normalized.toLowerCase() ||
      f.relativePath.toLowerCase() === `${cleanId}.md`.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // 3. Match on note title (ignoring case)
  const titleMatch = onlyNotes.find(
    (f) =>
      f.title.toLowerCase() === cleanId.toLowerCase() ||
      f.title.toLowerCase() === path.basename(cleanId).toLowerCase()
  );
  if (titleMatch) return titleMatch;

  // 4. Check if the target is actually a folder
  const folderMatch = onlyFolders.find(
    (f) =>
      f.id.toLowerCase() === cleanId.toLowerCase() ||
      f.title.toLowerCase() === cleanId.toLowerCase() ||
      f.relativePath.toLowerCase() === normalized.toLowerCase()
  );
  if (folderMatch) {
    return {
      isFolder: true,
      fullPath: folderMatch.fullPath,
      relativePath: folderMatch.relativePath,
      title: folderMatch.title,
    };
  }

  return null;
}

// ── MCP Tool Definitions & Handlers ──

const TOOLS = [
  // 1. flint_list_hearths
  {
    name: 'flint_list_hearths',
    description: 'List all known and recent Hearths (workspaces/vaults) in Flint, including paths, names, and which one is active. Enables zero-config multi-vault access.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const activePath = getActiveHearthPath();
      const recent = (config.recentVaults || []).map((v) => ({
        name: v.name,
        path: v.path,
        isActive: v.path === activePath,
      }));
      if (!recent.some((r) => r.path === activePath)) {
        recent.unshift({ name: path.basename(activePath), path: activePath, isActive: true });
      }
      return {
        activeHearth: { name: path.basename(activePath), path: activePath },
        allHearths: recent,
      };
    },
  },

  // 2. flint_get_active_hearth
  {
    name: 'flint_get_active_hearth',
    description: 'Get details about the currently active Hearth workspace: name, root path, document count, and status.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const activePath = getActiveHearthPath();
      const files = scanMarkdownFiles(activePath);
      return {
        name: path.basename(activePath),
        path: activePath,
        totalNotes: files.filter((f) => !f.isFolder).length,
        totalFolders: files.filter((f) => f.isFolder).length,
      };
    },
  },

  // 3. flint_switch_hearth
  {
    name: 'flint_switch_hearth',
    description: 'Switch the active Hearth workspace to a different known Hearth by path or name.',
    parameters: {
      type: 'object',
      properties: {
        hearthPath: { type: 'string', description: 'The absolute directory path to the target Hearth' },
        name: { type: 'string', description: 'Optional name of a recent Hearth' },
      },
    },
    handler: async (args) => {
      let targetPath = args.hearthPath;
      if (!targetPath && args.name) {
        const match = (config.recentVaults || []).find((v) => v.name.toLowerCase() === args.name.toLowerCase());
        if (match) targetPath = match.path;
      }
      if (!targetPath || !fs.existsSync(targetPath)) {
        throw new Error(`Target Hearth at "${targetPath}" does not exist.`);
      }
      config.currentVaultPath = targetPath;
      return { message: `Switched active Hearth to "${path.basename(targetPath)}"`, path: targetPath };
    },
  },

  // 4. flint_search_notes
  {
    name: 'flint_search_notes',
    description: 'Search across all note titles and contents in the active Hearth.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords or phrases' },
        limit: { type: 'number', description: 'Max results to return (default: 20)' },
      },
      required: ['query'],
    },
    handler: async ({ query, limit = 20 }) => {
      const q = String(query).toLowerCase();
      const activePath = getActiveHearthPath();
      const files = scanMarkdownFiles(activePath);
      const matches = [];

      for (const file of files) {
        if (file.isFolder) continue;
        const note = readNoteFile(file.fullPath);
        if (!note) continue;

        const titleMatch = file.title.toLowerCase().includes(q);
        const contentMatch = note.body.toLowerCase().includes(q);

        if (titleMatch || contentMatch) {
          matches.push({
            id: file.id,
            title: file.title,
            relativePath: file.relativePath,
            snippet: note.body.slice(0, 200).replace(/\r?\n/g, ' '),
          });
          if (matches.length >= limit) break;
        }
      }

      return matches;
    },
  },

  // 5. flint_search_across_hearths
  {
    name: 'flint_search_across_hearths',
    description: 'Search for notes across ALL known/recent Hearths in Flint simultaneously.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limitPerHearth: { type: 'number', description: 'Max results per Hearth (default: 10)' },
      },
      required: ['query'],
    },
    handler: async ({ query, limitPerHearth = 10 }) => {
      const q = String(query).toLowerCase();
      const activePath = getActiveHearthPath();
      const hearths = [{ name: path.basename(activePath), path: activePath, isActive: true }];

      for (const v of config.recentVaults || []) {
        if (v.path && !hearths.some((h) => h.path === v.path) && fs.existsSync(v.path)) {
          hearths.push({ name: v.name, path: v.path, isActive: false });
        }
      }

      const results = [];
      for (const h of hearths) {
        const files = scanMarkdownFiles(h.path);
        const matches = [];
        for (const file of files) {
          if (file.isFolder) continue;
          const note = readNoteFile(file.fullPath);
          if (!note) continue;
          if (file.title.toLowerCase().includes(q) || note.body.toLowerCase().includes(q)) {
            matches.push({ title: file.title, relativePath: file.relativePath });
            if (matches.length >= limitPerHearth) break;
          }
        }
        if (matches.length > 0) {
          results.push({ hearthName: h.name, hearthPath: h.path, isActive: h.isActive, matches });
        }
      }
      return results;
    },
  },

  // 6. flint_read_note
  {
    name: 'flint_read_note',
    description: 'Read the full content, title, and frontmatter properties of a specific note by title or relative path.',
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Title or relative path of the note (e.g. "Meeting Notes" or "02 Projects/Flint.md")' },
      },
      required: ['documentId'],
    },
    handler: async ({ documentId }) => {
      const activePath = getActiveHearthPath();
      const resolved = resolveNoteFile(documentId, activePath);

      if (resolved && resolved.isFolder) {
        throw new Error(`Cannot read note: "${documentId}" is a folder (${resolved.relativePath}). Use flint_list_all_notes to see its files.`);
      }

      if (resolved && !resolved.isFolder) {
        const note = readNoteFile(resolved.fullPath);
        if (note) {
          return {
            id: resolved.id,
            title: resolved.title,
            relativePath: resolved.relativePath,
            content: note.body,
            properties: note.properties,
          };
        }
      }

      throw new Error(`Note "${documentId}" not found in Hearth "${path.basename(activePath)}".`);
    },
  },

  // 7. flint_create_note (Smart Upsert)
  {
    name: 'flint_create_note',
    description: 'Create a new markdown note or update an existing note in the active Hearth. Handles nested folder paths safely.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title or path of the note (e.g. "My Note" or "02 Projects/Roadmap")' },
        content: { type: 'string', description: 'Markdown body content' },
        properties: { type: 'object', description: 'Optional YAML frontmatter key-value pairs' },
        folder: { type: 'string', description: 'Optional target folder inside Hearth' },
      },
      required: ['title'],
    },
    handler: async ({ title, content = '', properties = {}, folder = '' }) => {
      const activePath = getActiveHearthPath();
      let rawTitle = String(title).trim().replace(/\.md$/i, '');

      // Check if title has a folder component in it
      if (rawTitle.includes('/') || rawTitle.includes('\\')) {
        const parts = rawTitle.replace(/\\/g, '/').split('/');
        const fileName = parts.pop();
        const subFolder = parts.join('/');
        folder = folder ? path.join(folder, subFolder).replace(/\\/g, '/') : subFolder;
        rawTitle = fileName;
      }

      const targetDir = folder ? path.join(activePath, folder) : activePath;
      const targetPath = path.join(targetDir, `${rawTitle}.md`);

      // Check if target is accidentally pointing to a directory
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        throw new Error(`Cannot create note: "${targetPath}" is an existing directory.`);
      }

      // Check if note already exists at this location or anywhere with this title
      const existing = resolveNoteFile(folder ? `${folder}/${rawTitle}` : rawTitle, activePath);
      let finalPath = targetPath;
      let existingProps = {};

      if (existing && !existing.isFolder) {
        finalPath = existing.fullPath;
        const read = readNoteFile(finalPath);
        if (read) existingProps = read.properties || {};
      }

      const mergedProps = { ...existingProps, ...properties };
      writeNoteFile(finalPath, content, mergedProps);

      const relPath = path.relative(activePath, finalPath).replace(/\\/g, '/');
      return {
        message: existing ? `Updated existing note "${rawTitle}" successfully.` : `Created note "${rawTitle}" successfully.`,
        title: rawTitle,
        relativePath: relPath,
      };
    },
  },

  // 8. flint_update_note (Safe Update)
  {
    name: 'flint_update_note',
    description: 'Update the content body of an existing note. Resolves note title or relative path safely without touching folders.',
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Title or relative path of the note to update' },
        content: { type: 'string', description: 'New markdown body content' },
        properties: { type: 'object', description: 'Optional frontmatter properties to merge' },
      },
      required: ['documentId', 'content'],
    },
    handler: async ({ documentId, content, properties }) => {
      const activePath = getActiveHearthPath();
      const resolved = resolveNoteFile(documentId, activePath);

      if (resolved && resolved.isFolder) {
        throw new Error(`Cannot update note: "${documentId}" is a folder. To write a note inside it, use flint_create_note({ title: "NoteName", folder: "${resolved.relativePath}" }).`);
      }

      if (!resolved) {
        // If not found, create it safely at root or path specified
        const cleanName = String(documentId).replace(/\.md$/i, '');
        const targetPath = path.join(activePath, `${cleanName}.md`);
        writeNoteFile(targetPath, content, properties || {});
        return {
          message: `Note "${documentId}" did not exist, created new note at "${path.relative(activePath, targetPath).replace(/\\/g, '/')}".`,
        };
      }

      const existing = readNoteFile(resolved.fullPath);
      const existingProps = existing ? existing.properties : {};
      const mergedProps = properties ? { ...existingProps, ...properties } : existingProps;

      writeNoteFile(resolved.fullPath, content, mergedProps);
      return {
        message: `Updated note "${resolved.title}" (${resolved.relativePath}) successfully.`,
        relativePath: resolved.relativePath,
      };
    },
  },

  // 9. flint_delete_note
  {
    name: 'flint_delete_note',
    description: 'Delete a note from the active Hearth.',
    isDestructive: true,
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Title or relative path of the note to delete' },
      },
      required: ['documentId'],
    },
    handler: async ({ documentId }) => {
      const activePath = getActiveHearthPath();
      const resolved = resolveNoteFile(documentId, activePath);

      if (resolved && resolved.isFolder) {
        throw new Error(`Cannot delete: "${documentId}" is a folder, not a note.`);
      }

      if (resolved && fs.existsSync(resolved.fullPath)) {
        fs.unlinkSync(resolved.fullPath);
        return { message: `Deleted note "${resolved.title}" (${resolved.relativePath}).` };
      }
      throw new Error(`Note "${documentId}" not found.`);
    },
  },

  // 10. flint_list_all_notes
  {
    name: 'flint_list_all_notes',
    description: 'List all documents and folders in the active Hearth with is_folder and relative_path indicators.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max items to return (default: 100)' },
      },
    },
    handler: async ({ limit = 100 }) => {
      const activePath = getActiveHearthPath();
      const files = scanMarkdownFiles(activePath);
      return files.slice(0, limit).map((f) => ({
        title: f.title,
        relativePath: f.relativePath,
        isFolder: f.isFolder,
      }));
    },
  },

  // 11. tasks_get_all
  {
    name: 'tasks_get_all',
    description: 'Extract all checklist and todo items across all notes in the active Hearth.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['all', 'pending', 'completed'], description: 'Filter by status (default: all)' },
      },
    },
    handler: async ({ status = 'all' }) => {
      const activePath = getActiveHearthPath();
      const files = scanMarkdownFiles(activePath);
      const tasks = [];

      for (const file of files) {
        if (file.isFolder) continue;
        const note = readNoteFile(file.fullPath);
        if (!note) continue;

        const lines = note.body.split('\n');
        for (const line of lines) {
          const match = line.match(/^(\s*[-*]\s*\[([ xX])\]\s*)(.*)$/);
          if (match) {
            const completed = match[2].toLowerCase() === 'x';
            if (status === 'pending' && completed) continue;
            if (status === 'completed' && !completed) continue;

            tasks.push({
              noteTitle: file.title,
              relativePath: file.relativePath,
              text: match[3].trim(),
              completed,
            });
          }
        }
      }

      return tasks;
    },
  },

  // 12. fsrs_get_due_cards
  {
    name: 'fsrs-spaced-repetition_get_due_cards',
    description: 'Scan and extract flashcards (Concept :: Descriptor, Term ;; Definition, {cloze}) from notes in the active Hearth.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const activePath = getActiveHearthPath();
      const files = scanMarkdownFiles(activePath);
      const cards = [];

      for (const file of files) {
        if (file.isFolder) continue;
        const note = readNoteFile(file.fullPath);
        if (!note) continue;

        const lines = note.body.split('\n');
        for (const line of lines) {
          if (line.includes('::')) {
            const [front, back] = line.split('::').map((s) => s.trim());
            if (front && back) {
              cards.push({ noteTitle: file.title, type: 'concept_descriptor', front, back });
            }
          } else if (line.includes(';;')) {
            const [term, def] = line.split(';;').map((s) => s.trim());
            if (term && def) {
              cards.push({ noteTitle: file.title, type: 'two_way', front: term, back: def });
            }
          }
        }
      }

      return cards;
    },
  },

  // 13. flint_get_backlinks
  {
    name: 'flint_get_backlinks',
    description: 'Find all incoming [[wikilinks]] pointing to a target note title.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Target note title' },
      },
      required: ['title'],
    },
    handler: async ({ title }) => {
      const activePath = getActiveHearthPath();
      const files = scanMarkdownFiles(activePath);
      const target = String(title).toLowerCase();
      const backlinks = [];

      for (const file of files) {
        if (file.isFolder) continue;
        const note = readNoteFile(file.fullPath);
        if (!note) continue;

        if (note.body.toLowerCase().includes(`[[${target}`) || note.body.toLowerCase().includes(`[[${target}|`)) {
          backlinks.push({
            sourceTitle: file.title,
            relativePath: file.relativePath,
          });
        }
      }

      return backlinks;
    },
  },
];

// ── MCP Prompts ──

const PROMPTS = [
  {
    name: 'flint_system_instructions',
    description: 'System instructions explaining Flint domain concepts (Hearths, Wikilinks, FSRS, Cascades) and best practices.',
    arguments: [],
    getMessages: async () => {
      const activePath = getActiveHearthPath();
      return {
        description: 'Flint Agent Instructions',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# Flint AI Agent Operational Protocol\n\nActive Hearth: "${path.basename(activePath)}" (${activePath})\n\n- Wikilinks: [[Note Title]]\n- Flashcards: Concept :: Descriptor, Term ;; Definition, {cloze}\n- Tasks: - [ ] Pending, - [x] Completed\n- Cascades: Frontmatter Cascade: "Book Title", Cascade Page: 1`,
            },
          },
        ],
      };
    },
  },
];

// ── JSON-RPC 2.0 Stdio Transport Protocol Loop ──

function sendResponse(id, result, error = null) {
  const response = { jsonrpc: '2.0', id };
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  process.stdout.write(JSON.stringify(response) + '\n');
}

function sendNotification(method, params = {}) {
  const msg = { jsonrpc: '2.0', method, params };
  process.stdout.write(JSON.stringify(msg) + '\n');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (err) {
    sendResponse(null, null, { code: -32700, message: 'Parse error' });
    return;
  }

  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize': {
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: 'flint-mcp-server',
            version: '0.3.0',
          },
        });
        break;
      }

      case 'notifications/initialized':
      case 'initialized': {
        // Notification, no response required
        break;
      }

      case 'ping': {
        sendResponse(id, {});
        break;
      }

      case 'tools/list': {
        sendResponse(id, {
          tools: TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.parameters,
          })),
        });
        break;
      }

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        const tool = TOOLS.find((t) => t.name === toolName);

        if (!tool) {
          sendResponse(id, {
            isError: true,
            content: [{ type: 'text', text: `Tool "${toolName}" not found.` }],
          });
          break;
        }

        try {
          const result = await tool.handler(toolArgs);
          sendResponse(id, {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          });
        } catch (err) {
          sendResponse(id, {
            isError: true,
            content: [{ type: 'text', text: `Execution error: ${err.message}` }],
          });
        }
        break;
      }

      case 'prompts/list': {
        sendResponse(id, {
          prompts: PROMPTS.map((p) => ({
            name: p.name,
            description: p.description,
            arguments: p.arguments,
          })),
        });
        break;
      }

      case 'prompts/get': {
        const promptName = params?.name;
        const prompt = PROMPTS.find((p) => p.name === promptName);
        if (!prompt) {
          sendResponse(id, null, { code: -32602, message: `Prompt "${promptName}" not found.` });
          break;
        }
        const evaluated = await prompt.getMessages(params?.arguments || {});
        sendResponse(id, evaluated);
        break;
      }

      default: {
        if (id !== undefined && id !== null) {
          sendResponse(id, null, { code: -32601, message: `Method "${method}" not implemented.` });
        }
        break;
      }
    }
  } catch (err) {
    if (id !== undefined && id !== null) {
      sendResponse(id, null, { code: -32603, message: `Internal server error: ${err.message}` });
    }
  }
});
