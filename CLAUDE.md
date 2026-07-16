# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**MailDev 3.0** is a mail server + web UI for viewing and testing email during
development, with first-class Claude support via the Model Context Protocol (MCP).

---

## Architecture

Packages form a strict dependency chain (all ESM — `"type": "module"`, so
relative imports must carry `.js` extensions even in `.ts` source):

```
core ──→ smtp, api, mcp, ui ──→ cli   (cli depends on every other package)
```

- **`core`** — the shared foundation. Owns the `Email` type and the `Storage`
  interface with two implementations: `MemoryStorage` (default) and
  `FileStorage` (used when a mail directory is configured). Everything upstream
  talks to storage through this interface, never a concrete class. Also holds
  the id/format/filter/clone/bcc utilities.
- **`smtp`** — an `EventEmitter`-based SMTP server (wraps `smtp-server`). On
  receipt it parses (`mailparser`), sanitizes HTML (`dompurify`/`jsdom`),
  extracts attachments to disk, writes the `Email` to storage, then emits a
  `new` event. Also implements outbound **relay** and **auto-relay**.
- **`api`** — a Fastify server exposing the REST API (`/email`, attachments,
  config, etc.), a **Socket.io** WebSocket that pushes live email events to the
  UI, and optionally the **MCP HTTP transport** at `/mcp`.
- **`ui`** — React 19 + Vite + Tailwind SPA (TanStack Query, Zustand, React
  Router). Its `./server` export (`registerUI`) mounts the built assets onto the
  API's Fastify instance via `@fastify/static`.
- **`mcp`** — the MCP server (tools/resources/prompts). Key subtlety: its
  handlers do **not** touch storage directly — they go through `MailDevClient`,
  an **HTTP client that calls the REST API**. So MCP always sits in front of a
  running MailDev over HTTP, whether embedded (`--mcp`) or standalone stdio
  (`maildev-mcp`).
- **`cli`** — the user-facing binary. `config/` layers defaults → file →
  env → flags into a validated `MailDevConfig`; the **`Orchestrator`**
  (`server/orchestrator.ts`) is the wiring hub that instantiates storage, the
  SMTP server, and the API server (with UI + MCP), starts them in order, and
  bridges SMTP's `new` event to logging.

**Live-email data flow:** SMTP receives → parse/sanitize/store → emit `new` →
API's Socket.io broadcasts → UI updates in real time. The REST API and MCP are
read/query paths over the same storage.

**Versioning quirk:** each publishable package hardcodes a `VERSION` constant as
a dev fallback; `scripts/set-version.mjs` (run in each `build`) rewrites it in
`dist` to match `package.json`. Releases are managed with **changesets**.

---

## Development

MailDev 3.0 is a **pnpm + turbo monorepo** (`packages/*`: `core`, `smtp`, `api`, `ui`, `mcp`, `cli`). Tests run per package with **vitest**, orchestrated by turbo.

### Run the full service

```bash
pnpm install   # first time only
pnpm dev       # → turbo run dev (starts all packages concurrently)
```

This launches every package's `dev` task at once:
- **`@maildev/api`** → `tsx watch src/dev.ts`, booting the complete backend stack (SMTP + REST API + WebSocket) in one process
- **`@maildev/ui`** → `vite` dev server for the React web interface
- `core`, `smtp`, `cli` → `tsc --watch` for incremental rebuilds

Default endpoints:
- **SMTP**: `localhost:1025` (point your app's mail transport here)
- **Web UI / REST API**: `http://localhost:1080`

Send test mail to verify it's working:

```bash
node scripts/send.js
```

Override ports/host via env vars (read in `packages/api/src/dev.ts`):

```bash
SMTP_PORT=2525 API_PORT=8080 API_HOST=127.0.0.1 pnpm dev
```

To run the actual built CLI binary instead of the dev server:

```bash
pnpm build
pnpm --filter maildev cli   # runs dist/bin/maildev.js
```

### Run the tests

```bash
pnpm test      # → turbo run test (builds first, then vitest run in every package)
```

Run tests for a single package:

```bash
pnpm --filter @maildev/core test
pnpm --filter @maildev/core test:watch      # re-run on change
pnpm --filter @maildev/core test:coverage   # with coverage
```

### Other checks

```bash
pnpm typecheck   # turbo run typecheck
pnpm lint        # turbo run lint
```

---

## Documentation

User-facing docs live in [`docs/`](./docs):

- [`docs/api.md`](./docs/api.md) — programmatic (embedding) API
- [`docs/rest.md`](./docs/rest.md) — REST API
- [`docs/mcp.md`](./docs/mcp.md) — **Claude integration (MCP)**: transports, Claude Desktop config, tools, resources, and prompts
- [`docs/docker.md`](./docs/docker.md) — running under Docker
- [`docs/https.md`](./docs/https.md) — serving over HTTPS

For MCP specifically, the canonical reference is **[`docs/mcp.md`](./docs/mcp.md)**.
In short: enable the integrated HTTP transport with `maildev --mcp` (endpoint at
`http://localhost:1080/mcp`), or run the standalone stdio server via `maildev-mcp`
for Claude Desktop.

---

**License:** MIT

**Maintained by:** MailDev Contributors
