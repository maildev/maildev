---
'@maildev/smtp': patch
'maildev': patch
---

Add `--outgoing-ignore-tls` / `MAILDEV_OUTGOING_IGNORE_TLS` (`outgoingIgnoreTls`,
`ignoreTLS` on the relay config) to keep the outgoing relay connection on
cleartext even when the server advertises STARTTLS (#377).
