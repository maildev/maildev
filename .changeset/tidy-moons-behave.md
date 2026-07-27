---
'@maildev/core': major
'@maildev/smtp': major
'@maildev/api': major
'maildev': major
'@maildev/mcp': major
'@maildev/ui': major
---

Keep MailDev responsive with tens of thousands of emails

Large inboxes previously made the app unusable, with no way back other than
deleting the mail directory and restarting.

- `MemoryStorage` is now backed by an insertion-ordered Map, making `getById`,
  `save` and `delete` O(1). Saving and marking all as read were quadratic.
- A new `maxEmails` limit (default 1000, `--max-emails 0` to disable) discards
  the oldest emails along with their `.eml` files and attachments, so neither
  memory nor the mail directory grows without bound. Leftover files from earlier
  runs are trimmed at startup.
- New `GET /api/email/summary` returns a bounded page of summaries with
  server-side search, sorting and counts. The web interface uses it instead of
  refetching every email in full every five seconds — at 10,000 emails that
  request produced a 117 MB response, and beyond ~25,000 it exhausted the heap.
- The email list renders one page at a time and loads more on scroll; socket
  updates are coalesced so a burst of mail causes one refetch rather than one
  per message.
- `Storage` implementations must now provide `list`, `listSummaries`,
  `markAllRead`, `stats` and `onEvicted`.
