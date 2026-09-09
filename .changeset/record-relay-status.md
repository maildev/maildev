---
'@maildev/core': patch
'@maildev/smtp': patch
'maildev': patch
---

Record relay delivery status on the email. After a successful relay, the stored email now carries `relayedAt` (when it was last relayed) and `relayedTo` (the recipients it was delivered to), so the REST API can report whether a message was relayed and to which addresses. This hooks into the shared `relayEmail` path used by both auto-relay and the manual relay endpoint (closes #199).
