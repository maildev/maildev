# @maildev/api

## 3.0.0

### Major Changes

- [#525](https://github.com/maildev/maildev/pull/525) [`8aafc97`](https://github.com/maildev/maildev/commit/8aafc979cc07ba2187262d72606dba24bd9cdfc6) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Complete project re-build

### Patch Changes

- [#539](https://github.com/maildev/maildev/pull/539) [`5d79197`](https://github.com/maildev/maildev/commit/5d791973089d556b482d04abdfe5ceb4206072ca) Thanks [@IFtech-A](https://github.com/IFtech-A)! - Add a bulk delete endpoint for deleting multiple emails by ID.

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

- [`4b515c6`](https://github.com/maildev/maildev/commit/4b515c6e55ca4f55bdb8535baa7164b375a3e0e7) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Fix the integrated MCP HTTP transport (`maildev --mcp`) so it supports more than
  one session. Each session now gets its own MCP server instance instead of
  sharing a single one, which previously made the second client fail to connect
  with "Already connected to a transport." Requests carrying an unknown session ID
  now return a proper JSON-RPC error, and open MCP sessions are closed on shutdown.

- [#555](https://github.com/maildev/maildev/pull/555) [`196f277`](https://github.com/maildev/maildev/commit/196f2773076e55e4bdcfd193ede6831225626366) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Serve the web UI / REST API over HTTPS when `--https` (with `--https-cert` and
  `--https-key`) is set. The Fastify server now actually honors these options —
  previously the flags existed but the web server always served plain HTTP. HTTPS
  can also be configured via `MAILDEV_HTTPS`, `MAILDEV_HTTPS_CERT`, and
  `MAILDEV_HTTPS_KEY`, and the Docker healthcheck detects `MAILDEV_HTTPS` and
  probes over HTTPS so TLS-enabled containers report healthy.

- [`e7bc086`](https://github.com/maildev/maildev/commit/e7bc0869aa0ab4ad74d9b5b83e8e8c936c465b34) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Make in-memory storage O(1) so large inboxes stay responsive

  The array-backed store made ingest and mark-all-read quadratic, so a large
  inbox became slow to fill and slow to clear. `MemoryStorage` is now backed by an
  insertion-ordered `Map`, making `getById`, `save` and `delete` O(1), with the
  unread count maintained incrementally so `stats()` never has to scan.

  Breaking change:
  - `@maildev/core`: `Storage` implementations must now provide `markAllRead` and
    `stats`. A new `StorageStats` type is exported.

- Updated dependencies [[`c96f68f`](https://github.com/maildev/maildev/commit/c96f68fa21d5cd80106d67c472d64f7df0cc733a), [`a2eb3a1`](https://github.com/maildev/maildev/commit/a2eb3a1377095ca7e1f7b855211753cf1a050ba5), [`f6ee0b5`](https://github.com/maildev/maildev/commit/f6ee0b5f245271eaa80d51c26b9fd8fcb590d2e1), [`b4bcfe9`](https://github.com/maildev/maildev/commit/b4bcfe935b906412d2235ea85c4c34fb22c04b1f), [`e7bc086`](https://github.com/maildev/maildev/commit/e7bc0869aa0ab4ad74d9b5b83e8e8c936c465b34), [`42d3708`](https://github.com/maildev/maildev/commit/42d37085fe70ead4719a4f37f6f22b076d0fd45b), [`fc7e584`](https://github.com/maildev/maildev/commit/fc7e58408d1b506692aff151307a15b8e6466e29), [`efba452`](https://github.com/maildev/maildev/commit/efba452978cab0b5ff8423f1cce880ec0dd7912e), [`8aafc97`](https://github.com/maildev/maildev/commit/8aafc979cc07ba2187262d72606dba24bd9cdfc6), [`f78e761`](https://github.com/maildev/maildev/commit/f78e76126e33f7392ff2de44faabbcc5b57ba90d), [`7af89ef`](https://github.com/maildev/maildev/commit/7af89ef830458c351609a82e192900f7e0d250a9)]:
  - @maildev/core@3.0.0
  - @maildev/mcp@3.0.0
  - @maildev/smtp@3.0.0

## 3.0.0-rc.3

### Patch Changes

- 4b515c6: Fix the integrated MCP HTTP transport (`maildev --mcp`) so it supports more than
  one session. Each session now gets its own MCP server instance instead of
  sharing a single one, which previously made the second client fail to connect
  with "Already connected to a transport." Requests carrying an unknown session ID
  now return a proper JSON-RPC error, and open MCP sessions are closed on shutdown.
  - @maildev/core@3.0.0-rc.3
  - @maildev/smtp@3.0.0-rc.3
  - @maildev/mcp@3.0.0-rc.3

## 3.0.0-rc.2

### Patch Changes

- 5d79197: Add a bulk delete endpoint for deleting multiple emails by ID.
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

- 196f277: Serve the web UI / REST API over HTTPS when `--https` (with `--https-cert` and
  `--https-key`) is set. The Fastify server now actually honors these options —
  previously the flags existed but the web server always served plain HTTP. HTTPS
  can also be configured via `MAILDEV_HTTPS`, `MAILDEV_HTTPS_CERT`, and
  `MAILDEV_HTTPS_KEY`, and the Docker healthcheck detects `MAILDEV_HTTPS` and
  probes over HTTPS so TLS-enabled containers report healthy.
- e7bc086: Make in-memory storage O(1) so large inboxes stay responsive

  The array-backed store made ingest and mark-all-read quadratic, so a large
  inbox became slow to fill and slow to clear. `MemoryStorage` is now backed by an
  insertion-ordered `Map`, making `getById`, `save` and `delete` O(1), with the
  unread count maintained incrementally so `stats()` never has to scan.

  Breaking change:
  - `@maildev/core`: `Storage` implementations must now provide `markAllRead` and
    `stats`. A new `StorageStats` type is exported.

- Updated dependencies [c96f68f]
- Updated dependencies [e7bc086]
- Updated dependencies [42d3708]
- Updated dependencies [fc7e584]
  - @maildev/core@3.0.0-rc.2
  - @maildev/mcp@3.0.0-rc.2
  - @maildev/smtp@3.0.0-rc.2

## 3.0.0-rc.1

### Major Changes

- Complete project re-build

### Patch Changes

- Updated dependencies
  - @maildev/core@3.0.0-rc.1
  - @maildev/smtp@3.0.0-rc.1
  - @maildev/mcp@3.0.0-rc.1
