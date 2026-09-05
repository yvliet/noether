# TypeScript API: Relational SQLite (`defineTable`)

Flint enables extensions to declare type-safe relational SQLite tables directly in TypeScript, complete with automatic column migrations, version tracking, and cascade cleanup.


## 1. Defining a Table

---

```typescript
this.myTable = await this.defineTable({
  tableName: 'reading_analytics',
  columns: [
    { name: 'documentId', type: 'TEXT', notNull: true, onDelete: 'cascade' },
    { name: 'wordCount', type: 'INTEGER', notNull: true },
    { name: 'estimatedMinutes', type: 'REAL', notNull: true },
    { name: 'recordedAt', type: 'INTEGER', notNull: true },
  ],
  indexes: [
    { name: 'idx_analytics_doc', columns: ['documentId'] },
  ],
});
```


## 2. Table Operations

---

### Insert
```typescript
await this.myTable.insert({
  documentId: 'note-123',
  wordCount: 850,
  estimatedMinutes: 4.25,
  recordedAt: Date.now(),
});
```

### Query / Select
```typescript
const rows = await this.myTable.select({
  where: { documentId: 'note-123' },
  orderBy: 'recordedAt DESC',
  limit: 10,
});
```

### Update & Delete
```typescript
await this.myTable.update(
  { wordCount: 900 },
  { where: { documentId: 'note-123' } }
);

await this.myTable.delete({
  where: { documentId: 'note-123' }
});
```


## 3. Automatic Cascade Cleanup

---

When notes are moved to `.trash/` or deleted, columns configured with `onDelete: 'cascade'` automatically clean up associated rows.
