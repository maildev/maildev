---
'@maildev/core': patch
'@maildev/api': patch
'@maildev/smtp': patch
'@maildev/mcp': patch
'@maildev/ui': patch
'maildev': patch
---

Keep MailDev responsive with tens of thousands of emails

Large inboxes previously made the app unusable: the web UI refetched every email
in full every five seconds (a 117 MB response at 10,000 emails, and heap
exhaustion beyond ~25,000), and the array-backed store made ingest and
mark-all-read quadratic.

- `MemoryStorage` is now backed by an insertion-ordered Map, making `getById`,
  `save` and `delete` O(1), with the unread count maintained incrementally.
- New `GET /api/email/summary` returns a bounded page of body-free summaries
  with server-side search, sorting and counts. The web interface uses it instead
  of refetching the whole inbox, renders one page at a time with infinite
  scroll, and coalesces socket updates so a burst of mail causes one refetch
  rather than one per message.
- An **opt-in** `maxEmails` limit (default `0` = unlimited; set `--max-emails`
  to cap) discards the oldest emails along with their `.eml` files and
  attachments, so both memory and the mail directory can be kept bounded. When
  set, leftover files from earlier runs are trimmed at startup. The default
  keeps MailDev's historical unbounded behaviour, so persisted mail stays
  durable across restarts (no data loss by default).

Breaking changes:

- `@maildev/core`: `Storage` implementations must now provide `list`,
  `listSummaries`, `markAllRead`, `stats` and `onEvicted`. A new `EmailSummary`
  type and `toSummary`/`mapLimit`/`matchesSearchTerm` helpers are exported.
- `@maildev/api`: the Socket.IO `newMail` event now carries an `EmailSummary`
  (no `html`/`text`/`headers`) instead of the full email — fetch
  `GET /api/email/:id` for the body.
