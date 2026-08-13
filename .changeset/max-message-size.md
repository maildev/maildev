---
'@maildev/smtp': patch
'maildev': patch
---

Add a configurable maximum message size and reject oversized messages. A new `--max-message-size` option (env `MAILDEV_MAX_MESSAGE_SIZE`, default 50 MB) advertises the SMTP SIZE extension and refuses messages larger than the limit. The bytes forwarded to the parser are capped at the limit, so a malicious multipart message with a huge number of parts can no longer tie up the parser (addresses the unbounded MIME sibling-part fanout in #531). Set to 0 to disable the limit.
