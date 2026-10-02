---
'@maildev/smtp': patch
'maildev': patch
---

Fail the relay when the outgoing server cannot be reached. The connection
error was only logged, so the relay never finished: with auto-relay on, the
SMTP client sending to MailDev never got its reply, and the manual relay
request never answered.
