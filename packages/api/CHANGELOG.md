# @maildev/api

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
