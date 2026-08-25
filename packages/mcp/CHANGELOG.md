# @maildev/mcp

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
