# @maildev/smtp

## 3.0.0

### Major Changes

- [#525](https://github.com/maildev/maildev/pull/525) [`8aafc97`](https://github.com/maildev/maildev/commit/8aafc979cc07ba2187262d72606dba24bd9cdfc6) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Complete project re-build

### Patch Changes

- [#578](https://github.com/maildev/maildev/pull/578) [`a2eb3a1`](https://github.com/maildev/maildev/commit/a2eb3a1377095ca7e1f7b855211753cf1a050ba5) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Honor `port: 0` and expose the bound port on the programmatic API ([#567](https://github.com/maildev/maildev/issues/567)).

  Previously `new MailDev({ smtp: 0 })` was silently ignored — `options.port || DEFAULT_PORT` treated an explicit `0` as absent and fell back to 1025. It now uses `??`, so `0` requests an OS-assigned ephemeral port, and the port that was actually bound is read back from the listening socket.

  Both servers now expose their bound address:
  - `SMTPServer#getAddress()` → `{ host, port }` and `SMTPServer#getPort()`
  - `APIServer#getAddress()` → `{ host, port } | null` and `APIServer#getPort()` (null until listening)

  Together these let you run one MailDev per worker under a parallel test runner without hand-assigning ports.

- [#582](https://github.com/maildev/maildev/pull/582) [`f6ee0b5`](https://github.com/maildev/maildev/commit/f6ee0b5f245271eaa80d51c26b9fd8fcb590d2e1) Thanks [@dualfroz](https://github.com/dualfroz)! - Fix the URL that `replaceCidReferences` rewrites inline (CID) attachments to. It
  built `/email/:id/attachment/:file`, which matches no route: the attachment is
  served from `/api/email/:id/attachment/:file`, under the configured base path.
  The URL is now root-relative and includes both parts, so it resolves at the root
  and under a subpath such as `/mail`. A base path that resolves to the root (`/`)
  adds no prefix, so it can no longer produce a protocol-relative `//api/email/...`.

- [#588](https://github.com/maildev/maildev/pull/588) [`b4bcfe9`](https://github.com/maildev/maildev/commit/b4bcfe935b906412d2235ea85c4c34fb22c04b1f) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Fix inline (CID) attachment rewriting for mailparser-parsed mail ([#583](https://github.com/maildev/maildev/issues/583)).
  mailparser keeps the angle brackets from the `Content-ID` header in
  `attachment.contentId` (`<id@host>`) while the HTML references the bare
  `cid:id@host`, so `replaceCidReferences` never matched and inline parts that
  survive parsing (e.g. inline SVG, which mailparser does not inline as a data
  URI) rendered in the UI as broken `cid:` images. Content IDs are now
  normalized — angle brackets and surrounding whitespace stripped — both when
  matching and when storing parsed mail. Note: the generated attachment filename
  is hashed from the content ID, so filenames for new deliveries change;
  filenames are stored with each email so nothing else is affected.

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

- [#551](https://github.com/maildev/maildev/pull/551) [`fc7e584`](https://github.com/maildev/maildev/commit/fc7e58408d1b506692aff151307a15b8e6466e29) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Add a configurable maximum message size and reject oversized messages. A new `--max-message-size` option (env `MAILDEV_MAX_MESSAGE_SIZE`, default 50 MB) advertises the SMTP SIZE extension and refuses messages larger than the limit. The bytes forwarded to the parser are capped at the limit, so a malicious multipart message with a huge number of parts can no longer tie up the parser (addresses the unbounded MIME sibling-part fanout in [#531](https://github.com/maildev/maildev/issues/531)). Set to 0 to disable the limit.

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

- [`7af89ef`](https://github.com/maildev/maildev/commit/7af89ef830458c351609a82e192900f7e0d250a9) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Reject `start()` on an SMTP port conflict instead of crashing the process ([#568](https://github.com/maildev/maildev/issues/568)).

  When the SMTP port was unavailable (e.g. `EADDRINUSE`), the error arrived via the server's `error` event and was re-thrown from inside that callback. It escaped as an uncaught exception and took the process down, while `start()`'s promise stayed pending forever — a `try`/`catch` around `await start()` never saw it.

  Startup errors are now routed to the `start()` promise, so `await maildev.start()` rejects with the underlying error (e.g. `EADDRINUSE`) and the caller decides what to do. Runtime errors after startup remain observable via the `error` event, but a listener-less emitter is no longer fatal.

- Updated dependencies [[`c96f68f`](https://github.com/maildev/maildev/commit/c96f68fa21d5cd80106d67c472d64f7df0cc733a), [`e7bc086`](https://github.com/maildev/maildev/commit/e7bc0869aa0ab4ad74d9b5b83e8e8c936c465b34), [`42d3708`](https://github.com/maildev/maildev/commit/42d37085fe70ead4719a4f37f6f22b076d0fd45b), [`efba452`](https://github.com/maildev/maildev/commit/efba452978cab0b5ff8423f1cce880ec0dd7912e), [`8aafc97`](https://github.com/maildev/maildev/commit/8aafc979cc07ba2187262d72606dba24bd9cdfc6), [`f78e761`](https://github.com/maildev/maildev/commit/f78e76126e33f7392ff2de44faabbcc5b57ba90d)]:
  - @maildev/core@3.0.0

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
