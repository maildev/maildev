# maildev

## 3.0.0

### Major Changes

- [#525](https://github.com/maildev/maildev/pull/525) [`8aafc97`](https://github.com/maildev/maildev/commit/8aafc979cc07ba2187262d72606dba24bd9cdfc6) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Complete project re-build

### Patch Changes

- [#550](https://github.com/maildev/maildev/pull/550) [`d34aaa3`](https://github.com/maildev/maildev/commit/d34aaa35227aa3edbd3b175e62c835babfdc6827) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Fix the Docker healthcheck so containers report healthy out of the box. A dedicated healthcheck entrypoint (`dist/bin/healthcheck.js`) now:
  - probes `127.0.0.1` instead of `localhost`, so it no longer fails when `localhost` resolves to IPv6 (`::1`) while the web server binds IPv4 only ([#537](https://github.com/maildev/maildev/issues/537));
  - falls back to a TCP check on the SMTP port when the web UI is disabled with `--disable-web`, instead of probing an endpoint that isn't there ([#544](https://github.com/maildev/maildev/issues/544));
  - normalizes `MAILDEV_BASE_PATHNAME` so a trailing slash can't produce a `//` in the probe URL ([#542](https://github.com/maildev/maildev/issues/542)).

- [#578](https://github.com/maildev/maildev/pull/578) [`a2eb3a1`](https://github.com/maildev/maildev/commit/a2eb3a1377095ca7e1f7b855211753cf1a050ba5) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Honor `port: 0` and expose the bound port on the programmatic API ([#567](https://github.com/maildev/maildev/issues/567)).

  Previously `new MailDev({ smtp: 0 })` was silently ignored — `options.port || DEFAULT_PORT` treated an explicit `0` as absent and fell back to 1025. It now uses `??`, so `0` requests an OS-assigned ephemeral port, and the port that was actually bound is read back from the listening socket.

  Both servers now expose their bound address:
  - `SMTPServer#getAddress()` → `{ host, port }` and `SMTPServer#getPort()`
  - `APIServer#getAddress()` → `{ host, port } | null` and `APIServer#getPort()` (null until listening)

  Together these let you run one MailDev per worker under a parallel test runner without hand-assigning ports.

- [#581](https://github.com/maildev/maildev/pull/581) [`0e79a6a`](https://github.com/maildev/maildev/commit/0e79a6ab43bac2f58b2b807af319a1a89cc5a323) Thanks [@cpruijsen](https://github.com/cpruijsen)! - Honor `MAILDEV_AUTO_RELAY` and `MAILDEV_AUTO_RELAY_RULES` so Docker and other
  env-based setups can enable auto-relay the same way `--auto-relay` and
  `--auto-relay-rules` do. `true`, `1`, and a present-but-empty value relay to
  each mail's own recipients; `false` and `0` disable; any other value is the
  override recipient.

- [`4b515c6`](https://github.com/maildev/maildev/commit/4b515c6e55ca4f55bdb8535baa7164b375a3e0e7) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Fix the integrated MCP HTTP transport (`maildev --mcp`) so it supports more than
  one session. Each session now gets its own MCP server instance instead of
  sharing a single one, which previously made the second client fail to connect
  with "Already connected to a transport." Requests carrying an unknown session ID
  now return a proper JSON-RPC error, and open MCP sessions are closed on shutdown.

- [#555](https://github.com/maildev/maildev/pull/555) [`196f277`](https://github.com/maildev/maildev/commit/196f2773076e55e4bdcfd193ede6831225626366) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Serve the web UI / REST API over HTTPS when `--https` (with `--https-cert` and
  `--https-key`) is set. The Fastify server now actually honors these options —
  previously the flags existed but the web server always served plain HTTP. HTTPS
  can also be configured via `MAILDEV_HTTPS`, `MAILDEV_HTTPS_CERT`, and
  `MAILDEV_HTTPS_KEY`, and the Docker healthcheck detects `MAILDEV_HTTPS` and
  probes over HTTPS so TLS-enabled containers report healthy.

- [`42d3708`](https://github.com/maildev/maildev/commit/42d37085fe70ead4719a4f37f6f22b076d0fd45b) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Add an opt-in maxEmails limit that also bounds the mail directory

  An opt-in `maxEmails` limit (default `0` = unlimited; set `--max-emails` to cap)
  discards the oldest emails along with their `.eml` files and attachments, so both
  memory and the mail directory can be kept bounded. When set, leftover files from
  earlier runs are trimmed at startup. The default keeps MailDev's historical
  unbounded behaviour, so persisted mail stays durable across restarts (no data
  loss by default).

  Breaking change:
  - `@maildev/core`: `Storage` implementations must now provide `onEvicted`. A new
    `EvictHandler` type and `mapLimit` helper are exported.

- [#551](https://github.com/maildev/maildev/pull/551) [`fc7e584`](https://github.com/maildev/maildev/commit/fc7e58408d1b506692aff151307a15b8e6466e29) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Add a configurable maximum message size and reject oversized messages. A new `--max-message-size` option (env `MAILDEV_MAX_MESSAGE_SIZE`, default 50 MB) advertises the SMTP SIZE extension and refuses messages larger than the limit. The bytes forwarded to the parser are capped at the limit, so a malicious multipart message with a huge number of parts can no longer tie up the parser (addresses the unbounded MIME sibling-part fanout in [#531](https://github.com/maildev/maildev/issues/531)). Set to 0 to disable the limit.

- [#579](https://github.com/maildev/maildev/pull/579) [`f78e761`](https://github.com/maildev/maildev/commit/f78e76126e33f7392ff2de44faabbcc5b57ba90d) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Record relay delivery status on the email. After a successful relay, the stored email now carries `relayedAt` (when it was last relayed) and `relayedTo` (the recipients it was delivered to), so the REST API can report whether a message was relayed and to which addresses. This hooks into the shared `relayEmail` path used by both auto-relay and the manual relay endpoint (closes [#199](https://github.com/maildev/maildev/issues/199)).

- [#549](https://github.com/maildev/maildev/pull/549) [`781cc0c`](https://github.com/maildev/maildev/commit/781cc0c9b0a8cfee24311d1135dd6fc4fd7df1e8) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Restore persisted emails on startup. When `--mail-directory` (`MAILDEV_MAIL_DIRECTORY`) is set, existing `.eml` files in the directory are now loaded back into the UI when MailDev starts, so mail survives a restart (e.g. across container/pod restarts with a mounted volume).

- [`7af89ef`](https://github.com/maildev/maildev/commit/7af89ef830458c351609a82e192900f7e0d250a9) Thanks [@djfarrelly](https://github.com/djfarrelly)! - Reject `start()` on an SMTP port conflict instead of crashing the process ([#568](https://github.com/maildev/maildev/issues/568)).

  When the SMTP port was unavailable (e.g. `EADDRINUSE`), the error arrived via the server's `error` event and was re-thrown from inside that callback. It escaped as an uncaught exception and took the process down, while `start()`'s promise stayed pending forever — a `try`/`catch` around `await start()` never saw it.

  Startup errors are now routed to the `start()` promise, so `await maildev.start()` rejects with the underlying error (e.g. `EADDRINUSE`) and the caller decides what to do. Runtime errors after startup remain observable via the `error` event, but a listener-less emitter is no longer fatal.

- Updated dependencies [[`5d79197`](https://github.com/maildev/maildev/commit/5d791973089d556b482d04abdfe5ceb4206072ca), [`3b7811d`](https://github.com/maildev/maildev/commit/3b7811dcd46316d587718ff5134632d4e9146cec), [`c96f68f`](https://github.com/maildev/maildev/commit/c96f68fa21d5cd80106d67c472d64f7df0cc733a), [`a2eb3a1`](https://github.com/maildev/maildev/commit/a2eb3a1377095ca7e1f7b855211753cf1a050ba5), [`f6ee0b5`](https://github.com/maildev/maildev/commit/f6ee0b5f245271eaa80d51c26b9fd8fcb590d2e1), [`b4bcfe9`](https://github.com/maildev/maildev/commit/b4bcfe935b906412d2235ea85c4c34fb22c04b1f), [`b8462db`](https://github.com/maildev/maildev/commit/b8462db79ec2153267770cf4bad01fc237c7af25), [`41cfcae`](https://github.com/maildev/maildev/commit/41cfcaefa8a2b62164daca65f1cb9c1015534000), [`4b515c6`](https://github.com/maildev/maildev/commit/4b515c6e55ca4f55bdb8535baa7164b375a3e0e7), [`196f277`](https://github.com/maildev/maildev/commit/196f2773076e55e4bdcfd193ede6831225626366), [`e7bc086`](https://github.com/maildev/maildev/commit/e7bc0869aa0ab4ad74d9b5b83e8e8c936c465b34), [`42d3708`](https://github.com/maildev/maildev/commit/42d37085fe70ead4719a4f37f6f22b076d0fd45b), [`fc7e584`](https://github.com/maildev/maildev/commit/fc7e58408d1b506692aff151307a15b8e6466e29), [`efba452`](https://github.com/maildev/maildev/commit/efba452978cab0b5ff8423f1cce880ec0dd7912e), [`8aafc97`](https://github.com/maildev/maildev/commit/8aafc979cc07ba2187262d72606dba24bd9cdfc6), [`f78e761`](https://github.com/maildev/maildev/commit/f78e76126e33f7392ff2de44faabbcc5b57ba90d), [`f8dc693`](https://github.com/maildev/maildev/commit/f8dc69352ed0e5a5cec600b18ec43f2d41d6fc91), [`7af89ef`](https://github.com/maildev/maildev/commit/7af89ef830458c351609a82e192900f7e0d250a9), [`7dd67c6`](https://github.com/maildev/maildev/commit/7dd67c6ea9b3b905f948b889f92e9c0bd4fa1545)]:
  - @maildev/api@3.0.0
  - @maildev/ui@3.0.0
  - @maildev/core@3.0.0
  - @maildev/mcp@3.0.0
  - @maildev/smtp@3.0.0

## 3.0.0-rc.3

### Patch Changes

- 4b515c6: Fix the integrated MCP HTTP transport (`maildev --mcp`) so it supports more than
  one session. Each session now gets its own MCP server instance instead of
  sharing a single one, which previously made the second client fail to connect
  with "Already connected to a transport." Requests carrying an unknown session ID
  now return a proper JSON-RPC error, and open MCP sessions are closed on shutdown.
- Updated dependencies [4b515c6]
  - @maildev/api@3.0.0-rc.3
  - @maildev/core@3.0.0-rc.3
  - @maildev/smtp@3.0.0-rc.3
  - @maildev/mcp@3.0.0-rc.3
  - @maildev/ui@3.0.0-rc.3

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
