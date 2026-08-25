---
title: MailDev vs Mailcatcher
description: A factual comparison of MailDev and Mailcatcher, two open-source local SMTP catchers — runtime, install, web UI, API surface, relaying, and AI agent support.
ogTitle: MailDev vs Mailcatcher
permalink: /docs/vs/mailcatcher/
---

Both MailDev and [Mailcatcher](https://mailcatcher.me/) are open-source SMTP
"catchers": you point your app at a local SMTP port and outgoing mail is trapped
and shown in a web UI instead of reaching real inboxes. They solve the same core
problem. Here is how they differ.

## At a glance

| Feature | MailDev 3.0 | Mailcatcher |
| --- | --- | --- |
| Runtime | Node.js (TypeScript) | Ruby |
| Install | npm or Docker | gem or Docker |
| SMTP catch-all | Yes | Yes |
| Web inbox | Yes — modern React UI | Yes — classic UI |
| HTML / text / source / headers | Yes | Yes |
| Responsive preview | Yes — resizable viewports | No |
| Inbox search | Yes, plus a command palette | No |
| Light & dark theme | Yes | No |
| Real-time updates | WebSocket | WebSocket |
| Attachments | Yes | Yes |
| REST API | Yes — full JSON API | Yes — basic API |
| Relay to real SMTP | Yes — with auto-relay rules | No |
| Embeddable / programmatic API | Yes (typed) | No |
| AI agent integration (MCP) | Built-in | No |
| License | MIT | MIT |

*Comparison compiled in good faith from public documentation and may go out of
date. Corrections welcome
[via a GitHub issue](https://github.com/maildev/maildev/issues/new).*

## Where they genuinely overlap

For the core job — catch mail, show it in a browser, never send it to a real
person — either tool works, and both have been doing it for over a decade. If you
already have Mailcatcher running and it does what you need, there is no urgent
reason to switch.

Both catch on an SMTP port, both render HTML and plain text, both show raw source
and headers, both handle attachments, both push new mail to the UI over a
websocket, and both are MIT licensed.

## Pick MailDev if

- **You work in JavaScript or TypeScript.** `npx maildev` needs no Ruby toolchain, and MailDev can be a devDependency pinned in your lockfile.
- **You care about the UI.** Search, a command palette, [responsive preview](/docs/web-ui/) at phone and tablet widths, and a dark theme.
- **You script your inbox from tests.** The [REST API](/docs/reference/rest-api/) covers listing with pagination and search, reading, deleting in bulk, marking read, downloading, and relaying — see [testing email in CI](/docs/guides/testing-in-ci/).
- **You want it in-process.** The [programmatic API](/docs/reference/node-api/) starts and stops MailDev inside a Node.js test suite and emits an event per message, which removes the polling from email assertions entirely.
- **You want an AI agent to read the inbox.** The built-in [MCP server](/docs/ai/mcp/) gives Claude, Cursor, Codex, and other MCP clients tools for searching and reading your dev mail.
- **You need to forward mail onward.** [Relay and auto-relay](/docs/reference/cli/) can push caught messages to a real SMTP server, with allow/deny rules.

## Mailcatcher fits if

- **Your stack is Ruby-first** and `gem install mailcatcher` fits your tooling better than npm.
- **You want the smaller, long-established tool** and none of the extras above matter to you.

## Switching

There is nothing to migrate — a catcher holds no state you care about. Both
default to SMTP on `1025`, so if you have been using Mailcatcher's defaults, your
application configuration already works:

```console
npx maildev
```

The web UI moves from Mailcatcher's port `1080`… which is also MailDev's default.
In practice the only change is which process you start.

If you script against Mailcatcher's API, the endpoints differ — see the
[REST API reference](/docs/reference/rest-api/) for MailDev's, which is under
`/api` and returns richer message objects.

## Other options

MailDev is not the only alternative. Mailpit and MailHog are the Go-based tools
in this space, smtp4dev and Papercut serve the .NET world, and Mailtrap is the
hosted option. Comparisons for those are on the way — if there is one you
particularly want,
[say so on the issue tracker](https://github.com/maildev/maildev/issues).
