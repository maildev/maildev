# @maildev/smtp

## 3.0.0-rc.3

### Patch Changes

- @maildev/core@3.0.0-rc.3

## 3.0.0-rc.2

### Patch Changes

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

- fc7e584: Add a configurable maximum message size and reject oversized messages. A new `--max-message-size` option (env `MAILDEV_MAX_MESSAGE_SIZE`, default 50 MB) advertises the SMTP SIZE extension and refuses messages larger than the limit. The bytes forwarded to the parser are capped at the limit, so a malicious multipart message with a huge number of parts can no longer tie up the parser (addresses the unbounded MIME sibling-part fanout in #531). Set to 0 to disable the limit.
- Updated dependencies [c96f68f]
- Updated dependencies [e7bc086]
- Updated dependencies [42d3708]
  - @maildev/core@3.0.0-rc.2

## 3.0.0-rc.1

### Major Changes

- Complete project re-build

### Patch Changes

- Updated dependencies
  - @maildev/core@3.0.0-rc.1
