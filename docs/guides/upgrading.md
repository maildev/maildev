# Upgrading from 2.x to 3.0
Source: https://maildev.github.io/maildev/docs/guides/upgrading/
Section: Guides

Move a MailDev 2.x setup to 3.0 — what needs Node 20+, what changed for the CLI, the REST API, the programmatic API, and Docker, and what did not change at all.

MailDev 3.0 is a complete rewrite: TypeScript instead of JavaScript, a React
inbox instead of Angular, Fastify instead of Express, and a monorepo of focused
packages behind the same `maildev` CLI. The parts most people touch — the
command line, the ports, the SMTP behavior — carried over deliberately. The
programmatic and REST APIs did not.

How much work this is depends on how you use MailDev:

| You use MailDev via | Upgrade work |
| --- | --- |
| The CLI or Docker | Almost none — install the new version. Node.js 20+ for npm. |
| The REST API from tests | Retarget URLs to the new `/api` prefix and check payloads |
| The programmatic API | Rewrite callbacks as promises; events and method names moved |

There is a way back from every step below — see
[Rolling back](#rolling-back).

## Hand it to a coding agent

Every page of this site is also plain markdown at a stable URL, which is the
form a coding agent wants. Paste the prompt below into Claude Code, Cursor,
Codex, or your agent of choice. It fetches the guide first, then sweeps the
project against it — deliberately limited to what the migration requires:

```text
My project uses MailDev 2.x. Upgrade it to MailDev 3.0.

Read the official upgrade guide first — it is the source of truth for every
change below, and consult it again before any edit it covers:

https://maildev.github.io/maildev/docs/guides/upgrading.md

If you cannot fetch URLs, run this and read the file it writes:
curl -fsSL https://maildev.github.io/maildev/docs/guides/upgrading.md -o /tmp/maildev-upgrade.md

What to sweep:

1. Node.js version. 3.0 needs Node 20+ everywhere MailDev runs (local, CI,
   containers). If anything is older, stop and report — that is a hard
   requirement, not something to work around.
2. Installs and startup: package.json and lockfile, npm/pnpm/yarn scripts,
   docker-compose.yml, Dockerfiles, CI service containers. End at
   maildev@^3 / the current maildev/maildev image.
3. Programmatic API call sites: require("maildev"), .listen(, .close(,
   .getAllEmail(, .relayMail(, .on("new", ...). Convert per the guide's
   "Programmatic API changes" section: ESM (or dynamic import from CJS),
   await start()/stop(), and events on the SMTP server returned by start().
4. REST API callers in code and tests: every route moved under /api
   (GET /email -> GET /api/email, /healthz -> /api/healthz, ...). Re-check
   response handling against the payload notes in the guide.
5. Configuration. CLI flags keep working, but MAILDEV_HIDE_EXTENSIONS,
   MAILDEV_INCOMING_CERT, and MAILDEV_INCOMING_KEY were removed — replace
   them with flags or a config file. If a script or container sets --ip to
   keep the web UI private, add --web-ip with the same address: 3.0's web
   server defaults to 0.0.0.0 regardless of --ip.

Rules:
- Change only what the migration requires. Keep ports, hostnames, and
  existing flags exactly as they are.
- If the project sends messages larger than 50 MB, set --max-message-size 0
  or a higher limit — 3.0 rejects bigger messages by default.
- Do not guess. Anything ambiguous goes in a "Needs a human" list instead of
  a speculative edit.

Definition of done — verify each:
- maildev --version prints 3.x
- no require("maildev") and no .listen( / .close( call sites remain
- no REST calls to routes missing the /api prefix
- none of the removed MAILDEV_* environment variables remain in any config
- MailDev starts and curl http://localhost:1080/api/healthz returns 200
- the project's test suite passes, if it has one

Report at the end: every file you changed, the "Needs a human" list, and
anything you could not verify.
```

:::tip
Once the project is on 3.0, the same agent can read the inbox itself: start
MailDev with `--mcp` and connect the agent to the
[MCP server](https://maildev.github.io/maildev/docs/ai/mcp/). "Did the signup email arrive?" becomes a step the
agent does instead of one you do — the
[Claude Code walkthrough](https://maildev.github.io/maildev/docs/ai/claude-code/) shows the full loop.
:::

## Install the new version

### npm

Node.js **20 or newer** is required (2.x needed 18). If `node -v` prints
something older, upgrade Node first — 2.x keeps working on it in the meantime.

```console
npm install -g maildev@3
```

Or, for a pinned devDependency (the better shape for CI):

```console
npm install --save-dev maildev@^3
```

`npx maildev` needs no action — it resolves the latest published version every
run, as long as your Node is new enough.

### Docker

```console
docker pull maildev/maildev
```

`latest` tracks the 3.0 line. If your Compose file pins a tag, move it from
`2.x.y` to `3.0.0` — or better, leave it unpinned and read the
[Docker guide](https://maildev.github.io/maildev/docs/guides/docker/) on the health check and volume mounting.

### Verify

```console
maildev --version
```

And with it running, the health endpoint — note that it moved from `/healthz`
to `/api/healthz` in 3.0:

```console
curl http://localhost:1080/api/healthz
```

## What did not change

- **Ports.** SMTP on `1025`, web on `1080`, same `--smtp`/`--web` flags and
  `MAILDEV_SMTP_PORT`/`MAILDEV_WEB_PORT` variables.
- **CLI flags.** Every flag 2.x implemented still works with the same names and
  defaults. (The 2.x README documented `-o, --open`, but no 2.x release ever
  implemented it; it is gone from the docs in 3.0.)
- **SMTP behavior.** Same listener, same authentication flags, same
  `--hide-extensions` switch.
- **Persistence.** `--mail-directory` still stores mail on disk and restores it
  on startup — now reliably, with an optional `--max-emails` cap.
- **Relay.** The `--outgoing-*` flags, `--auto-relay`, and rules files work as
  before.
- **The web inbox URL.** Same port, same UI purpose — a rewritten React
  interface at the same address.
- **Socket.IO.** The live-update endpoint is still at `/socket.io`, though its
  payloads changed — see [REST API changes](#rest-api-changes).

## CLI and environment changes

Two new defaults can surprise an existing setup:

:::warn
**Large messages are now rejected.** 2.x accepted messages of any size; 3.0
refuses anything over 50 MB with an SMTP error. If you mail huge fixtures,
raise or disable the limit with `--max-message-size 0`.
:::

:::warn
**The web server no longer follows `--ip`.** 2.x bound the web UI to the SMTP
bind address when `--web-ip` was not given; 3.0 always defaults the web server
to `0.0.0.0`. If you used `--ip 127.0.0.1` to keep the UI off your network, add
`--web-ip 127.0.0.1` as well.
:::

A few 2.x environment variables are gone — their flags still work, and a
[configuration file](https://maildev.github.io/maildev/docs/reference/cli/) is the better
home for them anyway, especially in Docker:

| 2.x environment variable | In 3.0 |
| --- | --- |
| `MAILDEV_HIDE_EXTENSIONS` | Removed — pass `--hide-extensions` or use a config file |
| `MAILDEV_INCOMING_CERT` | Removed — pass `--incoming-cert` or use a config file |
| `MAILDEV_INCOMING_KEY` | Removed — pass `--incoming-key` or use a config file |

`MAILDEV_AUTO_RELAY` and `MAILDEV_AUTO_RELAY_RULES` work as they did in 2.x,
and 3.0 adds `MAILDEV_VERBOSE`, `MAILDEV_SILENT`, and the new options below.
Run `maildev init` to scaffold a configuration file with the common settings.

| Addition | Environment variable | Notes |
| --- | --- | --- |
| `--max-emails <count>` | `MAILDEV_MAX_EMAILS` | Cap the store; the oldest messages and their files are evicted |
| `--max-message-size <bytes>` | `MAILDEV_MAX_MESSAGE_SIZE` | Reject larger messages. Default 50 MB; `0` disables |
| `--mcp` | `MAILDEV_MCP` | Serve the [MCP endpoint](https://maildev.github.io/maildev/docs/ai/mcp/) at `/mcp` |
| `--config <path>` | — | Load a specific configuration file |
| `maildev init` | — | Scaffold a configuration file |

## Programmatic API changes

This is where upgrades take real work. 3.0 is **ESM-only** and
**promise-based**; 2.x was CommonJS with error-first callbacks.

### Importing

`require('maildev')` no longer works. Either move the file to ESM:

```ts
import { MailDev } from 'maildev'
```

or keep the CommonJS file and import dynamically:

```js
// Inside an async function
const { MailDev } = await import('maildev')
```

Types are published now, so editors get the option and return shapes without a
`.d.ts` hunt.

### Lifecycle, events, and methods

`listen()` and `close()` became `start()` and `stop()`, returning promises.
The event emitter moved too: in 2.x the `MailDev` instance emitted `new` and
`delete`; in 3.0 those events are on the SMTP server that `start()` returns.

**2.x:**

```js
const MailDev = require('maildev')

const maildev = new MailDev({ smtp: 1025 })

maildev.listen(function (err) {
  if (err) throw err
  console.log('MailDev running')
})

maildev.on('new', function (email) {
  console.log('Received:', email.subject)
})

maildev.getAllEmail(function (err, emails) {
  console.log('Total:', emails.length)
})

// ...and on shutdown:
maildev.close(function () { process.exit(0) })
```

**3.0:**

```ts
import { MailDev } from 'maildev'

const maildev = new MailDev({ smtp: 1025 })

const { smtp } = await maildev.start()
console.log('MailDev running')

smtp.on('new', (email) => {
  console.log('Received:', email.subject)
})

const emails = await smtp.getAllEmails()
console.log('Total:', emails.length)

// ...and on shutdown:
await maildev.stop()
```

Method mapping, with the event names (`new`, `delete`, `error`, `close`) and
the email object shape unchanged:

| 2.x | 3.0 |
| --- | --- |
| `maildev.listen(cb)` | `await maildev.start()` — resolves with `{ smtp, storage, api }` |
| `maildev.close(cb)` | `await maildev.stop()` |
| `maildev.on('new', cb)` | `smtp.on('new', cb)` — on the returned SMTP server |
| `maildev.getAllEmail(cb)` | `await smtp.getAllEmails()` |
| `maildev.getEmail(id, cb)` | `await smtp.getEmail(id)` |
| `maildev.getRawEmail(id, cb)` | `await smtp.getRawEmail(id)` — still a readable stream |
| `maildev.deleteEmail(id, cb)` | `await smtp.deleteEmail(id)` |
| `maildev.deleteAllEmail(cb)` | `await smtp.deleteAllEmails()` |
| `maildev.getEmailAttachment(id, filename, cb)` | `await smtp.getEmailAttachment(id, filename)` — resolves `{ contentType, stream }` instead of passing them to the callback |
| `maildev.relayMail(idOrEmail, cb)` | `await smtp.relayEmail(idOrEmail)` |
| `maildev.setAutoRelayMode(enabled, rules)` | `new MailDev({ autoRelay, autoRelayRules })` — set it at construction instead of mid-run |
| — | `await smtp.markAllRead()` — new in 3.0 |

The [programmatic API reference](https://maildev.github.io/maildev/docs/reference/node-api/) documents the full
v3 surface, including the storage interface behind `servers.storage` and the
underlying `@maildev/core`, `@maildev/smtp`, and `@maildev/api` packages if you
want to compose your own server.

## REST API changes

Every route moved under an `/api` prefix. The paths otherwise keep their shape,
and 3.0 adds pagination, search, bulk delete, and mark-all-read:

| 2.x | 3.0 |
| --- | --- |
| `GET /email` | `GET /api/email` — now accepts `skip`, `limit`, `sort`, and field filters |
| — | `GET /api/email/summary` — new: paginated summaries without bodies |
| `GET /email/:id` | `GET /api/email/:id` |
| `DELETE /email/:id` | `DELETE /api/email/:id` |
| `DELETE /email/all` | `DELETE /api/email/all` |
| — | `POST /api/email/delete` — new: delete a set of ids in one call |
| — | `PATCH /api/email/read-all` — new |
| `GET /email/:id/html` | `GET /api/email/:id/html` |
| — | `GET /api/email/:id/source` and `GET /api/email/:id/download` — new |
| `GET /email/:id/attachment/:filename` | `GET /api/email/:id/attachment/:filename` |
| `POST /email/:id/relay` | `POST /api/email/:id/relay/:relayTo?` — optional recipient override |
| `GET /config` | `GET /api/config` |
| `GET /healthz` | `GET /api/healthz` — update health checks that probe the old path |

The full list, with the pagination and filtering parameters, is in the
[REST API reference](https://maildev.github.io/maildev/docs/reference/rest-api/).

Payload changes worth checking in any code that reads responses:

- **Attachments** are serialized cleanly now: `filename` (2.x mixed in
  `fileName`), an explicit `size`, and no more leaked `stream` objects or
  `checksum` fields.
- **Socket.IO events.** `newMail` now carries a summary — the same shape as
  `GET /api/email/summary` items, without `html`, `text`, or `headers` — where
  2.x sent the full email. Fetch the message by id when you need the body.
  `deleteMail` is now `{ id }` rather than the whole email object.

:::tip
Migrating a test helper that polls `GET /email`? Point it at
`GET /api/email/summary` with `limit` — it moves far less data than the full
listing and gives you `total` and `unread` for free. The
[CI guide](https://maildev.github.io/maildev/docs/guides/testing-in-ci/) is built around it.
:::

## Docker changes

The usage you know — `docker run -p 1080:1080 -p 1025:1025 maildev/maildev`,
flags after the image name — is unchanged. What moved:

- **Entrypoint.** `bin/maildev` became `node dist/bin/maildev.js`. Transparent
  unless you overrode the entrypoint yourself.
- **Health check.** The image still defines its own `HEALTHCHECK`, now probing
  `/api/healthz` via `node dist/bin/healthcheck.js`. If you wrote a custom
  health check against 2.x's `/healthz`, retarget it.
- **Rollback pin.** The last 2.x image is `maildev/maildev:2.2.1`.

The [Docker guide](https://maildev.github.io/maildev/docs/guides/docker/) covers Compose, the volume mount for
`--mail-directory`, and the built-in health check in full.

## Rolling back

Nothing in 3.0 destroys state that 2.x cannot read: with `--mail-directory`
set, both versions store mail as `.eml` files in the same layout, so a
downgrade picks your inbox back up.

```console
npm install -g maildev@2
```

For a devDependency, pin `"maildev": "^2"`; for Docker, pin
`maildev/maildev:2.2.1`.

If 3.0 breaks something that worked in 2.x — beyond the changes above — please
[open an issue](https://github.com/maildev/maildev/issues). The rewrite is
large, and the edges are exactly where reports help most.
