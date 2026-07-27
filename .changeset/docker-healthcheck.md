---
'maildev': patch
---

Fix the Docker healthcheck so containers report healthy out of the box. A dedicated healthcheck entrypoint (`dist/bin/healthcheck.js`) now:

- probes `127.0.0.1` instead of `localhost`, so it no longer fails when `localhost` resolves to IPv6 (`::1`) while the web server binds IPv4 only (#537);
- falls back to a TCP check on the SMTP port when the web UI is disabled with `--disable-web`, instead of probing an endpoint that isn't there (#544);
- normalizes `MAILDEV_BASE_PATHNAME` so a trailing slash can't produce a `//` in the probe URL (#542).
