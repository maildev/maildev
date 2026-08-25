# @maildev/core

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
