# @maildev/ui

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

- b8462db: Fix HTML email previews so long rendered content can scroll to the footer.
- 41cfcae: Fix HTML email preview iframe sizing on viewport change. Switching the preview
  viewport previously left it permanently broken — the iframe stopped resizing to
  its content (tall emails were clipped and the footer became unreachable) and
  in-iframe keyboard shortcuts stopped forwarding — because the resize observers
  and listeners were torn down and never re-attached. They are now kept in place
  across viewport changes and the height is re-measured for the new width.
- 7dd67c6: Make the top loading bar less disruptive and improve DOM testability.
  - The loading bar shown during background refreshes is now kept mounted and toggled via opacity instead of being added to and removed from the DOM every poll cycle, so it no longer causes a reflow every few seconds. A new "Show loading bar" toggle in Settings lets you turn it off entirely.
  - Added stable `data-testid` attributes to key elements (header actions, search input, email list and rows — including `data-email-id` — the email viewer, subject, attachments, and the loading bar) so automated UI tests no longer need to rely on fragile positional selectors.

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
