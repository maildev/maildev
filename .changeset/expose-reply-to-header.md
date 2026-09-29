---
'@maildev/core': patch
'@maildev/smtp': patch
---

Expose the `Reply-To` header as `email.replyTo` on stored emails and the REST API (#230).

mailparser already parses `Reply-To` as an address list; MailDev mapped `In-Reply-To` only, so clients had to read the raw `headers['reply-to']` string.
