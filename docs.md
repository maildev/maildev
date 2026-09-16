# Overview
Source: https://maildev.github.io/maildev/docs/
Section: Getting started

MailDev is a local SMTP server and web inbox for developers. Catch every email your app sends, read it in a browser or from an AI agent, and never risk sending test mail to a real person.

MailDev sits between your application and the outside world during development.
Your app sends mail over SMTP exactly as it would in production; MailDev catches
it, and nothing leaves your machine.

Two ports do all the work:

| Port   | What listens there                                                                            |
| ------ | --------------------------------------------------------------------------------------------- |
| `1025` | The SMTP server your application sends to                                                     |
| `1080` | The web inbox, the [REST API](https://maildev.github.io/maildev/docs/reference/rest-api/), and the [MCP server](https://maildev.github.io/maildev/docs/ai/mcp/) |

## Start here

- **[Install](https://maildev.github.io/maildev/docs/install/)** — npx, npm, or Docker.
- **[Quick start](https://maildev.github.io/maildev/docs/quickstart/)** — point your framework at MailDev and send your first message.
- **[The web inbox](https://maildev.github.io/maildev/docs/web-ui/)** — what you get in the UI.

## Guides

- **[Docker & Compose](https://maildev.github.io/maildev/docs/guides/docker/)** — run MailDev as a container or a Compose service.
- **[HTTPS](https://maildev.github.io/maildev/docs/guides/https/)** — serve the web inbox over TLS.
- **[Testing email in CI](https://maildev.github.io/maildev/docs/guides/testing-in-ci/)** — assert on delivered mail from your test suite.

## Integrations

Any language that speaks SMTP works without a plugin — send to `localhost:1025`
with authentication and TLS turned off. There are copy-paste configs for
[Nodemailer](https://maildev.github.io/maildev/docs/integrations/nodemailer/),
[Django](https://maildev.github.io/maildev/docs/integrations/django/),
[Ruby on Rails](https://maildev.github.io/maildev/docs/integrations/rails/), and
[Laravel](https://maildev.github.io/maildev/docs/integrations/laravel/).

## Reference

- **[CLI & configuration](https://maildev.github.io/maildev/docs/reference/cli/)** — every flag, environment variable, and config-file key.
- **[REST API](https://maildev.github.io/maildev/docs/reference/rest-api/)** — read, search, and delete mail over HTTP.
- **[Programmatic API](https://maildev.github.io/maildev/docs/reference/node-api/)** — embed MailDev in a Node.js process.

## AI agents

MailDev 3.0 ships an MCP server, so a coding agent can read the inbox you are
already looking at — pull a verification link out of a signup email, confirm a
password reset arrived, check what a template actually rendered.

- **[MCP server](https://maildev.github.io/maildev/docs/ai/mcp/)** — enable it and connect any MCP client.
- **[Claude Code walkthrough](https://maildev.github.io/maildev/docs/ai/claude-code/)** — a full development loop with an agent driving MailDev.

:::warn
MailDev is a development tool. It accepts mail from anyone, stores it
unencrypted, and has no authentication by default. Never expose it to the public
internet, and never point production traffic at it.
:::
