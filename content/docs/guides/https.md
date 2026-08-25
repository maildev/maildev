---
title: HTTPS & TLS
description: Serve the MailDev web inbox over HTTPS with a self-signed certificate, and configure TLS on the SMTP listener for clients that insist on an encrypted connection.
ogTitle: Serving MailDev over HTTPS
---

There are two independent TLS surfaces in MailDev, and they are configured
separately:

- **The web inbox** on port 1080 — `--https`, `--https-key`, `--https-cert`.
- **The SMTP listener** on port 1025 — `--incoming-secure`, `--incoming-key`, `--incoming-cert`.

Most people want the second one, and only because a mail library refuses to talk
plaintext.

## Generate a certificate

For local development a self-signed certificate is fine:

```console
openssl req -nodes -new -x509 -keyout key.pem -out cert.pem -days 365
```

You will be prompted for a handful of fields. The one that matters is **Common
Name** — set it to the hostname you will actually use (`localhost` is the usual
answer). A mismatch here is what produces the "certificate name does not match"
errors later.

To skip the prompts entirely:

```console
openssl req -nodes -new -x509 -days 365 -keyout key.pem -out cert.pem -subj "/CN=localhost"
```

## HTTPS for the web inbox

```console
maildev --https --https-key key.pem --https-cert cert.pem
```

The inbox is now at `https://localhost:1080`. Your browser will warn that the
certificate is not trusted — expected for a self-signed certificate. Accept it
once and the warning goes away for that host.

The environment-variable form, which is easier in Compose:

```yaml
environment:
  MAILDEV_HTTPS: 'true'
  MAILDEV_HTTPS_KEY: /certs/key.pem
  MAILDEV_HTTPS_CERT: /certs/cert.pem
```

:::note
Enabling HTTPS changes the scheme for the [REST API](/docs/reference/rest-api/)
and the [MCP endpoint](/docs/ai/mcp/) too, since they are served by the same
process. Update any client that hardcodes `http://localhost:1080`. With a
self-signed certificate, non-browser clients typically also need their TLS
verification relaxed — `curl -k`, or `NODE_TLS_REJECT_UNAUTHORIZED=0` for Node.
:::

## TLS on the SMTP listener

Some mail libraries will not connect without encryption, and a few make it
awkward to turn off. Give the SMTP server a certificate:

```console
maildev --incoming-secure --incoming-cert cert.pem --incoming-key key.pem
```

`--incoming-secure` makes the listener use implicit TLS from the first byte,
which is what clients configured for port 465 expect. Point your client at port
1025 with SSL/TLS enabled — and, for a self-signed certificate, with certificate
verification disabled:

```js
const transport = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  secure: true,
  tls: { rejectUnauthorized: false },
})
```

STARTTLS is advertised by default without any of this, so a client that upgrades
opportunistically needs no configuration at all. If you would rather MailDev did
not advertise it, hide the extension:

```console
maildev --hide-extensions STARTTLS
```

## Terminating TLS at a proxy instead

If MailDev already sits behind nginx, Traefik, or Caddy, let the proxy own the
certificate and leave MailDev on plain HTTP. Set `--base-pathname` to match the
prefix the proxy mounts it under so the UI's asset and API URLs resolve:

```console
maildev --base-pathname /maildev
```

```nginx
location /maildev/ {
  proxy_pass http://127.0.0.1:1080;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

The `Upgrade` and `Connection` headers are not optional — the inbox uses a
websocket for live updates, and without them new mail will not appear until you
reload.

:::warn
TLS is not a substitute for access control. MailDev has no authentication unless
you set `--web-user` and `--web-pass`, and even then it is a development tool
holding plaintext mail. Do not put it on the public internet.
:::
