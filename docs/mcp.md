# Claude Integration (MCP)

MailDev 3.0 includes a [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
server, letting AI assistants like Claude interact with your development inbox
using natural language — searching emails, extracting verification links,
analyzing content, and monitoring delivery.

> ⚠️ **Development only.** The MCP server has full access to email content. Run
> it in trusted environments, bound to localhost, and never expose it to the
> internet.

---

## Transports

MailDev offers two ways to run the MCP server:

### Integrated HTTP transport (recommended)

The MCP server is built directly into MailDev's web/API server and exposed at
the `/mcp` endpoint. Enable it with the `--mcp` flag:

```bash
maildev --mcp
```

Default endpoints:

- **SMTP**: `localhost:1025`
- **Web UI / REST API**: `http://localhost:1080`
- **MCP**: `http://localhost:1080/mcp`

The HTTP transport uses `StreamableHTTPServerTransport` with per-client session
management via the `mcp-session-id` header, and reads directly from storage (no
HTTP round-trips). If a `--base-pathname` is configured, the endpoint is served
under it (e.g. `/maildev/mcp`).

### Standalone stdio transport

For stdio-based clients such as Claude Desktop, run the dedicated MCP CLI shipped
by the `@maildev/mcp` package:

```bash
maildev-mcp
```

It connects to a running MailDev instance over the REST API. Configure it with
flags or environment variables:

| Flag             | Env var            | Default                 | Description                       |
| ---------------- | ------------------ | ----------------------- | --------------------------------- |
| `-u, --url`      | `MAILDEV_API_URL`  | `http://localhost:1080` | MailDev REST API base URL         |
| `-k, --api-key`  | `MAILDEV_API_KEY`  | _(none)_                | API key, if authentication is on  |

```bash
MAILDEV_API_URL=http://localhost:1080 maildev-mcp
# or
maildev-mcp --url http://localhost:1080
```

---

## Configuring Claude Desktop

Edit your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**For stdio mode** (standalone `maildev-mcp`):

```json
{
  "mcpServers": {
    "maildev": {
      "command": "maildev-mcp",
      "env": {
        "MAILDEV_API_URL": "http://localhost:1080"
      }
    }
  }
}
```

**For HTTP mode** (integrated `--mcp`):

```json
{
  "mcpServers": {
    "maildev": {
      "url": "http://localhost:1080/mcp"
    }
  }
}
```

Restart Claude Desktop after updating the config.

---

## Programmatic configuration

When embedding the API server, enable MCP through the `mcp` option:

```typescript
import { createAPIServer } from '@maildev/api'

const api = createAPIServer({
  port: 1080,
  storage,
  smtp,
  mcp: { enabled: true }, // exposes /mcp
})

await api.start()
```

Using the top-level `MailDev` class, set `mcp: true`:

```typescript
import { MailDev } from 'maildev'

const maildev = new MailDev({ mcp: true })
await maildev.start()
```

---

## Tools

The MCP server exposes 5 tools:

### `maildev_search_emails`

Search emails with flexible filters. All parameters are optional.

| Parameter       | Type    | Description                                            |
| --------------- | ------- | ------------------------------------------------------ |
| `query`         | string  | Text search across subject, from, to, and body         |
| `from`          | string  | Filter by sender email address                         |
| `to`            | string  | Filter by recipient email address                      |
| `subject`       | string  | Filter by subject line                                 |
| `hasAttachment` | boolean | Filter emails with/without attachments                 |
| `isUnread`      | boolean | Filter by read/unread status                           |
| `since`         | string  | Filter emails after this timestamp (ISO 8601)          |
| `until`         | string  | Filter emails before this timestamp (ISO 8601)         |
| `limit`         | number  | Maximum number of results (default: 20)                |

### `maildev_get_email`

Get full details of a specific email, including content and attachments.

- `id` (string, **required**) — the email ID

### `maildev_get_latest_email`

Get the most recently received email(s).

- `count` (number, optional) — number of recent emails to return (default: 1)

### `maildev_delete_email`

Delete a specific email.

- `id` (string, **required**) — the email ID to delete

### `maildev_get_attachment`

Download an email attachment as base64-encoded content.

- `emailId` (string, **required**) — the email ID
- `filename` (string, **required**) — the attachment filename

---

## Resources

| URI                    | MIME type          | Description                              |
| ---------------------- | ------------------ | ---------------------------------------- |
| `maildev://emails`     | `application/json` | List of all emails in the inbox          |
| `maildev://stats`      | `application/json` | Inbox statistics                         |
| `maildev://email/{id}` | `application/json` | A specific email by ID (dynamic)         |

`maildev://stats` returns `{ emailCount, unreadCount, newestEmail, oldestEmail }`.

---

## Prompts

| Prompt                   | Arguments                                       | Description                                                    |
| ------------------------ | ----------------------------------------------- | -------------------------------------------------------------- |
| `verify-signup-email`    | `email` (required)                              | Check for a signup/verification email and extract its link     |
| `check-password-reset`   | `email` (required)                              | Find a password reset email and extract the reset token/link   |
| `analyze-email-content`  | `emailId` (optional, `"latest"` for most recent) | Analyze content for key info like prices, dates, and links     |
| `monitor-email-delivery` | `to` (required), `subject` (optional, partial)  | Watch for an expected email and verify its contents            |

---

## Usage examples

Once connected, you can ask Claude things like:

> "Did I receive any emails in the last 5 minutes?"

> "Get me the verification link from the signup email to user@test.com"

> "Summarize the latest order confirmation email"

> "Did the password reset email go out to user@test.com?"

> "Delete the old test emails"

Claude selects the appropriate tools (search, get, get-latest, delete,
get-attachment) to answer.

---

## Troubleshooting

**Claude can't connect to the MCP server**

1. Verify MailDev is running and the API is reachable:
   `curl http://localhost:1080/api/healthz`
2. Check the MCP config in Claude Desktop.
3. Restart Claude Desktop after config changes.
4. For stdio mode, confirm `MAILDEV_API_URL` points at the running instance.

**Tools return errors**

1. Confirm the REST API is accessible (see the health check above).
2. If authentication is enabled, provide the API key via `MAILDEV_API_KEY`
   (stdio) or the appropriate auth header.
3. Review the tool parameters in Claude's output.

**Slow performance**

- Use smaller `limit` values when searching.
- Clear old emails from the inbox to reduce the search set.
