#!/usr/bin/env node

/**
 * @file bin/noether-mcp-server.cjs
 * @description
 * Standalone stdio Model Context Protocol (MCP) server for Noether.
 * Exposes Noether's native knowledge tools, extension tools, and prompts to external
 * AI agents (Claude Desktop, Cursor, Antigravity, Gemini Code Assist, Agent CLI).
 *
 * Features:
 * - Zero-config multi-Vault auto-discovery from system configuration
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
const vm = require('vm');

// Redirect console output to stderr so stdout is strictly JSON-RPC 2.0 messages
console.log = (...args) => process.stderr.write(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n');
console.info = console.log;
console.warn = console.log;

// ── Configuration & Vault Discovery ──

function getKnownConfigPaths() {
  const home = os.homedir();
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(home, 'Library', 'Application Support') : path.join(home, '.config'));
  
  return [
    path.join(appData, 'noether', 'noether-config.json'),
    path.join(appData, 'Electron', 'noether-config.json'),
    path.join(home, '.noether', 'noether-config.json'),
    path.join(home, '.config', 'noether', 'noether-config.json'),
  ];
}

function loadNoetherConfig() {
  const defaultVault = path.join(os.homedir(), 'Documents', 'Noether Vault');
  for (const p of getKnownConfigPaths()) {
    try {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (raw && (raw.currentVaultPath || raw.recentVaults)) {
          return {
            currentVaultPath: raw.currentVaultPath || defaultVault,
            recentVaults: raw.recentVaults || [{ path: defaultVault, name: 'Noether Vault', lastOpened: Date.now() }],
          };
        }
      }
    } catch (e) {}
  }

  return {
    currentVaultPath: defaultVault,
    recentVaults: [{ path: defaultVault, name: 'Noether Vault', lastOpened: Date.now() }],
  };
}

let config = loadNoetherConfig();

function getActiveVaultPath() {
  if (config.currentVaultPath && fs.existsSync(config.currentVaultPath)) {
    return config.currentVaultPath;
  }
  const defaultVault = path.join(os.homedir(), 'Documents', 'Noether Vault');
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

  // 1. Direct path check (e.g. '02 Projects/Noether.md' or 'Noether.md')
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

function isSafeVaultPath(targetPath, vaultPath) {
  if (!targetPath || !vaultPath) return false;
  const resolvedTarget = path.resolve(targetPath).toLowerCase();
  const resolvedVault = path.resolve(vaultPath).toLowerCase();
  return resolvedTarget.startsWith(resolvedVault);
}

function extractMarkdownTasks(activePath, status = 'all') {
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
}

function extractFlashcards(activePath, filterTitle = null) {
  const files = scanMarkdownFiles(activePath);
  const cards = [];
  const filter = filterTitle ? String(filterTitle).toLowerCase() : null;

  const stripPrefix = (str) =>
    str
      .replace(/^(\s*[-*+]\s*\[[ xX]\]\s*)/, '')
      .replace(/^(\s*[-*+]\s+)/, '')
      .replace(/^(\s*\d+[\.\)]\s+)/, '')
      .replace(/^(\s*>\s*)/, '')
      .trim();

  for (const file of files) {
    if (file.isFolder) continue;
    if (filter && !file.title.toLowerCase().includes(filter) && !file.relativePath.toLowerCase().includes(filter)) {
      continue;
    }

    const note = readNoteFile(file.fullPath);
    if (!note) continue;

    const lines = note.body.split('\n');
    for (const rawLine of lines) {
      const rawTrimmed = rawLine.trim();
      if (!rawTrimmed || rawTrimmed.startsWith('```') || rawTrimmed.startsWith('~~~')) continue;

      const line = stripPrefix(rawTrimmed);
      if (!line) continue;

      // 1. Two-way card (;;)
      if (line.includes(';;')) {
        const parts = line.split(';;').map((s) => s.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          const front = parts[0];
          const back = parts.slice(1).join(';;').trim();
          cards.push({ noteTitle: file.title, type: 'two_way', front, back });
          cards.push({ noteTitle: file.title, type: 'two_way', front: back, back: front });
          continue;
        }
      }

      // 2. Concept card (::)
      if (line.includes('::')) {
        const parts = line.split('::').map((s) => s.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          const front = parts[0];
          const back = parts.slice(1).join('::').trim();
          cards.push({ noteTitle: file.title, type: 'concept_descriptor', front, back });
          continue;
        }
      }

      // 3. Cloze deletion ({cloze} or ==cloze==)
      const clozeCurly = /\{+([^\{\}]+)\}+/g;
      const clozeEqual = /==([^=\n]+)==/g;
      let match;
      let foundCloze = false;

      while ((match = clozeCurly.exec(line)) !== null) {
        let answer = match[1].trim();
        if (/^c\d+::/i.test(answer)) answer = answer.replace(/^c\d+::/i, '').trim();
        if (answer.includes('::')) answer = answer.split('::')[0].trim();
        if (answer) {
          cards.push({ noteTitle: file.title, type: 'cloze', front: line, back: answer });
          foundCloze = true;
        }
      }

      if (!foundCloze) {
        while ((match = clozeEqual.exec(line)) !== null) {
          const answer = match[1].trim();
          if (answer) {
            cards.push({ noteTitle: file.title, type: 'cloze', front: line, back: answer });
          }
        }
      }
    }
  }

  return cards;
}

// ── Dynamic Custom MCP Tool Engine & Vault Script Context ──

function loadVaultCustomTools(vaultPath) {
  const toolsDir = path.join(vaultPath, '.noether', 'tools');
  const loaded = new Map();
  if (!fs.existsSync(toolsDir)) return loaded;

  let entries = [];
  try {
    entries = fs.readdirSync(toolsDir, { withFileTypes: true });
  } catch (e) {
    return loaded;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    if (!entry.name.endsWith('.js') && !entry.name.endsWith('.cjs')) continue;

    const filePath = path.join(toolsDir, entry.name);
    const baseName = path.basename(entry.name, path.extname(entry.name)).replace(/^custom_/, '');

    try {
      delete require.cache[require.resolve(filePath)];
      const mod = require(filePath);
      if (!mod || typeof mod !== 'object') continue;

      const toolName = (mod.name || baseName).replace(/^custom_/, '');
      if (typeof mod.handler === 'function') {
        loaded.set(toolName.toLowerCase(), {
          name: toolName,
          mcpName: `custom_${toolName}`,
          description: mod.description || `Custom vault tool: ${toolName}`,
          parameters: mod.parameters || { type: 'object', properties: {} },
          handler: mod.handler,
          filePath,
          status: 'loaded',
        });
      }
    } catch (err) {
      loaded.set(baseName.toLowerCase(), {
        name: baseName,
        mcpName: `custom_${baseName}`,
        description: `Failed to load custom tool: ${err.message}`,
        parameters: { type: 'object', properties: {} },
        filePath,
        status: 'error',
        error: err.message,
      });
    }
  }

  return loaded;
}

function createVaultScriptContext(activeVaultPath, captureLogs = []) {
  const logger = {
    log: (...args) => captureLogs.push({ level: 'info', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }),
    info: (...args) => captureLogs.push({ level: 'info', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }),
    warn: (...args) => captureLogs.push({ level: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }),
    error: (...args) => captureLogs.push({ level: 'error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }),
  };

  const vaultApi = {
    path: activeVaultPath,
    readNote: (idOrPath) => {
      const resolved = resolveNoteFile(idOrPath, activeVaultPath);
      if (!resolved || resolved.isFolder) return null;
      return readNoteFile(resolved.fullPath);
    },
    writeNote: (idOrPath, content, properties) => {
      let targetPath;
      if (path.isAbsolute(idOrPath)) {
        targetPath = idOrPath;
      } else {
        targetPath = path.join(activeVaultPath, idOrPath.endsWith('.md') ? idOrPath : `${idOrPath}.md`);
      }
      if (!isSafeVaultPath(targetPath, activeVaultPath)) {
        throw new Error(`Path containment violation: "${targetPath}" is outside the active Vault boundary.`);
      }
      writeNoteFile(targetPath, content, properties);
      return { success: true, path: targetPath };
    },
    deleteNote: (idOrPath) => {
      const resolved = resolveNoteFile(idOrPath, activeVaultPath);
      if (!resolved || resolved.isFolder) throw new Error(`Note "${idOrPath}" not found.`);
      const trashDir = path.join(activeVaultPath, '.trash');
      if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });
      const trashPath = path.join(trashDir, path.basename(resolved.fullPath));
      fs.renameSync(resolved.fullPath, trashPath);
      return { success: true, trashedTo: trashPath };
    },
    scanNotes: (subfolder = '') => {
      const targetDir = subfolder ? path.join(activeVaultPath, subfolder) : activeVaultPath;
      return scanMarkdownFiles(targetDir, activeVaultPath);
    },
    searchNotes: (query, limit = 20) => {
      const q = String(query).toLowerCase();
      const files = scanMarkdownFiles(activeVaultPath);
      const matches = [];
      for (const file of files) {
        if (file.isFolder) continue;
        const note = readNoteFile(file.fullPath);
        if (!note) continue;
        if (file.title.toLowerCase().includes(q) || note.body.toLowerCase().includes(q)) {
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
    getBacklinks: (title) => {
      const files = scanMarkdownFiles(activeVaultPath);
      const target = String(title).toLowerCase();
      const backlinks = [];
      for (const file of files) {
        if (file.isFolder) continue;
        const note = readNoteFile(file.fullPath);
        if (!note) continue;
        if (note.body.toLowerCase().includes(`[[${target}`) || note.body.toLowerCase().includes(`[[${target}|`)) {
          backlinks.push({ sourceTitle: file.title, relativePath: file.relativePath });
        }
      }
      return backlinks;
    },
    getTasks: (status = 'all') => {
      return extractMarkdownTasks(activeVaultPath, status);
    },
    getDueCards: (filterTitle = null) => {
      return extractFlashcards(activeVaultPath, filterTitle);
    },
    resolveNote: (target) => resolveNoteFile(target, activeVaultPath),
    listVaults: () => {
      return (config.recentVaults || []).map((v) => ({
        name: v.name,
        path: v.path,
        isActive: v.path === activeVaultPath,
      }));
    },
  };

  return {
    vault: vaultApi,
    console: logger,
    path,
    Buffer,
    setTimeout,
    clearTimeout,
    parseInt,
    parseFloat,
    encodeURIComponent,
    decodeURIComponent,
    parseFrontmatter,
    serializeFrontmatter,
  };
}

async function executeScriptCode(code, args = {}, activeVaultPath, timeoutMs = 30000) {
  const logs = [];
  const contextObj = createVaultScriptContext(activeVaultPath, logs);

  const sandbox = {
    ...contextObj,
    args: args || {},
    context: contextObj,
  };

  const vmContext = vm.createContext(sandbox);

  const wrappedCode = `
    (async () => {
      let module = { exports: {} };
      let exports = module.exports;
      const __fn = async () => {
        ${code}
      };
      const __res = await __fn();
      if (typeof module.exports === 'function') {
        return await module.exports(args, context);
      }
      if (module.exports && typeof module.exports.handler === 'function') {
        return await module.exports.handler(args, context);
      }
      return __res;
    })()
  `;

  const script = new vm.Script(wrappedCode, {
    filename: 'agent-script.js',
  });

  const startTime = Date.now();
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`Script execution timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    const runPromise = script.runInContext(vmContext, { timeout: timeoutMs });
    const result = await Promise.race([runPromise, timeoutPromise]);
    clearTimeout(timerId);
    const executionTimeMs = Date.now() - startTime;
    return {
      success: true,
      result: result !== undefined ? result : null,
      logs,
      executionTimeMs,
    };
  } catch (err) {
    clearTimeout(timerId);
    const executionTimeMs = Date.now() - startTime;
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      logs,
      executionTimeMs,
    };
  }
}

let customTools = loadVaultCustomTools(getActiveVaultPath());

// ── MCP Tool Definitions & Handlers ──

const TOOLS = [
  // 1. noether_list_vaults
  {
    name: 'noether_list_vaults',
    description: 'List all known and recent Vaults (workspaces/vaults) in Noether, including paths, names, and which one is active. Enables zero-config multi-vault access.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const activePath = getActiveVaultPath();
      const recent = (config.recentVaults || []).map((v) => ({
        name: v.name,
        path: v.path,
        isActive: v.path === activePath,
      }));
      if (!recent.some((r) => r.path === activePath)) {
        recent.unshift({ name: path.basename(activePath), path: activePath, isActive: true });
      }
      return {
        activeVault: { name: path.basename(activePath), path: activePath },
        allVaults: recent,
      };
    },
  },

  // 2. noether_get_active_vault
  {
    name: 'noether_get_active_vault',
    description: 'Get details about the currently active Vault workspace: name, root path, document count, and status.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const activePath = getActiveVaultPath();
      const files = scanMarkdownFiles(activePath);
      return {
        name: path.basename(activePath),
        path: activePath,
        totalNotes: files.filter((f) => !f.isFolder).length,
        totalFolders: files.filter((f) => f.isFolder).length,
      };
    },
  },

  // 3. noether_switch_vault
  {
    name: 'noether_switch_vault',
    description: 'Switch the active Vault workspace to a different known Vault by path or name.',
    parameters: {
      type: 'object',
      properties: {
        vaultPath: { type: 'string', description: 'The absolute directory path to the target Vault' },
        name: { type: 'string', description: 'Optional name of a recent Vault' },
      },
    },
    handler: async (args) => {
      let targetPath = args.vaultPath;
      if (!targetPath && args.name) {
        const match = (config.recentVaults || []).find((v) => v.name.toLowerCase() === args.name.toLowerCase());
        if (match) targetPath = match.path;
      }
      if (!targetPath || !fs.existsSync(targetPath)) {
        throw new Error(`Target Vault at "${targetPath}" does not exist.`);
      }
      config.currentVaultPath = targetPath;
      customTools = loadVaultCustomTools(targetPath);
      sendNotification('notifications/tools/list_changed', {});
      return { message: `Switched active Vault to "${path.basename(targetPath)}"`, path: targetPath };
    },
  },

  // 4. noether_search_notes
  {
    name: 'noether_search_notes',
    description: 'Search across all note titles and contents in the active Vault.',
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
      const activePath = getActiveVaultPath();
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

  // 5. noether_search_across_vaults
  {
    name: 'noether_search_across_vaults',
    description: 'Search for notes across ALL known/recent Vaults in Noether simultaneously.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limitPerVault: { type: 'number', description: 'Max results per Vault (default: 10)' },
      },
      required: ['query'],
    },
    handler: async ({ query, limitPerVault = 10 }) => {
      const q = String(query).toLowerCase();
      const activePath = getActiveVaultPath();
      const vaults = [{ name: path.basename(activePath), path: activePath, isActive: true }];

      for (const v of config.recentVaults || []) {
        if (v.path && !vaults.some((h) => h.path === v.path) && fs.existsSync(v.path)) {
          vaults.push({ name: v.name, path: v.path, isActive: false });
        }
      }

      const results = [];
      for (const h of vaults) {
        const files = scanMarkdownFiles(h.path);
        const matches = [];
        for (const file of files) {
          if (file.isFolder) continue;
          const note = readNoteFile(file.fullPath);
          if (!note) continue;
          if (file.title.toLowerCase().includes(q) || note.body.toLowerCase().includes(q)) {
            matches.push({ title: file.title, relativePath: file.relativePath });
            if (matches.length >= limitPerVault) break;
          }
        }
        if (matches.length > 0) {
          results.push({ vaultName: h.name, vaultPath: h.path, isActive: h.isActive, matches });
        }
      }
      return results;
    },
  },

  // 6. noether_read_note
  {
    name: 'noether_read_note',
    description: 'Read the full content, title, and frontmatter properties of a specific note by title or relative path.',
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Title or relative path of the note (e.g. "Meeting Notes" or "02 Projects/Noether.md")' },
      },
      required: ['documentId'],
    },
    handler: async ({ documentId }) => {
      const activePath = getActiveVaultPath();
      const resolved = resolveNoteFile(documentId, activePath);

      if (resolved && resolved.isFolder) {
        throw new Error(`Cannot read note: "${documentId}" is a folder (${resolved.relativePath}). Use noether_list_all_notes to see its files.`);
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

      throw new Error(`Note "${documentId}" not found in Vault "${path.basename(activePath)}".`);
    },
  },

  // 7. noether_create_note (Smart Upsert)
  {
    name: 'noether_create_note',
    description: 'Create a new markdown note or update an existing note in the active Vault. Handles nested folder paths safely.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title or path of the note (e.g. "My Note" or "02 Projects/Roadmap")' },
        content: { type: 'string', description: 'Markdown body content' },
        properties: { type: 'object', description: 'Optional YAML frontmatter key-value pairs' },
        folder: { type: 'string', description: 'Optional target folder inside Vault' },
      },
      required: ['title'],
    },
    handler: async ({ title, content = '', properties = {}, folder = '' }) => {
      const activePath = getActiveVaultPath();
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

  // 8. noether_update_note (Safe Update)
  {
    name: 'noether_update_note',
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
      const activePath = getActiveVaultPath();
      const resolved = resolveNoteFile(documentId, activePath);

      if (resolved && resolved.isFolder) {
        throw new Error(`Cannot update note: "${documentId}" is a folder. To write a note inside it, use noether_create_note({ title: "NoteName", folder: "${resolved.relativePath}" }).`);
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

  // 9. noether_delete_note
  {
    name: 'noether_delete_note',
    description: 'Delete a note from the active Vault.',
    isDestructive: true,
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Title or relative path of the note to delete' },
      },
      required: ['documentId'],
    },
    handler: async ({ documentId }) => {
      const activePath = getActiveVaultPath();
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

  // 10. noether_list_all_notes
  {
    name: 'noether_list_all_notes',
    description: 'List all documents and folders in the active Vault with is_folder and relative_path indicators.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max items to return (default: 100)' },
      },
    },
    handler: async ({ limit = 100 }) => {
      const activePath = getActiveVaultPath();
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
    description: 'Extract all checklist and todo items across all notes in the active Vault.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['all', 'pending', 'completed'], description: 'Filter by status (default: all)' },
      },
    },
    handler: async ({ status = 'all' }) => {
      const activePath = getActiveVaultPath();
      return extractMarkdownTasks(activePath, status);
    },
  },

  // 12. fsrs_get_due_cards
  {
    name: 'fsrs-spaced-repetition_get_due_cards',
    description: 'Scan and extract flashcards (Concept :: Descriptor, Term ;; Definition, {cloze}, ==cloze==) from notes in the active Vault.',
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Optional document or note title filter' },
      },
    },
    handler: async (args) => {
      const activePath = getActiveVaultPath();
      return extractFlashcards(activePath, args?.documentId);
    },
  },

  // 13. noether_get_backlinks
  {
    name: 'noether_get_backlinks',
    description: 'Find all incoming [[wikilinks]] pointing to a target note title.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Target note title' },
      },
      required: ['title'],
    },
    handler: async ({ title }) => {
      const activePath = getActiveVaultPath();
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

  // 14. noether_run_script
  {
    name: 'noether_run_script',
    description: 'Execute an ad-hoc JavaScript/Node.js script directly against the active Vault with high-speed access to notes, tasks, flashcards, search, and file manipulation. Variables available in scope: vault, context, args, console, and path. Returns script output, captured console logs, and execution duration in a single round-trip.',
    parameters: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'The JavaScript code to execute. Can be expressions, async statements with return, or module.exports = async (args, context) => ...',
        },
        args: {
          type: 'object',
          description: 'Optional arguments object accessible as "args" inside the script',
        },
        timeoutMs: {
          type: 'number',
          description: 'Maximum execution timeout in milliseconds (default: 30000)',
        },
      },
      required: ['script'],
    },
    handler: async ({ script, args = {}, timeoutMs = 30000 }) => {
      const activePath = getActiveVaultPath();
      const res = await executeScriptCode(script, args, activePath, timeoutMs);
      if (!res.success) {
        throw new Error(`Script execution failed: ${res.error}\n${res.stack || ''}`);
      }
      return res;
    },
  },

  // 15. noether_create_custom_tool
  {
    name: 'noether_create_custom_tool',
    description: 'Create and persist a custom MCP tool in the active Vault (.noether/tools/<name>.js). The tool is dynamically validated, compiled, loaded into memory, exposed in tools/list, and immediately callable by AI agents.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Unique tool name identifier (e.g. "count_tags", "summarize_readings"). Alphanumeric, underscores, and hyphens only.',
        },
        description: {
          type: 'string',
          description: 'Detailed description explaining what the tool does and when an AI agent should invoke it.',
        },
        parameters: {
          type: 'object',
          description: 'JSON Schema object defining the tool\'s input parameters (e.g. { type: "object", properties: { ... }, required: [...] })',
        },
        script: {
          type: 'string',
          description: 'JavaScript code for the tool. Can be either the function body of async (args, context) => ... or a complete CommonJS module exporting { name, description, parameters, handler }.',
        },
        overwrite: {
          type: 'boolean',
          description: 'Whether to overwrite an existing tool with the same name (default: false)',
        },
      },
      required: ['name', 'description', 'script'],
    },
    handler: async ({ name, description, parameters = { type: 'object', properties: {} }, script, overwrite = false }) => {
      const activePath = getActiveVaultPath();
      const cleanName = String(name).trim().toLowerCase().replace(/^custom_/, '');

      if (!/^[a-z0-9_-]+$/.test(cleanName)) {
        throw new Error(`Invalid tool name "${name}". Name must contain only alphanumeric characters, underscores, or hyphens.`);
      }

      const toolsDir = path.join(activePath, '.noether', 'tools');
      if (!fs.existsSync(toolsDir)) {
        fs.mkdirSync(toolsDir, { recursive: true });
      }

      const targetFile = path.join(toolsDir, `${cleanName}.js`);
      if (fs.existsSync(targetFile) && !overwrite) {
        throw new Error(`Custom tool "${cleanName}" already exists at "${targetFile}". Set overwrite: true to replace it.`);
      }

      let fileContent;
      if (script.includes('module.exports')) {
        fileContent = script;
      } else {
        const safeDescription = String(description).replace(/\*\//g, '* /');
        const indentedScript = script.split('\n').map((l) => `    ${l}`).join('\n');
        fileContent = `/**\n * Custom MCP Tool: ${cleanName}\n * ${safeDescription}\n */\n\nmodule.exports = {\n  name: ${JSON.stringify(cleanName)},\n  description: ${JSON.stringify(description)},\n  parameters: ${JSON.stringify(parameters || { type: 'object', properties: {} }, null, 2)},\n  handler: async (args, context) => {\n${indentedScript}\n  },\n};\n`;
      }

      try {
        new vm.Script(fileContent, { filename: `${cleanName}.js` });
      } catch (compileErr) {
        throw new Error(`Script syntax validation failed: ${compileErr.message}`);
      }

      fs.writeFileSync(targetFile, fileContent, 'utf8');

      customTools = loadVaultCustomTools(activePath);
      sendNotification('notifications/tools/list_changed', {});

      return {
        success: true,
        message: `Custom tool "${cleanName}" created and registered successfully.`,
        toolName: `custom_${cleanName}`,
        filePath: targetFile,
        availableInList: true,
      };
    },
  },

  // 16. noether_list_custom_tools
  {
    name: 'noether_list_custom_tools',
    description: 'List all custom MCP tools authored for and stored in the active Vault (.noether/tools/), including their status, descriptions, parameters schema, and file paths.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const activePath = getActiveVaultPath();
      customTools = loadVaultCustomTools(activePath);
      const list = Array.from(customTools.values()).map((t) => ({
        name: t.name,
        mcpName: t.mcpName,
        description: t.description,
        parameters: t.parameters,
        status: t.status,
        filePath: t.filePath,
        error: t.error || null,
      }));
      return {
        activeVault: path.basename(activePath),
        totalCustomTools: list.length,
        tools: list,
      };
    },
  },

  // 17. noether_run_custom_tool
  {
    name: 'noether_run_custom_tool',
    description: 'Execute an existing custom MCP tool by name with arguments. Enables immediate execution without waiting for client tool cache refresh.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the custom tool to execute (e.g. "my_tool" or "custom_my_tool")',
        },
        args: {
          type: 'object',
          description: 'Arguments object matching the tool parameters schema',
        },
      },
      required: ['name'],
    },
    handler: async ({ name, args = {} }) => {
      const activePath = getActiveVaultPath();
      const cleanKey = String(name).toLowerCase().replace(/^custom_/, '');

      if (!customTools.has(cleanKey)) {
        customTools = loadVaultCustomTools(activePath);
      }

      const tool = customTools.get(cleanKey);
      if (!tool) {
        const available = Array.from(customTools.keys()).join(', ') || 'none';
        throw new Error(`Custom tool "${name}" not found. Available custom tools: ${available}`);
      }

      if (tool.status === 'error') {
        throw new Error(`Custom tool "${name}" is in an error state: ${tool.error}`);
      }

      const logs = [];
      const context = createVaultScriptContext(activePath, logs);
      const originalLog = console.log;
      const originalInfo = console.info;
      const originalWarn = console.warn;
      const originalError = console.error;

      console.log = (...a) => context.console.log(...a);
      console.info = (...a) => context.console.info(...a);
      console.warn = (...a) => context.console.warn(...a);
      console.error = (...a) => context.console.error(...a);

      const startTime = Date.now();
      try {
        const result = await tool.handler(args, context);
        const executionTimeMs = Date.now() - startTime;
        return {
          success: true,
          result: result !== undefined ? result : null,
          logs,
          executionTimeMs,
        };
      } finally {
        console.log = originalLog;
        console.info = originalInfo;
        console.warn = originalWarn;
        console.error = originalError;
      }
    },
  },

  // 18. noether_delete_custom_tool
  {
    name: 'noether_delete_custom_tool',
    description: 'Delete a custom MCP tool from the active Vault (.noether/tools/), unregistering it from the MCP server.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the custom tool to delete',
        },
      },
      required: ['name'],
    },
    handler: async ({ name }) => {
      const activePath = getActiveVaultPath();
      const cleanKey = String(name).toLowerCase().replace(/^custom_/, '');
      const toolsDir = path.join(activePath, '.noether', 'tools');

      let deleted = false;
      for (const ext of ['.js', '.cjs']) {
        const candidate = path.join(toolsDir, `${cleanKey}${ext}`);
        if (fs.existsSync(candidate)) {
          fs.unlinkSync(candidate);
          deleted = true;
          break;
        }
      }

      customTools = loadVaultCustomTools(activePath);
      sendNotification('notifications/tools/list_changed', {});

      if (!deleted) {
        return { success: false, message: `Custom tool "${name}" was not found on disk.` };
      }

      return { success: true, message: `Custom tool "${cleanKey}" deleted and unregistered.` };
    },
  },
];

// ── MCP Prompts ──

const PROMPTS = [
  {
    name: 'noether_system_instructions',
    description: 'System instructions explaining Noether domain concepts (Vaults, Wikilinks, FSRS, Cascades) and best practices.',
    arguments: [],
    getMessages: async () => {
      const activePath = getActiveVaultPath();
      return {
        description: 'Noether Agent Instructions',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# Noether AI Agent Operational Protocol\n\nActive Vault: "${path.basename(activePath)}" (${activePath})\n\n- Wikilinks: [[Note Title]]\n- Flashcards: Concept :: Descriptor, Term ;; Definition, {cloze}\n- Tasks: - [ ] Pending, - [x] Completed\n- Cascades: Frontmatter Cascade: "Book Title", Cascade Page: 1`,
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
            tools: { listChanged: true },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: 'noether-mcp-server',
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
        const dynamicTools = [];
        for (const ct of customTools.values()) {
          if (ct.status === 'loaded') {
            dynamicTools.push({
              name: ct.mcpName,
              description: `[Custom Vault Tool] ${ct.description}`,
              inputSchema: ct.parameters,
            });
          }
        }

        const allTools = TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.parameters,
        })).concat(dynamicTools);

        sendResponse(id, { tools: allTools });
        break;
      }

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        const tool = TOOLS.find((t) => t.name === toolName);

        if (tool) {
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

        const cleanKey = String(toolName || '').toLowerCase().replace(/^custom_/, '');
        const customTool = customTools.get(cleanKey);
        if (customTool && customTool.status === 'loaded') {
          const logs = [];
          const context = createVaultScriptContext(getActiveVaultPath(), logs);
          const originalLog = console.log;
          const originalInfo = console.info;
          const originalWarn = console.warn;
          const originalError = console.error;

          console.log = (...a) => context.console.log(...a);
          console.info = (...a) => context.console.info(...a);
          console.warn = (...a) => context.console.warn(...a);
          console.error = (...a) => context.console.error(...a);

          try {
            const startTime = Date.now();
            const result = await customTool.handler(toolArgs, context);
            const executionTimeMs = Date.now() - startTime;
            sendResponse(id, {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      success: true,
                      result: result !== undefined ? result : null,
                      logs: logs.length > 0 ? logs : undefined,
                      executionTimeMs,
                    },
                    null,
                    2
                  ),
                },
              ],
            });
          } catch (err) {
            sendResponse(id, {
              isError: true,
              content: [{ type: 'text', text: `Custom tool error: ${err.message}` }],
            });
          } finally {
            console.log = originalLog;
            console.info = originalInfo;
            console.warn = originalWarn;
            console.error = originalError;
          }
          break;
        }

        sendResponse(id, {
          isError: true,
          content: [{ type: 'text', text: `Tool "${toolName}" not found.` }],
        });
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
