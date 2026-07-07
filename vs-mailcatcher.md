# MailDev vs Mailcatcher

Both [MailDev](https://maildev.github.io/maildev/) and
[Mailcatcher](https://mailcatcher.me/) are open-source SMTP "catchers": you point
your app at a local SMTP port and outgoing mail is trapped and shown in a web UI
instead of reaching real inboxes. They solve the same core problem. Here's how
they differ.

| Feature | MailDev 3.0 | Mailcatcher |
| --- | --- | --- |
| Runtime | Node.js (TypeScript) | Ruby |
| Install | npm or Docker | gem or Docker |
| SMTP catch-all | Yes | Yes |
| Web inbox | Modern React UI | Yes (classic UI) |
| HTML / text / source / headers | Yes | Yes |
| Responsive preview | Yes — resizable viewports | — |
| Inbox search | Yes + command palette | — |
| Light & dark theme | Yes | — |
| Real-time updates | WebSocket | WebSocket |
| Attachments | Yes | Yes |
| REST API | Full JSON API | Basic API |
| Relay to real SMTP | Yes + auto-relay rules | — |
| Embeddable / programmatic API | Yes (typed) | — |
| AI agent integration (MCP) | Built-in | — |
| License | MIT | MIT |

_Comparison compiled in good faith from public documentation and may go out of
date. Corrections welcome via a GitHub issue._

## Pick MailDev if

- You work in JavaScript/TypeScript and want `npm install -g maildev` or one Docker command.
- You want a modern, searchable UI with responsive-email preview and a dark theme.
- You want to script your inbox from tests with a full REST API, or embed it in a Node app.
- You want your AI agent (Claude, Cursor, Codex…) to read and reason about your dev inbox via the built-in MCP server.

## Mailcatcher fits if

- Your stack is Ruby-first and you'd rather `gem install mailcatcher`.
- You want the smallest, long-established tool and don't need the extras above.

Get started with MailDev: https://maildev.github.io/maildev/#install
