# MailDev — Development Guide

**MailDev 3.0** is a mail server + web UI for viewing and testing email during
development, with first-class Claude support via the Model Context Protocol (MCP).

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
