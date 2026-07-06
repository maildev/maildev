# MailDev

[![npm](https://img.shields.io/npm/v/maildev)](https://www.npmjs.com/package/maildev)
[![npm downloads](https://img.shields.io/npm/dm/maildev)](https://www.npmjs.com/package/maildev)
[![Docker Pulls](https://img.shields.io/docker/pulls/maildev/maildev)](https://hub.docker.com/r/maildev/maildev)
[![License](https://img.shields.io/npm/l/maildev?color=white)](/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

> [!IMPORTANT]
> MailDev 3.0 release candidate has now been released which includes a complete re-write and re-structuring of the entire project. If you run into any issues, please install the latest v2 release.

**MailDev** is a simple way to test your project's generated email during development, with an easy to use web interface that runs on your machine built on top of [Node.js](http://www.nodejs.org).

> MailDev is sponsored by ⭐️ **[Inngest](https://www.inngest.com/?ref=maildev)**.
>
> **Inngest** is the durable execution platform for AI agents and workflows enabling you to ship reliable products with no infrastructure.

![MailDev Screenshot](https://github.com/maildev/maildev/blob/main/.github/assets/screenshot-3.0-rc.png?raw=true)

## Install

```bash
npm install -g maildev
```

## Docker Run

If you want to use MailDev with [Docker](https://www.docker.com/), you can use the
[**maildev/maildev** image on Docker Hub](https://hub.docker.com/r/maildev/maildev).
For a guide for usage with Docker,
[checkout the docs](https://github.com/maildev/maildev/blob/master/docs/docker.md).

```bash
docker run -p 1080:1080 -p 1025:1025 maildev/maildev
```

## Usage

```
Usage: maildev [options]
```

| Options                          | Environment variable       | Description                                                                               |
| -------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| `-s, --smtp <port>`              | `MAILDEV_SMTP_PORT`        | SMTP port to catch mail (default: 1025)                                                   |
| `-w, --web <port>`               | `MAILDEV_WEB_PORT`         | Port to run the Web GUI (default: 1080)                                                   |
| `--ip <ip address>`              | `MAILDEV_IP`               | IP Address to bind SMTP service to (default: `::`)                                        |
| `--web-ip <ip address>`          | `MAILDEV_WEB_IP`           | IP Address to bind HTTP service to (default: `0.0.0.0`)                                   |
| `--mail-directory <path>`        | `MAILDEV_MAIL_DIRECTORY`   | Directory for persisting mail                                                             |
| `--https`                        | `MAILDEV_HTTPS`            | Switch from http to https protocol                                                        |
| `--https-key <file>`             | `MAILDEV_HTTPS_KEY`        | The file path to the ssl private key                                                      |
| `--https-cert <file>`            | `MAILDEV_HTTPS_CERT`       | The file path to the ssl cert file                                                        |
| `--incoming-user <user>`         | `MAILDEV_INCOMING_USER`    | SMTP user for incoming mail                                                               |
| `--incoming-pass <pass>`         | `MAILDEV_INCOMING_PASS`    | SMTP password for incoming mail                                                           |
| `--incoming-secure`              | `MAILDEV_INCOMING_SECURE`  | Use SMTP SSL for incoming emails                                                          |
| `--incoming-cert <path>`         | `MAILDEV_INCOMING_CERT`    | Cert file location for incoming SSL                                                       |
| `--incoming-key <path>`          | `MAILDEV_INCOMING_KEY`     | Key file location for incoming SSL                                                        |
| `--outgoing-host <host>`         | `MAILDEV_OUTGOING_HOST`    | SMTP host for outgoing mail                                                               |
| `--outgoing-port <port>`         | `MAILDEV_OUTGOING_PORT`    | SMTP port for outgoing mail                                                               |
| `--outgoing-user <user>`         | `MAILDEV_OUTGOING_USER`    | SMTP user for outgoing mail                                                               |
| `--outgoing-pass <password>`     | `MAILDEV_OUTGOING_PASS`    | SMTP password for outgoing mail                                                           |
| `--outgoing-secure`              | `MAILDEV_OUTGOING_SECURE`  | Use SMTP SSL for outgoing mail                                                            |
| `--auto-relay [email]`           | `MAILDEV_AUTO_RELAY`       | Use auto-relay mode. Optional relay email address                                         |
| `--auto-relay-rules <file>`      | `MAILDEV_AUTO_RELAY_RULES` | Filter rules for auto relay mode                                                          |
| `--web-user <user>`              | `MAILDEV_WEB_USER`         | HTTP user for GUI                                                                         |
| `--web-pass <password>`          | `MAILDEV_WEB_PASS`         | HTTP password for GUI                                                                     |
| `--base-pathname <path>`         | `MAILDEV_BASE_PATHNAME`    | Base path for URLs                                                                        |
| `--disable-web`                  | `MAILDEV_DISABLE_WEB`      | Disable the use of the web interface                                                      |
| `--hide-extensions <extensions>` | `MAILDEV_HIDE_EXTENSIONS`  | Comma separated list of SMTP extensions to NOT advertise                                  |
| `--mcp`                          | `MAILDEV_MCP`              | Enable MCP server for Claude integration                                                  |
| `--config <file>`                |                            | Path to configuration file                                                                |
| `-v, --verbose`                  |                            | Enable verbose logging                                                                    |
| `--silent`                       |                            | Disable all output                                                                        |
| `--log-mail-contents`            |                            | Log a JSON representation of each incoming mail                                           |

## Configuration File

MailDev supports configuration files. Create a `maildev.config.js`, `maildev.config.ts`, or `.maildevrc.json` file:

```javascript
// maildev.config.js
export default {
  smtp: 1025,
  web: 1080,
  verbose: true,
  mcp: true,
}
```

```json
// .maildevrc.json
{
  "smtp": 1025,
  "web": 1080,
  "verbose": true
}
```

Configuration priority: CLI args > Environment variables > Config file > Defaults

## API

MailDev can be used in your Node.js application. For more info view the
[API docs](https://github.com/maildev/maildev/blob/master/docs/api.md).

```typescript
import { MailDev } from 'maildev'

const maildev = new MailDev({
  smtp: 1025,
  web: 1080,
})

const { smtp } = await maildev.start()

smtp.on('new', (email) => {
  console.log('New email:', email.subject)
})

// When done
await maildev.stop()
```

MailDev also has a **REST API**. For more info
[view the docs](https://github.com/maildev/maildev/blob/master/docs/rest.md).

## Claude Integration (MCP)

MailDev includes a Model Context Protocol (MCP) server for integration with Claude. Enable it with `--mcp`:

```bash
maildev --mcp
```

This exposes an MCP endpoint at `/mcp` that allows Claude to:
- Search and retrieve emails
- Extract verification links and tokens
- Analyze email content
- Monitor email delivery

For detailed setup instructions, see [CLAUDE.md](./CLAUDE.md).

## Outgoing Email

MailDev optionally supports selectively relaying emails to an outgoing SMTP server. If you configure outgoing
email with the `--outgoing-*` options you can click "Relay" on an individual email to relay through MailDev out
to a real SMTP service that will actually send the email to the recipient.

Example:

```bash
maildev --outgoing-host smtp.gmail.com \
        --outgoing-secure \
        --outgoing-user 'you@gmail.com' \
        --outgoing-pass '<pass>'
```

### Auto Relay Mode

Enabling the auto relay mode will automatically send each email to its recipient
without the need to click the "Relay" button mentioned above.
The outgoing email options are required to enable this feature.

Optionally, you can specify a single email address to which MailDev will forward
all emails instead of the original recipient. For example, using
`--auto-relay you@example.com` will forward all emails to that address
automatically.

Additionally, you can pass a valid json file with additional configuration for
which email addresses you would like to `allow` or `deny`. The last matching
rule in the array will be the rule MailDev will follow.

Example:

```bash
maildev --outgoing-host smtp.gmail.com \
        --outgoing-secure \
        --outgoing-user 'you@gmail.com' \
        --outgoing-pass '<pass>' \
        --auto-relay \
        --auto-relay-rules file.json
```

Rules example file:

```json
[
  { "allow": "*" },
  { "deny": "*@test.com" },
  { "allow": "ok@test.com" },
  { "deny": "*@utah.com" },
  { "allow": "johnny@utah.com" }
]
```

This would allow `angelo@fbi.gov`, `ok@test.com`, `johnny@utah.com`, but deny
`bodhi@test.com`.

## Configure Your Project

Configure your application to send emails via port `1025` and open `localhost:1080` in your browser.

**Nodemailer (Node.js)**

```javascript
const nodemailer = require('nodemailer')

const transport = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
})

transport.sendMail({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test Email',
  text: 'Hello from MailDev!',
})
```

**Django** -- Add `EMAIL_PORT = 1025` in your settings file [[source]](https://docs.djangoproject.com/en/dev/ref/settings/#std:setting-EMAIL_PORT)

**Rails** -- config settings:

```ruby
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: "localhost",
  port: 1025,
  enable_starttls_auto: false
}
```

**Spring Boot** -- in application.properties:

```properties
spring.mail.host=localhost
spring.mail.port=1025
```

## Features

- Modern React-based web interface
- Toggle between HTML, plain text views and email headers
- Test responsive emails with resizable preview pane
- Receive and view email attachments
- Real-time updates via WebSocket
- Relay email to an upstream SMTP server
- MCP integration for Claude AI assistant
- Configuration file support
- Full TypeScript support

## Ideas

If you're using MailDev and you have a great idea, I'd love to hear it. If you're not using MailDev because it lacks a feature, I'd love to hear that too. Add an issue to the repo [here](https://github.com/maildev/maildev/issues/new).

## Contributing

Any help on MailDev would be awesome. There is plenty of room for improvement. Feel free to [create a Pull Request](https://github.com/maildev/maildev/pulls).

MailDev v3 is a TypeScript monorepo using pnpm workspaces:

```
packages/
  core/     # Storage and shared types
  smtp/     # SMTP server
  api/      # REST API and WebSocket server
  ui/       # React web interface
  mcp/      # MCP server for Claude
  cli/      # CLI and orchestration
```

To run **MailDev** during development:

```bash
pnpm install
pnpm dev
```

To send test emails:

```bash
node scripts/send.js
```

To run the test suite:

```bash
pnpm test
```

## [Changelog](https://github.com/maildev/maildev/releases)

## Thanks

**MailDev** is built using great open source projects including
[React](https://react.dev/),
[Fastify](https://fastify.dev/),
[Tailwind CSS](https://tailwindcss.com/),
and two great projects from [Andris Reinman](https://github.com/andris9):
[smtp-server](https://github.com/nodemailer/smtp-server)
and [mailparser](https://github.com/nodemailer/mailparser).
Many thanks to Andris as his projects are the backbone of this app and to
[MailCatcher](http://mailcatcher.me/) for the inspiration.

Additionally, thanks to all the awesome [contributors](https://github.com/maildev/maildev/graphs/contributors)
to the project.

## License

MIT
