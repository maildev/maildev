---
'@maildev/smtp': patch
'maildev': patch
---

Reject `start()` on an SMTP port conflict instead of crashing the process (#568).

When the SMTP port was unavailable (e.g. `EADDRINUSE`), the error arrived via the server's `error` event and was re-thrown from inside that callback. It escaped as an uncaught exception and took the process down, while `start()`'s promise stayed pending forever — a `try`/`catch` around `await start()` never saw it.

Startup errors are now routed to the `start()` promise, so `await maildev.start()` rejects with the underlying error (e.g. `EADDRINUSE`) and the caller decides what to do. Runtime errors after startup remain observable via the `error` event, but a listener-less emitter is no longer fatal.
