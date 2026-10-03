---
'maildev': patch
---

Parse `MAILDEV_HTTPS` as a boolean (#294). It was passed through as the raw
string, so `MAILDEV_HTTPS=false` still enabled HTTPS and startup failed asking
for `httpsCert` and `httpsKey`.
