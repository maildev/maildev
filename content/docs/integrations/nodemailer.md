---
title: Nodemailer
description: Configure Nodemailer to send development mail to MailDev, switch transports per environment, and verify the connection before your app starts sending.
ogTitle: Using MailDev with Nodemailer
---

Nodemailer needs three settings to talk to MailDev, and two of them are defaults.

```js
import nodemailer from 'nodemailer'

const transport = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  // No `auth` and no `secure` — MailDev accepts anonymous plaintext SMTP.
})

await transport.sendMail({
  from: 'app@example.com',
  to: 'user@test.com',
  subject: 'Hello from MailDev',
  text: 'It works!',
  html: '<p>It <b>works</b>!</p>',
})
```

Open <http://localhost:1080> and the message is there.

## Switching by environment

The useful shape is one factory that returns a MailDev transport in development
and your real provider everywhere else, so nothing in your application code knows
the difference:

```js
function createMailTransport() {
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
  })
}
```

Reading host and port from the environment even in development is worth the extra
line: it is what lets the same code run against a
[Compose service](/docs/guides/docker/) or a
[CI service container](/docs/guides/testing-in-ci/), where MailDev is not on
`localhost`.

## Verify the connection

`verify()` opens a connection and runs the SMTP handshake without sending
anything — a fast way to distinguish "my template is broken" from "nothing is
listening":

```js
try {
  await transport.verify()
  console.log('SMTP ready')
} catch (error) {
  console.error('SMTP unavailable:', error.message)
}
```

## Attachments

MailDev parses attachments and offers them for download individually, so this is
a real way to check that a generated PDF or CSV is not corrupt:

```js
await transport.sendMail({
  from: 'app@example.com',
  to: 'user@test.com',
  subject: 'Your invoice',
  text: 'Attached.',
  attachments: [
    { filename: 'invoice.pdf', content: pdfBuffer },
    { filename: 'export.csv', path: './tmp/export.csv' },
  ],
})
```

## Inline images

`cid:` references resolve in the HTML preview, so an embedded logo renders in the
inbox exactly as it would in a mail client:

```js
await transport.sendMail({
  to: 'user@test.com',
  subject: 'With a logo',
  html: '<img src="cid:logo" alt="Logo" />',
  attachments: [{ filename: 'logo.png', path: './logo.png', cid: 'logo' }],
})
```

## TLS, if you must

MailDev advertises STARTTLS by default, so a transport with `requireTLS: true`
will upgrade and work. For implicit TLS you need to
[give MailDev a certificate](/docs/guides/https/) and relax verification on the
client:

```js
const transport = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  secure: true,
  tls: { rejectUnauthorized: false },
})
```

## React Email, MJML, and other template tools

These libraries produce an HTML string; MailDev is what you look at it in. Render,
then send:

```js
import { render } from '@react-email/render'
import { WelcomeEmail } from './emails/welcome'

await transport.sendMail({
  from: 'app@example.com',
  to: 'user@test.com',
  subject: 'Welcome',
  html: await render(<WelcomeEmail name="Ada" />),
  text: await render(<WelcomeEmail name="Ada" />, { plainText: true }),
})
```

The [responsive preview](/docs/web-ui/) is the part worth using here — a template
that looks right at desktop width and collapses at 320px is the most common email
bug there is.

## Testing

For assertions in a test suite, either read the
[REST API](/docs/reference/rest-api/) or skip the separate process entirely and
[embed MailDev](/docs/reference/node-api/) — its `new` event fires the moment a
message lands, which is much less fiddly than polling.

## Troubleshooting

**`ECONNREFUSED 127.0.0.1:1025`** — MailDev is not running, or it is in a
container and your app is not. See [Docker](/docs/guides/docker/).

**The send hangs, then times out.** The transport is trying implicit TLS against a
plaintext listener. Remove `secure: true`.

**`Missing credentials for "PLAIN"`** — you passed an `auth` object with empty
values. Omit `auth` entirely rather than supplying blanks.

**Mail goes nowhere and there is no error.** Check the port. Nodemailer defaults
to `587` when `port` is omitted, which is not where MailDev listens.
