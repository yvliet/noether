# Security & Filesystem Boundary Invariants

An architectural specification of Noether's local-first security sandbox, filesystem containment validation, and database batch integrity guarantees.

## 1. The Local-First Filesystem Boundary
---

Because Noether interacts directly with physical files on your local drive through native Rust commands, preventing path traversal attacks (`../../`) and unintentional directory escapes is a fundamental architectural invariant.

Every filesystem command routed through Tauri IPC passes through the native path validator (`is_safe_vault_path`):

```
[ Incoming IPC Path: e.g. "Notes/../../Windows/System32" ]
  │
  ├── 1. Strip Windows UNC Prefixes (\\?\C:\... → C:\...)
  │
  ├── 2. Resolve Canonical Path (resolving symlinks and parent jumps)
  │
  ├── 3. Boundary Containment Check:
  │      canonical_target.starts_with(canonical_vault_root)
  │
  └── 4. Access Decision:
         If True  → Proceed with File Operation
         If False → Reject with SecurityException
```

## 2. Windows UNC Normalization & Case Insensitivity
---

Filesystem paths on Windows introduce platform-specific edge cases:
- **Extended-Length UNC Prefixes**: Windows APIs frequently emit extended prefixes (`\\?\C:\Users\...` or `\\?\UNC\server\share`). Noether normalizes all paths by stripping UNC markers before performing boundary validation.
- **Case-Insensitive Comparison**: On Windows platforms, path containment checks execute case-insensitively (`c:\vault\notes` matches `C:\Vault\Notes`).
- **Non-Existent Target Files**: When creating a new file that does not yet exist on disk, canonicalizing the target path directly would fail. Noether traverses upward to canonicalize the nearest existing parent directory before testing vault containment.

## 3. Vault Root & Trash Safety Guards
---

To protect users against accidental data loss, destructive filesystem operations enforce strict boundary constraints:

- **Root Wipe Prevention**: File deletion and folder wipe commands explicitly guard against empty strings, dot paths (`.`, `./`, `..\`), and the vault root itself. An extension or command can never wipe the root directory of a Vault.
- **Dedicated Trash Containment**: The `save_trash_file` and `delete_trash_file` commands enforce path boundaries strictly against the hidden `<vault>/.trash/` directory, preventing files outside the recovery bin from being altered during trash cleanups.

## 4. SQLite Data & Batch Integrity
---

When extensions or migrations execute multi-statement SQL batches:
- **Syntax-Aware Statement Splitters**: Multi-statement SQL scripts use a syntax-aware splitter that respects quoted strings, bracketed table identifiers, and SQL comments. This ensures row-returning stepping statements execute completely without truncation.
- **Binary `BLOB` Serialization**: Binary database columns are serialized as standard Base64 strings rather than lossy UTF-8 strings, guaranteeing zero data corruption on image previews or cached canvas assets.
