# @maildev/core

## 3.0.0

### Major Changes

- [#525](https://github.com/maildev/maildev/pull/525) [`8aafc97`](https://github.com/maildev/maildev/commit/8aafc979cc07ba2187262d72606dba24bd9cdfc6) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Complete project re-build

### Patch Changes

- [`c96f68f`](https://github.com/maildev/maildev/commit/c96f68fa21d5cd80106d67c472d64f7df0cc733a) Thanks [@djfarrelly](https://github.com/djfarrelly)! - List large inboxes as paginated, body-free summaries

  The web UI previously refetched every email in full every five seconds — a
  117 MB response at 10,000 emails. New `GET /api/email/summary` returns a bounded
  page of body-free summaries with server-side search, sorting and counts. The web
  interface uses it instead of refetching the whole inbox, renders one page at a
  time with infinite scroll, and coalesces socket updates so a burst of mail
  causes one refetch rather than one per message.

  The summary projection lives at the API boundary (`Storage.list()` +
  `toSummary`), not on the storage interface.

  Breaking changes:
  - `@maildev/core`: `Storage` implementations must now provide `list`. A new
    `EmailSummary` type and `toSummary`/`matchesSearchTerm` helpers are exported.
  - `@maildev/api`: the Socket.IO `newMail` event now carries an `EmailSummary`
    (no `html`/`text`/`headers`) instead of the full email — fetch
    `GET /api/email/:id` for the body.

- [`e7bc086`](https://github.com/maildev/maildev/commit/e7bc0869aa0ab4ad74d9b5b83e8e8c936c465b34) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Make in-memory storage O(1) so large inboxes stay responsive

  The array-backed store made ingest and mark-all-read quadratic, so a large
  inbox became slow to fill and slow to clear. `MemoryStorage` is now backed by an
  insertion-ordered `Map`, making `getById`, `save` and `delete` O(1), with the
  unread count maintained incrementally so `stats()` never has to scan.

  Breaking change:
  - `@maildev/core`: `Storage` implementations must now provide `markAllRead` and
    `stats`. A new `StorageStats` type is exported.

- [`42d3708`](https://github.com/maildev/maildev/commit/42d37085fe70ead4719a4f37f6f22b076d0fd45b) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Add an opt-in maxEmails limit that also bounds the mail directory

  An opt-in `maxEmails` limit (default `0` = unlimited; set `--max-emails` to cap)
  discards the oldest emails along with their `.eml` files and attachments, so both
  memory and the mail directory can be kept bounded. When set, leftover files from
  earlier runs are trimmed at startup. The default keeps MailDev's historical
  unbounded behaviour, so persisted mail stays durable across restarts (no data
  loss by default).

  Breaking change:
  - `@maildev/core`: `Storage` implementations must now provide `onEvicted`. A new
    `EvictHandler` type and `mapLimit` helper are exported.

- [#579](https://github.com/maildev/maildev/pull/579) [`efba452`](https://github.com/maildev/maildev/commit/efba452978cab0b5ff8423f1cce880ec0dd7912e) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Persist relay delivery status across restarts

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

- [#579](https://github.com/maildev/maildev/pull/579) [`f78e761`](https://github.com/maildev/maildev/commit/f78e76126e33f7392ff2de44faabbcc5b57ba90d) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Record relay delivery status on the email. After a successful relay, the stored email now carries `relayedAt` (when it was last relayed) and `relayedTo` (the recipients it was delivered to), so the REST API can report whether a message was relayed and to which addresses. This hooks into the shared `relayEmail` path used by both auto-relay and the manual relay endpoint (closes [#199](https://github.com/maildev/maildev/issues/199)).

## 3.0.0-rc.3

## 3.0.0-rc.2

### Patch Changes

- c96f68f: List large inboxes as paginated, body-free summaries

  The web UI previously refetched every email in full every five seconds — a
  117 MB response at 10,000 emails. New `GET /api/email/summary` returns a bounded
  page of body-free summaries with server-side search, sorting and counts. The web
  interface uses it instead of refetching the whole inbox, renders one page at a
  time with infinite scroll, and coalesces socket updates so a burst of mail
  causes one refetch rather than one per message.

  The summary projection lives at the API boundary (`Storage.list()` +
  `toSummary`), not on the storage interface.

  Breaking changes:
  - `@maildev/core`: `Storage` implementations must now provide `list`. A new
    `EmailSummary` type and `toSummary`/`matchesSearchTerm` helpers are exported.
  - `@maildev/api`: the Socket.IO `newMail` event now carries an `EmailSummary`
    (no `html`/`text`/`headers`) instead of the full email — fetch
    `GET /api/email/:id` for the body.

- e7bc086: Make in-memory storage O(1) so large inboxes stay responsive

  The array-backed store made ingest and mark-all-read quadratic, so a large
  inbox became slow to fill and slow to clear. `MemoryStorage` is now backed by an
  insertion-ordered `Map`, making `getById`, `save` and `delete` O(1), with the
  unread count maintained incrementally so `stats()` never has to scan.

  Breaking change:
  - `@maildev/core`: `Storage` implementations must now provide `markAllRead` and
    `stats`. A new `StorageStats` type is exported.

- 42d3708: Add an opt-in maxEmails limit that also bounds the mail directory

  An opt-in `maxEmails` limit (default `0` = unlimited; set `--max-emails` to cap)
  discards the oldest emails along with their `.eml` files and attachments, so both
  memory and the mail directory can be kept bounded. When set, leftover files from
  earlier runs are trimmed at startup. The default keeps MailDev's historical
  unbounded behaviour, so persisted mail stays durable across restarts (no data
  loss by default).

  Breaking change:
  - `@maildev/core`: `Storage` implementations must now provide `onEvicted`. A new
    `EvictHandler` type and `mapLimit` helper are exported.

## 3.0.0-rc.1

### Major Changes

- Complete project re-build
