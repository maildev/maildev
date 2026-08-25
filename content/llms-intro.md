# MailDev

> MailDev is a free, open-source local SMTP server and modern web inbox that catches every email your app sends during development. Point your mail transport at localhost:1025 and view the results at localhost:1080 — nothing reaches real inboxes. MailDev 3.0 adds a built-in Model Context Protocol (MCP) server, so AI agents like Claude, Cursor, and Codex can read the dev inbox.

Key facts:
- Run: `npx maildev`, or install globally with `npm install -g maildev` then `maildev`, or `docker run -p 1080:1080 -p 1025:1025 maildev/maildev`
- Default ports: SMTP 1025 (where your app sends mail), Web UI + REST API + MCP 1080
- Enable MCP: `maildev --mcp` (endpoint at http://localhost:1080/mcp), or run the standalone `maildev-mcp` stdio server for desktop AI tools. Works with any MCP client (Claude Desktop/Code, Cursor, Codex, Windsurf).
- License: MIT. Repository: https://github.com/maildev/maildev. Package: https://www.npmjs.com/package/maildev
- MailDev 3.0 is a complete TypeScript rewrite (React web UI, Fastify API, MCP server) organized as a pnpm monorepo.
- MailDev is a development tool. It has no meaningful authentication story by default and must never be exposed to the public internet or used to handle production mail.
