---
title: CLI & configuration
description: Every MailDev command-line flag, environment variable, and configuration-file key, with defaults and precedence rules.
ogTitle: MailDev CLI reference
permalink: /docs/reference/cli/
---

## Usage

```console
maildev [options]
maildev init [--force] [--json]
```

Configuration comes from four places. Later entries win:

1. Defaults
2. A configuration file
3. Environment variables
4. Command-line flags

## Scaffolding a config file

`maildev init` walks you through the common settings and writes a configuration
file in the current directory:

```console
maildev init
maildev init --force   # overwrite an existing file
maildev init --json    # write .maildevrc.json rather than prompting for a format
```

## Configuration files

Searched in the current directory and then each parent, first match wins:

| File | Format |
| --- | --- |
| `.maildevrc.json` | JSON |
| `maildev.config.ts` | TypeScript |
| `maildev.config.js` | CommonJS or ESM, depending on your `package.json` |
| `maildev.config.mjs` | ES module |

Point at a specific file with `--config <path>`.

```json
{
  "smtp": 1025,
  "web": 1080,
  "maxEmails": 200,
  "mailDirectory": "./tmp/mail",
  "mcp": true
}
```

Keys are the camelCase form of the flag name: `--base-pathname` is
`basePathname`, `--max-emails` is `maxEmails`.

## SMTP server

| Flag | Environment variable | Default | Description |
| --- | --- | --- | --- |
| `-s, --smtp <port>` | `MAILDEV_SMTP_PORT` | `1025` | Port the SMTP server listens on |
| `--ip <address>` | `MAILDEV_IP` | `::` | Address to bind the SMTP server to |
| `--incoming-user <user>` | `MAILDEV_INCOMING_USER` | — | Require this SMTP username |
| `--incoming-pass <password>` | `MAILDEV_INCOMING_PASS` | — | Require this SMTP password |
| `--incoming-secure` | `MAILDEV_INCOMING_SECURE` | off | Use implicit TLS on the SMTP listener |
| `--incoming-cert <path>` | — | — | TLS certificate for the SMTP listener |
| `--incoming-key <path>` | — | — | TLS key for the SMTP listener |
| `--hide-extensions <list>` | — | — | Comma-separated SMTP extensions not to advertise |
| `--max-message-size <bytes>` | `MAILDEV_MAX_MESSAGE_SIZE` | `52428800` | Reject messages larger than this. `0` disables the limit |

`--hide-extensions` accepts `STARTTLS`, `PIPELINING`, `8BITMIME`, and `SMTPUTF8`.
Hiding `STARTTLS` is the usual reason to reach for it — some clients upgrade
opportunistically and then fail, and not advertising the extension is easier than
fixing the client.

The default bind address `::` accepts both IPv6 and IPv4 connections on most
systems. If a client resolves `localhost` to `::1` and cannot connect, bind
explicitly with `--ip 0.0.0.0` or send to `127.0.0.1`.

See [HTTPS & TLS](/docs/guides/https/) for the certificate flags in context.

## Web UI, REST API, and MCP

All three are served by one process on one port.

| Flag | Environment variable | Default | Description |
| --- | --- | --- | --- |
| `-w, --web <port>` | `MAILDEV_WEB_PORT` | `1080` | Port for the web UI, REST API, and MCP endpoint |
| `--web-ip <address>` | `MAILDEV_WEB_IP` | `0.0.0.0` | Address to bind the web server to |
| `--web-user <user>` | `MAILDEV_WEB_USER` | — | HTTP basic auth username for the UI and API |
| `--web-pass <password>` | `MAILDEV_WEB_PASS` | — | HTTP basic auth password for the UI and API |
| `--base-pathname <path>` | `MAILDEV_BASE_PATHNAME` | `/` | Serve everything under this prefix |
| `--disable-web` | `MAILDEV_DISABLE_WEB` | off | Do not serve the web UI at all |
| `--https` | `MAILDEV_HTTPS` | off | Serve the web UI over TLS |
| `--https-key <path>` | `MAILDEV_HTTPS_KEY` | — | TLS private key for the web server |
| `--https-cert <path>` | `MAILDEV_HTTPS_CERT` | — | TLS certificate for the web server |

Setting `--web-user` and `--web-pass` puts HTTP basic auth in front of the UI and
the whole REST API. `/api/healthz` stays unauthenticated on purpose, so container
health checks keep working.

`--base-pathname /maildev` moves the UI, the API (`/maildev/api`), and the MCP
endpoint (`/maildev/mcp`) under that prefix. That is what you want behind a
reverse proxy — see [HTTPS & TLS](/docs/guides/https/) for an nginx example,
including the websocket headers the live inbox needs.

