# Contributing to MailDev

MailDev 3.0 is a **pnpm + turbo monorepo**. This guide covers local development and the release process.

## Repository layout

The publishable packages live under `packages/*`:

| Package | npm name | Purpose |
| --- | --- | --- |
| `core` | `@maildev/core` | Core types, utilities, and storage abstraction |
| `smtp` | `@maildev/smtp` | SMTP server |
| `api` | `@maildev/api` | REST API + WebSocket server |
| `ui` | `@maildev/ui` | React web interface |
| `mcp` | `@maildev/mcp` | MCP server for Claude integration |
| `cli` | `maildev` | The `maildev` CLI binary (bundles all of the above) |

The root `package.json` is `private` (legacy v2 code) and is **not** published.

## Prerequisites

- Node.js `>=20`
- [pnpm](https://pnpm.io) `9.15.4` (pinned via `packageManager`)

## Development

```bash
pnpm install   # first time only
pnpm dev       # turbo run dev — starts every package concurrently
```

`pnpm dev` launches each package's `dev` task at once:

- **`@maildev/api`** → `tsx watch src/dev.ts`, booting the full backend (SMTP + REST API + WebSocket) in one process
- **`@maildev/ui`** → `vite` dev server for the React UI
- `core`, `smtp`, `cli` → `tsc --watch` for incremental rebuilds

Default endpoints:

- **SMTP**: `localhost:1025` (point your app's mail transport here)
- **Web UI / REST API**: `http://localhost:1080`

Send a test email to verify things work:

```bash
node scripts/send.js
```

Override ports/host via env vars (read in `packages/api/src/dev.ts`):

```bash
SMTP_PORT=2525 API_PORT=8080 API_HOST=127.0.0.1 pnpm dev
```

Run the built CLI binary instead of the dev server:

```bash
pnpm build
pnpm --filter maildev cli   # runs dist/bin/maildev.js
```

## Key commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install workspace dependencies |
| `pnpm dev` | Start all packages in watch mode |
| `pnpm build` | `turbo run build` — build every package |
| `pnpm test` | `turbo run test` — build, then run vitest in every package |
| `pnpm typecheck` | `turbo run typecheck` |
| `pnpm lint` | `turbo run lint` |
| `pnpm lint:fix` | Lint with `--fix` |
| `pnpm format` | Format all files with prettier |
| `pnpm format:check` | Check formatting without writing |

### Testing a single package

Tests run per package with **vitest**, orchestrated by turbo:

```bash
pnpm --filter @maildev/core test
pnpm --filter @maildev/core test:watch      # re-run on change
pnpm --filter @maildev/core test:coverage   # with coverage
```

## Releasing

Releases are managed with [Changesets](https://github.com/changesets/changesets). All six packages are **linked**, so they version together, and publish with `access: public`. Internal `workspace:*` dependencies are rewritten to real versions at publish time.

### One-time setup

Log into npm (interactive):

```bash
npm login
```

### Publishing an alpha / prerelease

⚠️ **Always publish prereleases under a dist-tag.** `npm publish` sets the `latest` tag by default — a semver prerelease suffix does not change that. The `maildev` package already serves a stable `latest` (2.x), so publishing an alpha without a tag would clobber it for everyone running `npm install maildev`.

If the versions are already set to the target prerelease (e.g. `3.0.0-alpha.0`), just build and publish under the tag:

```bash
pnpm build
pnpm changeset publish --tag alpha
```

`changeset publish` skips the private root, skips anything already on the registry, and pushes the rest. Users then install with:

```bash
npm install maildev@alpha
```

`latest` stays on the stable release.

### Iterating on prereleases (alpha.1, alpha.2, …)

Use Changesets' pre-release mode so version bumps and tagging happen automatically:

```bash
pnpm changeset pre enter alpha   # writes .changeset/pre.json
pnpm changeset                   # describe the change
pnpm changeset version           # bumps 3.0.0-alpha.0 → alpha.1
pnpm build
pnpm changeset publish           # auto-uses the `alpha` tag from pre.json
```

When you're ready to cut a stable release, exit pre-release mode first:

```bash
pnpm changeset pre exit
pnpm changeset version           # e.g. 3.0.0-alpha.N → 3.0.0
pnpm build
pnpm changeset publish           # publishes to `latest`
```

> Note: the repo's `pnpm release` script (`turbo run build && changeset publish`) publishes to `latest`. Use the `--tag`/pre-mode flow above for prereleases so you don't overwrite the stable `latest`.
