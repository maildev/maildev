# @maildev/ui

## 3.0.0

### Major Changes

- [#525](https://github.com/maildev/maildev/pull/525) [`8aafc97`](https://github.com/maildev/maildev/commit/8aafc979cc07ba2187262d72606dba24bd9cdfc6) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Complete project re-build

### Patch Changes

- [#577](https://github.com/maildev/maildev/pull/577) [`3b7811d`](https://github.com/maildev/maildev/commit/3b7811dcd46316d587718ff5134632d4e9146cec) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Restore v2's lighter-weight email deletion UX. "Delete all emails" no longer
  opens a blocking confirmation dialog — the first click arms the button (it turns
  red and slides open to "Confirm") and a second click within 2 seconds clears the
  inbox, otherwise it resets. Deleting a single email now happens immediately on
  click without a prompt, matching v2. Clearing the inbox also resets the reading
  pane so a deleted email no longer lingers on screen.

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

- [#538](https://github.com/maildev/maildev/pull/538) [`b8462db`](https://github.com/maildev/maildev/commit/b8462db79ec2153267770cf4bad01fc237c7af25) Thanks [@IFtech-A](https://github.com/IFtech-A)! - Fix HTML email previews so long rendered content can scroll to the footer.

- [#553](https://github.com/maildev/maildev/pull/553) [`41cfcae`](https://github.com/maildev/maildev/commit/41cfcaefa8a2b62164daca65f1cb9c1015534000) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Fix HTML email preview iframe sizing on viewport change. Switching the preview
  viewport previously left it permanently broken — the iframe stopped resizing to
  its content (tall emails were clipped and the footer became unreachable) and
  in-iframe keyboard shortcuts stopped forwarding — because the resize observers
  and listeners were torn down and never re-attached. They are now kept in place
  across viewport changes and the height is re-measured for the new width.

- [#579](https://github.com/maildev/maildev/pull/579) [`f8dc693`](https://github.com/maildev/maildev/commit/f8dc69352ed0e5a5cec600b18ec43f2d41d6fc91) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Show relay delivery status in the email viewer

  The email viewer header now shows a "Relayed to …" line with the recipients and
  time once a message has been relayed, so it's clear at a glance whether (and
  where) an email was delivered. Relaying from the UI now refreshes the open email
  immediately so the status appears without waiting for the next poll.

- [#552](https://github.com/maildev/maildev/pull/552) [`7dd67c6`](https://github.com/maildev/maildev/commit/7dd67c6ea9b3b905f948b889f92e9c0bd4fa1545) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Make the top loading bar less disruptive and improve DOM testability.
  - The loading bar shown during background refreshes is now kept mounted and toggled via opacity instead of being added to and removed from the DOM every poll cycle, so it no longer causes a reflow every few seconds. A new "Show loading bar" toggle in Settings lets you turn it off entirely.
  - Added stable `data-testid` attributes to key elements (header actions, search input, email list and rows — including `data-email-id` — the email viewer, subject, attachments, and the loading bar) so automated UI tests no longer need to rely on fragile positional selectors.

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
