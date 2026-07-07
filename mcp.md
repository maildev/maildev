# Email testing with AI agents (MCP)

MailDev 3.0 ships a built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
server, so AI agents can search your development inbox, pull verification links,
analyze content, and confirm delivery — in natural language. It works with any
MCP client, including Claude (Desktop and Code), Cursor, Codex, and Windsurf.

> ⚠️ Development only. The MCP server has full access to email content. Run it in
> trusted environments, bound to localhost, and never expose it to the internet.

**Don't want to use MCP?** MailDev also has a full
[REST API](https://github.com/maildev/maildev/blob/main/docs/rest.md) — list,
read, search, download, and delete emails over plain JSON. Perfect for driving
your inbox from test suites and CI in any language, no AI required.

## Enable it

Integrated HTTP transport (recommended) — add the `--mcp` flag:

```bash
maildev --mcp
# SMTP  → localhost:1025
# Web   → http://localhost:1080
# MCP   → http://localhost:1080/mcp
```

Standalone stdio transport (for desktop AI tools and similar clients):

```bash
maildev-mcp   # connects to a running MailDev over its REST API
```

## Connect your MCP client

Add MailDev to your client's `mcpServers` config — a project `.mcp.json` for
Claude Code, Cursor, and Codex, or `claude_desktop_config.json`
(`~/Library/Application Support/Claude/` on macOS) for Claude Desktop. Each
entry takes an explicit `type`.

HTTP transport (integrated `--mcp`):

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

stdio transport (standalone `maildev-mcp`):

```json
{
  "mcpServers": {
    "maildev": {
      "type": "stdio",
      "command": "maildev-mcp",
      "env": { "MAILDEV_API_URL": "http://localhost:1080" }
    }
  }
}
```

Restart Claude Desktop after saving.

## Tools (5)

- `maildev_search_emails` — search by query, from, to, subject, attachments, read state, or time range
- `maildev_get_email` — full content + attachments for one email (by id)
- `maildev_get_latest_email` — the most recent email(s)
- `maildev_delete_email` — delete an email by id
- `maildev_get_attachment` — download an attachment as base64

## Resources (3)

- `maildev://emails` — the full inbox
- `maildev://stats` — `{ emailCount, unreadCount, newestEmail, oldestEmail }`
- `maildev://email/{id}` — a specific email by id

## Prompts (4)

- `verify-signup-email` — find a signup/verification email and extract its link
- `check-password-reset` — find a reset email and extract the token/link
- `analyze-email-content` — pull key info like prices, dates, and links
- `monitor-email-delivery` — watch for an expected email and verify its contents

## Try asking

- "Did I receive any emails in the last 5 minutes?"
- "Get me the verification link from the signup email to user@test.com"
- "Summarize the latest order confirmation email"
- "Did the password reset email go out to user@test.com?"

Full reference: https://github.com/maildev/maildev/blob/main/docs/mcp.md
