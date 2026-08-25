---
'@maildev/api': patch
'maildev': patch
---

Fix the integrated MCP HTTP transport (`maildev --mcp`) so it supports more than
one session. Each session now gets its own MCP server instance instead of
sharing a single one, which previously made the second client fail to connect
with "Already connected to a transport." Requests carrying an unknown session ID
now return a proper JSON-RPC error, and open MCP sessions are closed on shutdown.