## Storage

| Flag | Environment variable | Default | Description |
| --- | --- | --- | --- |
| `--mail-directory <path>` | `MAILDEV_MAIL_DIRECTORY` | — | Persist mail to disk. In-memory only when unset |
| `--max-emails <count>` | `MAILDEV_MAX_EMAILS` | `0` | Keep at most this many messages. `0` means unlimited |

Without `--mail-directory`, messages live in memory and are gone when the process
exits. With it, messages are written as files and restored on startup — so
restarting MailDev keeps your inbox.

`--max-emails` bounds the store: once the limit is reached, the oldest message is
discarded, and its files with it. Worth setting whenever you persist to disk or
run a long test suite.

## Relay & auto-relay

MailDev can forward a caught message on to a real SMTP server — either on demand
from the UI and API, or automatically for everything it receives.

| Flag | Environment variable | Description |
| --- | --- | --- |
| `--outgoing-host <host>` | `MAILDEV_OUTGOING_HOST` | Relay host |
| `--outgoing-port <port>` | `MAILDEV_OUTGOING_PORT` | Relay port |
| `--outgoing-user <user>` | `MAILDEV_OUTGOING_USER` | Relay username |
| `--outgoing-pass <password>` | `MAILDEV_OUTGOING_PASS` | Relay password |
| `--outgoing-secure` | `MAILDEV_OUTGOING_SECURE` | Use TLS for the relay connection |
| `--auto-relay [email]` | — | Relay every message automatically, optionally overriding the recipient |
| `--auto-relay-rules <path>` | — | JSON file of allow/deny rules for auto-relay |

With only the `--outgoing-*` flags set, nothing is forwarded until you ask for it —
per message, from the UI or via
[`POST /api/email/:id/relay`](/docs/reference/rest-api/).

`--auto-relay` forwards everything as it arrives. Given an address
(`--auto-relay you@example.com`) it rewrites the recipient, which is how you get
every test message into one real inbox.

Rules narrow that down. **The last matching rule wins:**

```json
[
  { "allow": "*" },
  { "deny": "*@test.com" },
  { "allow": "ok@test.com" },
  { "deny": "*@utah.com" },
  { "allow": "johnny@utah.com" }
]
```

That relays everything except `@test.com` and `@utah.com` addresses, with
`ok@test.com` and `johnny@utah.com` allowed back through.

```console
maildev --outgoing-host smtp.gmail.com --outgoing-secure --outgoing-user you@gmail.com --outgoing-pass secret --auto-relay --auto-relay-rules relay-rules.json
```

:::warn
Auto-relay sends real email to real people. Rules are the only thing standing
between a test run and a customer's inbox — start from `{ "deny": "*" }` and
allow specific addresses, rather than the other way round.
:::

## MCP

| Flag | Environment variable | Default | Description |
| --- | --- | --- | --- |
| `--mcp` | `MAILDEV_MCP` | off | Serve the MCP endpoint at `/mcp` |

See [the MCP guide](/docs/ai/mcp/) for client configuration, and the standalone
`maildev-mcp` stdio server for desktop AI tools.

## Logging

| Flag | Environment variable | Default | Description |
| --- | --- | --- | --- |
| `-v, --verbose` | `MAILDEV_VERBOSE` | off | Verbose logging |
| `--silent` | `MAILDEV_SILENT` | off | Suppress all output |
| `--log-mail-contents` | — | off | Log a JSON representation of every received message |

`--log-mail-contents` prints message bodies to stdout. Convenient when debugging
a parser problem; do not leave it on in a shared log.

## Other

| Flag | Description |
| --- | --- |
| `--config <path>` | Load configuration from a specific file |
| `-V, --version` | Print the version and exit |
| `-h, --help` | Print usage and exit |

:::note
A handful of flags have no environment-variable equivalent in 3.0 —
`--auto-relay`, `--auto-relay-rules`, `--hide-extensions`,
`--log-mail-contents`, `--incoming-cert`, and `--incoming-key`. Set those on the
command line, or in a [configuration file](#configuration-files), which is the
better answer in Docker anyway.
:::

## Examples

A persistent inbox with MCP enabled and a bounded store:

```console
maildev --mail-directory ./tmp/mail --max-emails 500 --mcp
```

Behind a reverse proxy at `/maildev`, with basic auth:

```console
maildev --base-pathname /maildev --web-user dev --web-pass secret
```

CI: no UI, quiet, bounded:

```console
maildev --disable-web --silent --max-emails 200
```

Different ports because something else owns the defaults:

```console
maildev --smtp 2025 --web 8080
```
