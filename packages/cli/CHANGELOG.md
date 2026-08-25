# maildev

## 3.0.0-rc.2

### Patch Changes

- d34aaa3: Fix the Docker healthcheck so containers report healthy out of the box. A dedicated healthcheck entrypoint (`dist/bin/healthcheck.js`) now:
  - probes `127.0.0.1` instead of `localhost`, so it no longer fails when `localhost` resolves to IPv6 (`::1`) while the web server binds IPv4 only (#537);
  - falls back to a TCP check on the SMTP port when the web UI is disabled with `--disable-web`, instead of probing an endpoint that isn't there (#544);
  - normalizes `MAILDEV_BASE_PATHNAME` so a trailing slash can't produce a `//` in the probe URL (#542).

- 196f277: Serve the web UI / REST API over HTTPS when `--https` (with `--https-cert` and
  `--https-key`) is set. The Fastify server now actually honors these options —
  previously the flags existed but the web server always served plain HTTP. HTTPS
  can also be configured via `MAILDEV_HTTPS`, `MAILDEV_HTTPS_CERT`, and
  `MAILDEV_HTTPS_KEY`, and the Docker healthcheck detects `MAILDEV_HTTPS` and
  probes over HTTPS so TLS-enabled containers report healthy.
- 42d3708: Add an opt-in maxEmails limit that also bounds the mail directory

  An opt-in `maxEmails` limit (default `0` = unlimited; set `--max-emails` to cap)
  discards the oldest emails along with their `.eml` files and attachments, so both
  memory and the mail directory can be kept bounded. When set, leftover files from
  earlier runs are trimmed at startup. The default keeps MailDev's historical
  unbounded behaviour, so persisted mail stays durable across restarts (no data
  loss by default).

  Breaking change:
  - `@maildev/core`: `Storage` implementations must now provide `onEvicted`. A new
    `EvictHandler` type and `mapLimit` helper are exported.

- fc7e584: Add a configurable maximum message size and reject oversized messages. A new `--max-message-size` option (env `MAILDEV_MAX_MESSAGE_SIZE`, default 50 MB) advertises the SMTP SIZE extension and refuses messages larger than the limit. The bytes forwarded to the parser are capped at the limit, so a malicious multipart message with a huge number of parts can no longer tie up the parser (addresses the unbounded MIME sibling-part fanout in #531). Set to 0 to disable the limit.
- 781cc0c: Restore persisted emails on startup. When `--mail-directory` (`MAILDEV_MAIL_DIRECTORY`) is set, existing `.eml` files in the directory are now loaded back into the UI when MailDev starts, so mail survives a restart (e.g. across container/pod restarts with a mounted volume).
- Updated dependencies [5d79197]
- Updated dependencies [c96f68f]
- Updated dependencies [b8462db]
- Updated dependencies [41cfcae]
- Updated dependencies [196f277]
- Updated dependencies [e7bc086]
- Updated dependencies [42d3708]
- Updated dependencies [fc7e584]
- Updated dependencies [7dd67c6]
  - @maildev/api@3.0.0-rc.2
  - @maildev/core@3.0.0-rc.2
  - @maildev/mcp@3.0.0-rc.2
  - @maildev/ui@3.0.0-rc.2
  - @maildev/smtp@3.0.0-rc.2

## 3.0.0-rc.1

### Major Changes

- Complete project re-build

### Patch Changes

- Updated dependencies
  - @maildev/core@3.0.0-rc.1
  - @maildev/smtp@3.0.0-rc.1
  - @maildev/api@3.0.0-rc.1
  - @maildev/mcp@3.0.0-rc.1
  - @maildev/ui@3.0.0-rc.1
