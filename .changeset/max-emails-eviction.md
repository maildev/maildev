---
'@maildev/core': patch
'@maildev/smtp': patch
'maildev': patch
---

Add an opt-in maxEmails limit that also bounds the mail directory

An opt-in `maxEmails` limit (default `0` = unlimited; set `--max-emails` to cap)
discards the oldest emails along with their `.eml` files and attachments, so both
memory and the mail directory can be kept bounded. When set, leftover files from
earlier runs are trimmed at startup. The default keeps MailDev's historical
unbounded behaviour, so persisted mail stays durable across restarts (no data
loss by default).

Breaking change:

- `@maildev/core`: `Storage` implementations must now provide `onEvicted`. A new
  `EvictHandler` type and `mapLimit` helper are exported.
