---
title: Install MailDev
description: Run MailDev with npx, install it globally with npm, or pull the Docker image. Node.js 20 or newer is the only requirement.
permalink: /docs/install/
---

## Run it without installing

The fastest way to get an inbox. Nothing is added to your project or your global
`node_modules`:

```console
npx maildev
```

MailDev prints the two addresses it is listening on and stays in the foreground:

```
MailDev webapp running at http://0.0.0.0:1080
MailDev SMTP Server running at 0.0.0.0:1025
```

Open <http://localhost:1080> and leave it running while you work.

## Install globally

If you reach for MailDev often, a global install saves the download on every
run:

```console
npm install -g maildev
maildev
```

## Docker

No Node.js toolchain required:

```console
docker run -p 1080:1080 -p 1025:1025 maildev/maildev
```

See the [Docker guide](/docs/guides/docker/) for Compose, environment variables,
and the image's health check.

## As a project dependency

Adding MailDev to the project that needs it keeps the version pinned in your
lockfile, which matters most in CI:

```console
npm install --save-dev maildev
```

Then wire it into a script:

```json
{
  "scripts": {
    "dev:mail": "maildev",
    "dev": "concurrently \"npm:dev:*\""
  }
}
```

You can also [start and stop it from Node.js directly](/docs/reference/node-api/),
which is usually the better shape for integration tests.

## Requirements

- **Node.js 20 or newer** for the npm package. MailDev 3.0 is ESM-only.
- **Nothing** for the Docker image beyond a container runtime.

Ports `1025` and `1080` need to be free. Both are configurable — see
[`--smtp` and `--web`](/docs/reference/cli/) if something else already owns them.

## Verify the install

```console
maildev --version
```

And once it is running, the API's health endpoint answers without
authentication:

```console
curl http://localhost:1080/api/healthz
```

## Which version am I on?

MailDev 3.0 is a complete TypeScript rewrite: React web UI, Fastify API, and the
new MCP server. If you are upgrading from 2.x, the CLI flags are unchanged but
the [programmatic API moved from callbacks to promises](/docs/reference/node-api/).

:::note
Hit a regression in 3.0? The 2.x line is still available — `npm install -g maildev@2`
— and a report on the [issue tracker](https://github.com/maildev/maildev/issues)
is genuinely useful.
:::

## Next

Point an application at it: **[Quick start](/docs/quickstart/)**.
