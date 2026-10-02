---
'@maildev/smtp': patch
'maildev': patch
---

Close the raw `.eml` stream when a relay does not send it (#423). Every relay
that ended without sending (no recipients left after the auto-relay rules, or
an error from the outgoing server) kept one file descriptor open, so a
long-running instance eventually hit the descriptor limit and auto-relay
stopped working.
