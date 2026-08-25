---
title: Docker & Docker Compose
description: Run MailDev as a container, wire it into a Compose stack so your app can reach it by service name, pass CLI flags and environment variables, and use the built-in health check.
ogTitle: Running MailDev with Docker
---

The official image is [`maildev/maildev`](https://hub.docker.com/r/maildev/maildev)
on Docker Hub. It is built on `node:22-alpine`, runs as the unprivileged `node`
user, and exposes the same two ports as the npm package.

## Run it

```console
docker run -p 1080:1080 -p 1025:1025 maildev/maildev
```

Give it a name so you can stop and start it again:

```console
docker run -d --name maildev -p 1080:1080 -p 1025:1025 maildev/maildev
docker stop maildev
docker start maildev
```

## Passing flags

The image's entrypoint is the MailDev binary, so anything after the image name
goes straight to the CLI:

```console
docker run -p 1080:1080 -p 1025:1025 maildev/maildev --base-pathname /maildev --max-emails 200
```

## Environment variables

Every CLI flag has an environment-variable equivalent, which is usually the
better fit for a container. The image sets three by default:

| Variable | Default | Meaning |
| --- | --- | --- |
| `MAILDEV_WEB_PORT` | `1080` | Web UI, REST API, and MCP endpoint |
| `MAILDEV_SMTP_PORT` | `1025` | SMTP listener |
| `TZ` | `UTC` | Timezone used for displayed timestamps |

Set `TZ` if you want received timestamps in your own timezone:

```console
docker run -p 1080:1080 -p 1025:1025 -e TZ=Europe/Berlin maildev/maildev
```

The [CLI reference](/docs/reference/cli/) lists every other variable.

## Docker Compose

The important part is that **your app must reach MailDev by service name, not
`localhost`**. Inside a container, `localhost` is that container.

```yaml
services:
  maildev:
    image: maildev/maildev
    ports:
      - '1080:1080'
    # The SMTP port does not need publishing if only other
    # services in this stack send mail.

  app:
    build: .
    environment:
      SMTP_HOST: maildev
      SMTP_PORT: 1025
    depends_on:
      maildev:
        condition: service_healthy
```

`condition: service_healthy` works because the image ships a health check — see
below. Publishing `1080` but not `1025` is the shape you usually want: you need
the inbox in your browser, but only sibling containers need to send mail.

## Reaching MailDev from the host

If MailDev runs in Compose and your app runs on the host, publish the SMTP port
(`- '1025:1025'`) and send to `localhost:1025` as usual.

## Reaching the host from MailDev's container

The reverse — an app on the host, MailDev in a container — needs no special
setup, but if you configure [relaying](/docs/reference/cli/) to an SMTP server on
the host, use `host.docker.internal` rather than `localhost` on Docker Desktop.
On Linux, add:

```yaml
    extra_hosts:
      - 'host.docker.internal:host-gateway'
```

## Health check

The image defines its own `HEALTHCHECK`, so orchestrators know when MailDev is
ready:

| Setting | Value |
| --- | --- |
| Interval | 10s |
| Timeout | 5s |
| Start period | 5s |
| Retries | 3 |

It probes the API's `/api/healthz` endpoint, honors `MAILDEV_BASE_PATHNAME`, and
falls back to a plain TCP check on the SMTP port when the web UI is disabled with
`--disable-web`. You can query the same endpoint yourself:

```console
docker exec maildev node dist/bin/healthcheck.js
curl http://localhost:1080/api/healthz
```

## Persisting mail across restarts

By default messages live in memory and vanish when the container stops. Mount a
volume and point `--mail-directory` at it to keep them:

```yaml
services:
  maildev:
    image: maildev/maildev
    ports:
      - '1080:1080'
    environment:
      MAILDEV_MAIL_DIRECTORY: /home/node/mail
      MAILDEV_MAX_EMAILS: '500'
    volumes:
      - maildev-mail:/home/node/mail

volumes:
  maildev-mail:
```

The container runs as `node` (uid 1000), so the mount has to be writable by that
user. `MAILDEV_MAX_EMAILS` caps the store and evicts the oldest messages once the
limit is reached — worth setting on a persistent volume so a long-running stack
does not grow without bound.

## Kubernetes

Nothing about MailDev is Kubernetes-specific: one Deployment, one Service
exposing `1025` and `1080`, and the same health endpoint for both probes.

```yaml
readinessProbe:
  httpGet:
    path: /api/healthz
    port: 1080
livenessProbe:
  httpGet:
    path: /api/healthz
    port: 1080
```

:::warn
MailDev has no authentication by default and accepts mail from anyone who can
reach the port. Keep it inside your cluster or development network — never behind
a public ingress. If you must expose the UI, put
[basic auth](/docs/reference/cli/) on it with `--web-user` and `--web-pass`.
:::
