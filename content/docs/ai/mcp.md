---
title: MCP server
description: Enable MailDev's Model Context Protocol server so Claude, Cursor, Codex, and any other MCP client can search your development inbox, pull verification links out of emails, and confirm delivery.
ogTitle: Email testing with AI agents
permalink: /docs/ai/mcp/
---

MailDev 3.0 ships a Model Context Protocol server. Your coding agent gets tools
for searching and reading the same development inbox you have open in the
browser — so "did the signup email arrive, and what was the verification link?"
becomes something it can answer itself, mid-task, without you copying anything
out of a browser tab.

## Why it matters

Email is the last leg of a lot of flows an agent otherwise handles end to end:
signup and confirmation, password reset, magic links, invitations, order
receipts. Without access to the inbox, an agent implements the feature and then
stops, because the only way to verify it is for a human to go and look. With MCP
it closes the loop: trigger the flow, read the message, follow the link, confirm
the result.

:::warn
Development only. The MCP server exposes the full contents of every message
MailDev has caught, with no authentication of its own. Run it on your own machine
against your own dev inbox — never against anything holding real mail.
:::

:::note
**Don't want to use MCP?** Everything the MCP server does is also available over
the plain [REST API](/docs/reference/rest-api/), which is a better fit for scripts
and test suites.
:::

## Enable it

Add `--mcp` to how you already start MailDev:

```console
maildev --mcp
```

The endpoint is at `http://localhost:1080/mcp` — the same port as the web UI and
REST API, so a custom `--web` port or `--base-pathname` moves it too.

For desktop AI tools that speak stdio rather than HTTP, there is a standalone
server:

```console
maildev-mcp
```

It talks to a MailDev instance over the REST API, so MailDev itself does not need
`--mcp` for this transport.

| Option | Environment variable | Default | Description |
| --- | --- | --- | --- |
| `-u, --url <url>` | `MAILDEV_API_URL` | `http://localhost:1080` | MailDev instance to connect to |
| `-k, --api-key <key>` | `MAILDEV_API_KEY` | — | Sent if the instance requires auth |
| — | `MAILDEV_WEB_URL` | same as `--url` | Base URL used when building deep links |

## Connect your MCP client

### HTTP transport

For clients that support remote MCP servers over HTTP. Add this to your MCP
configuration:

```json
{
  "mcpServers": {
    "maildev": {
      "type": "http",
      "url": "http://localhost:1080/mcp"
    }
  }
}
```

Each client gets its own session, tracked with an `mcp-session-id` header, so
several tools can talk to one MailDev at the same time.

### stdio transport

For Claude Desktop and anything else that launches a subprocess:

```json
{
  "mcpServers": {
    "maildev": {
      "type": "stdio",
      "command": "maildev-mcp",
      "env": {
        "MAILDEV_API_URL": "http://localhost:1080"
      }
    }
  }
}
```

If MailDev is not installed globally, use `npx`:

```json
{
  "mcpServers": {
    "maildev": {
      "command": "npx",
      "args": ["-y", "maildev", "maildev-mcp"]
    }
  }
}
```

### Where the config file lives

| Client | Location |
| --- | --- |
| Claude Code | `.mcp.json` in the project root |
| Cursor | `.cursor/mcp.json` in the project, or the global equivalent |
| Codex | `.mcp.json` in the project root |
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Claude Desktop (Linux) | `~/.config/Claude/claude_desktop_config.json` |

For Claude Code specifically, the [step-by-step walkthrough](/docs/ai/claude-code/)
covers setup and a real development loop.

## What your agent can do

### Tools

| Tool | Parameters | What it does |
| --- | --- | --- |
| `maildev_search_emails` | `query`, `from`, `to`, `subject`, `hasAttachment`, `isUnread`, `since`, `until`, `limit` (default 20) | Find messages by any combination of sender, recipient, subject, text, attachment presence, read state, or time window |
| `maildev_get_email` | `id` | Fetch one message in full — headers, HTML, plain text, attachment list |
| `maildev_get_latest_email` | `count` (default 1) | The most recent message, or the last *n* |
| `maildev_delete_email` | `id` | Delete a message, so the next assertion starts clean |
| `maildev_get_attachment` | `emailId`, `filename` | Retrieve an attachment as base64 |

Responses include a deep link back into the web inbox
(`http://localhost:1080/#/email/<id>`), so when an agent tells you what it found
you can open the same message yourself in one click.

### Resources

| Resource | Contents |
| --- | --- |
| `maildev://emails` | The current inbox listing |
| `maildev://stats` | `emailCount`, `unreadCount`, `newestEmail`, `oldestEmail` |
| `maildev://email/{id}` | A single message |

### Prompts

Pre-built prompts for the flows that come up most:

| Prompt | Arguments | Purpose |
| --- | --- | --- |
| `verify-signup-email` | `email` | Find the signup message for an address and extract its verification link |
| `check-password-reset` | `email` | Locate the reset message and pull out the reset URL |
| `analyze-email-content` | `emailId` or `"latest"` | Review a message's structure, links, and rendering |
| `monitor-email-delivery` | `to`, `subject` (optional) | Wait for and confirm a specific delivery |

## Try asking

Once it is connected, these all work as plain requests:

- "Did the signup email for `new-user@test.com` arrive? What's the verification link?"
- "Show me the most recent email and tell me whether the plain-text version is usable."
- "Search for password reset emails from the last hour."
- "The invoice email has a PDF attached — check that it isn't zero bytes."
- "Clear the inbox, then register a new account and confirm exactly one email was sent."

The last one is the shape worth internalising: **clear, act, assert**. It gives
the agent a deterministic inbox to reason about instead of whatever accumulated
during the session.

## Troubleshooting

**The client shows no MailDev tools.** Check MailDev is running with `--mcp`, then
confirm the endpoint answers:

```console
curl http://localhost:1080/api/healthz
```

**Connection refused on the HTTP transport.** The URL must match your actual
`--web` port and `--base-pathname`. With `--base-pathname /maildev` the endpoint
is `http://localhost:1080/maildev/mcp`.

**`maildev-mcp: command not found`.** The binary comes with the `maildev`
package. Install it globally, or use the `npx` form above.

**Tools appear but every call fails.** The stdio server talks to MailDev over
HTTP; if MailDev has [basic auth](/docs/reference/cli/) enabled, pass
`--api-key` or drop the auth in development.

## Full reference

The complete MCP documentation, including transport internals and the
programmatic enablement path, lives in
[`docs/mcp.md`](https://github.com/maildev/maildev/blob/main/docs/mcp.md) in the
maildev repository.
