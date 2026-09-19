# TypeScript API: Relational SQLite (`defineTable`)

Noether enables extensions to declare type-safe relational SQLite tables directly in TypeScript, complete with automatic column migrations, version tracking, and cascade cleanup.

## 1. Defining a Table
---

Declare relational tables in `onload()` using `this.defineTable<TRecord>(definition)`:

```typescript
interface ReadingRecord {
  documentId: string;
  wordCount: number;
  estimatedMinutes: number;
  recordedAt: number;
}

this.myTable = await this.defineTable<ReadingRecord>({
  tableName: 'reading_analytics',
  version: 1,
  teardownPolicy: 'preserve', // 'preserve' or 'drop' on extension uninstall
  columns: {
    documentId: {
      type: 'text',
      nullable: false,
      references: { table: 'documents', column: 'id', onDelete: 'cascade' },
    },
    wordCount: { type: 'integer', nullable: false },
    estimatedMinutes: { type: 'real', nullable: false },
    recordedAt: { type: 'integer', nullable: false },
  },
  indexes: [
    { name: 'idx_analytics_doc', columns: ['documentId'] },
  ],
  migrations: {
    2: async (db) => {
      await db.addColumn('reading_analytics', 'readingScore', 'REAL DEFAULT 0.0');
      await db.createIndex('idx_analytics_score', 'reading_analytics', ['readingScore']);
    },
  },
});
```

## 2. Table Operations & CRUD API
---

### Insert & Bulk Insert
```typescript
// Single insert
await this.myTable.insert({
  documentId: 'note-123',
  wordCount: 850,
  estimatedMinutes: 4.25,
  recordedAt: Date.now(),
});

// Batch insert inside a single atomic transaction
await this.myTable.insertMany([
  { documentId: 'note-1', wordCount: 300, estimatedMinutes: 1.5, recordedAt: Date.now() },
  { documentId: 'note-2', wordCount: 620, estimatedMinutes: 3.1, recordedAt: Date.now() },
]);
```

### Query & Aggregations
```typescript
// Select multiple records
const rows = await this.myTable.select({
  where: { documentId: 'note-123' },
  orderBy: 'recordedAt DESC',
  limit: 10,
});

// Select single record
const latest = await this.myTable.selectOne({
  where: { documentId: 'note-123' },
  orderBy: 'recordedAt DESC',
});

// Count matching records
const totalReads = await this.myTable.count({
  documentId: 'note-123',
});
```

### Update & Delete
```typescript
// Update signature: update(where, patch)
await this.myTable.update(
  { documentId: 'note-123' },
  { wordCount: 900 }
);

// Delete matching records
await this.myTable.delete({
  where: { documentId: 'note-123' },
});
```

### Raw SQL Queries
```typescript
// Execute parameter-bound custom queries
const results = await this.myTable.rawQuery<{ avgWords: number }>(
  'SELECT AVG(wordCount) as avgWords FROM ext_myext_reading_analytics WHERE recordedAt > ?',
  [Date.now() - 86400000]
);
```

## 3. Automatic Cascade Cleanup
---

When notes are moved to `.trash/` or deleted, columns configured with `references: { table: 'documents', column: 'id', onDelete: 'cascade' }` automatically clean up associated rows.

