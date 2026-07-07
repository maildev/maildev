# MailDev — the local email inbox for developers

MailDev is a free, open-source local SMTP server and modern web UI that catches
every email your app sends during development. Point your mail transport at
`localhost:1025`, and view the results at `http://localhost:1080` — nothing
reaches real inboxes. MailDev 3.0 is a complete TypeScript rewrite and adds
a built-in Model Context Protocol (MCP) server, so AI agents like Claude,
Cursor, and Codex can read the dev inbox.

## Get started

Install with npm:

```bash
npm install -g maildev
maildev
```

Or with Docker:

```bash
docker run -p 1080:1080 -p 1025:1025 maildev/maildev
```

Then configure your app to send over SMTP on `localhost:1025` (no auth needed in
development) and open `http://localhost:1080`. With Nodemailer:

```javascript
const transport = nodemailer.createTransport({ host: 'localhost', port: 1025 })
```

See [Connect your app](setup.md) for Django, Rails, Spring Boot, and more.

## Features

- **SMTP catch-all** — every outgoing email lands in MailDev instead of a real inbox (SMTP on port 1025).
- **Modern web UI** — a fast React interface on port 1080 with light and dark themes.
- **MCP integration for AI agents** — let Claude, Cursor, Codex, and other MCP clients read your inbox in natural language. See [Email testing with AI agents](mcp.md).
- **Every format** — rendered HTML, plain text, headers, and raw source for any message.
- **Responsive preview** — resize the preview to any viewport to test how emails render on mobile.
- **Instant search** — filter the inbox as you type, plus a keyboard command palette.
- **REST API** — a full JSON API under `/api` to list, read, search, download, and delete mail.
- **Real-time** — new mail appears instantly over WebSockets.
- **Attachments** — receive, preview, and download attachments.
- **Relay & auto-relay** — forward messages to a real upstream SMTP server, optionally with allow/deny rules.
- **Notifications** — optional browser notifications for new mail.
- **TypeScript & embeddable** — fully typed; use the CLI, Docker, or embed the programmatic API.
- **Runs anywhere** — npm or Docker, and can serve over HTTPS.

## Links

- Repository: https://github.com/maildev/maildev
- npm: https://www.npmjs.com/package/maildev
- Docker Hub: https://hub.docker.com/r/maildev/maildev
- Documentation: https://github.com/maildev/maildev/tree/main/docs
- License: MIT
