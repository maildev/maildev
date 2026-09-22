---
'@maildev/smtp': patch
'@maildev/api': patch
---

Fix the URL that `replaceCidReferences` rewrites inline (CID) attachments to. It
built `/email/:id/attachment/:file`, which matches no route: the attachment is
served from `/api/email/:id/attachment/:file`, under the configured base path.
The URL is now root-relative and includes both parts, so it resolves at the root
and under a subpath such as `/mail`. A base path that resolves to the root (`/`)
adds no prefix, so it can no longer produce a protocol-relative `//api/email/...`.
