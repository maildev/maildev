---
'@maildev/api': patch
'maildev': patch
---

Serve the web UI / REST API over HTTPS when `--https` (with `--https-cert` and
`--https-key`) is set. The Fastify server now actually honors these options —
previously the flags existed but the web server always served plain HTTP. HTTPS
can also be configured via `MAILDEV_HTTPS`, `MAILDEV_HTTPS_CERT`, and
`MAILDEV_HTTPS_KEY`, and the Docker healthcheck detects `MAILDEV_HTTPS` and
probes over HTTPS so TLS-enabled containers report healthy.
