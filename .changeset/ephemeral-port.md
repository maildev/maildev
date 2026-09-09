---
'@maildev/smtp': patch
'@maildev/api': patch
'maildev': patch
---

Honor `port: 0` and expose the bound port on the programmatic API (#567).

Previously `new MailDev({ smtp: 0 })` was silently ignored — `options.port || DEFAULT_PORT` treated an explicit `0` as absent and fell back to 1025. It now uses `??`, so `0` requests an OS-assigned ephemeral port, and the port that was actually bound is read back from the listening socket.

Both servers now expose their bound address:

- `SMTPServer#getAddress()` → `{ host, port }` and `SMTPServer#getPort()`
- `APIServer#getAddress()` → `{ host, port } | null` and `APIServer#getPort()` (null until listening)

Together these let you run one MailDev per worker under a parallel test runner without hand-assigning ports.
