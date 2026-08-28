---
'@maildev/ui': patch
---

Show relay delivery status in the email viewer

The email viewer header now shows a "Relayed to …" line with the recipients and
time once a message has been relayed, so it's clear at a glance whether (and
where) an email was delivered. Relaying from the UI now refreshes the open email
immediately so the status appears without waiting for the next poll.
