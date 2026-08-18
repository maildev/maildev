---
'@maildev/core': patch
'@maildev/api': patch
'@maildev/smtp': patch
---

Make in-memory storage O(1) so large inboxes stay responsive

The array-backed store made ingest and mark-all-read quadratic, so a large
inbox became slow to fill and slow to clear. `MemoryStorage` is now backed by an
insertion-ordered `Map`, making `getById`, `save` and `delete` O(1), with the
unread count maintained incrementally so `stats()` never has to scan.

Breaking change:

- `@maildev/core`: `Storage` implementations must now provide `markAllRead` and
  `stats`. A new `StorageStats` type is exported.
