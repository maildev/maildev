---
'@maildev/core': patch
'@maildev/smtp': patch
---

Persist relay delivery status across restarts

`relayedAt`/`relayedTo` were kept only in memory, so a restart lost the record
of whether a message had been relayed. Disk-backed storage now writes a small
per-email metadata sidecar (`<id>.meta.json`) next to the `.eml`, and
`loadMailsFromDirectory` reads it back when restoring, so relay status survives
a restart. The sidecar holds post-receipt state that can't be recovered by
re-parsing the message and is a natural home for future persisted fields; it is
removed with the email on delete, bulk delete and `maxEmails` eviction.
In-memory storage is unaffected.

- `@maildev/core`: `FileStorage` persists email metadata; a new `EmailMetadata`
  type describes the persisted shape and the optional `Storage.readMetadata(id)`
  exposes it for restore.
