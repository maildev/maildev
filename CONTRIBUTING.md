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
- [pnpm](https://pnpm.io) `10.34.4` (pinned via `packageManager`)

## Development

```bash
pnpm install   # first time only
pnpm dev       # turbo run dev — starts every package concurrently
```

`pnpm dev` launches each package's `dev` task at once:

- **`@maildev/api`** → `tsx watch src/dev.ts`, booting the full backend (SMTP + REST API + WebSocket) in one process
- **`@maildev/ui`** → `vite` dev server for the React UI (runs on `http://localhost:5173` vite port during development)
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

Changelogs are generated with [`@changesets/changelog-github`](https://github.com/changesets/changesets/tree/main/packages/changelog-github), so each entry links its originating PR and credits the author.

### One-time setup

Log into npm (interactive):

```bash
npm login
```

Create a `.env` file in the repo root with a GitHub token (read access is enough — `public_repo` on a classic token, or a fine-grained token with **Contents: Read** on `maildev/maildev`):

```bash
# .env  (git-ignored)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

`@changesets/changelog-github` calls the GitHub API during versioning to resolve PR numbers and author handles, and **hard-requires** `GITHUB_TOKEN`. The `pnpm run version` script loads `.env` via `scripts/with-env.sh` and fails fast if the file or token is missing, so a release can't silently produce a broken changelog.

> **Use `pnpm run version`, not `pnpm version`.** `pnpm version` runs pnpm's
> built-in version command and skips the `"version"` script (and its `.env`
> guard) entirely. If you invoke `pnpm changeset version` directly, export
> `GITHUB_TOKEN` in your shell first.

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
pnpm run version                 # bumps 3.0.0-alpha.0 → alpha.1 (loads .env)
pnpm build
pnpm changeset publish           # auto-uses the `alpha` tag from pre.json
git push --follow-tags           # push commits + version tags
```

When you're ready to cut a stable release, exit pre-release mode first:

```bash
pnpm changeset pre exit
pnpm run version                 # e.g. 3.0.0-alpha.N → 3.0.0 (loads .env)
pnpm build
pnpm changeset publish           # publishes to `latest`
git push --follow-tags           # push commits + version tags
```

Commit the version bump (the updated `package.json`s and `CHANGELOG.md`s) before publishing, so the pushed tag points at the changelog the release notes are extracted from.

> Note: the repo's `pnpm release` script (`turbo run build && changeset publish && git push --follow-tags`) publishes to `latest` and pushes tags. Use the `--tag`/pre-mode flow above for prereleases so you don't overwrite the stable `latest`.

### Drafting the GitHub Release

Pushing the `maildev@<version>` tag triggers the [`.github/workflows/draft-release.yml`](.github/workflows/draft-release.yml) workflow, which extracts that version's section from `packages/cli/CHANGELOG.md` and opens a **draft** GitHub Release (marked pre-release while `.changeset/pre.json` exists). Review and publish it manually. Only the single `maildev@*` tag drives it — the five per-package tags are ignored, so each version drafts exactly one release.
