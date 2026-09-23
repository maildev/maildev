# @maildev/mcp

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

- Updated dependencies [[`c96f68f`](https://github.com/maildev/maildev/commit/c96f68fa21d5cd80106d67c472d64f7df0cc733a), [`e7bc086`](https://github.com/maildev/maildev/commit/e7bc0869aa0ab4ad74d9b5b83e8e8c936c465b34), [`42d3708`](https://github.com/maildev/maildev/commit/42d37085fe70ead4719a4f37f6f22b076d0fd45b), [`efba452`](https://github.com/maildev/maildev/commit/efba452978cab0b5ff8423f1cce880ec0dd7912e), [`8aafc97`](https://github.com/maildev/maildev/commit/8aafc979cc07ba2187262d72606dba24bd9cdfc6), [`f78e761`](https://github.com/maildev/maildev/commit/f78e76126e33f7392ff2de44faabbcc5b57ba90d)]:
  - @maildev/core@3.0.0

## 3.0.0-rc.3

### Patch Changes

- @maildev/core@3.0.0-rc.3

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
