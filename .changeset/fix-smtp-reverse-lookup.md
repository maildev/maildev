---
'@maildev/smtp': patch
'maildev': patch
---

Skip the reverse DNS lookup of connecting SMTP clients (#104). The resolved
hostname was never used, and without a network the lookup held back the
greeting on every connection until it timed out.
