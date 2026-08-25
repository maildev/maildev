---
title: Quick start
description: Point your app's mail transport at localhost:1025, send a message, and read it at localhost:1080. Copy-paste configuration for Node.js, Django, Rails, Laravel, Spring Boot, and anything else that speaks SMTP.
ogTitle: Connect your app to MailDev
permalink: /docs/quickstart/
---

MailDev runs an SMTP server on port **1025** and a web inbox on **1080**. Point
your framework's mail transport at `localhost:1025` — no authentication, no TLS —
then watch mail arrive at `http://localhost:1080`.

## 1. Start MailDev

```console
npx maildev
```

Leave it running. Every other step assumes it is up.

## 2. Point your app at it

The universal answer is three settings: host `localhost`, port `1025`, auth and
TLS off. Here is what that looks like in the common stacks.

### Node.js (Nodemailer)

```js
// No auth or TLS needed against MailDev in development
const transport = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
})

await transport.sendMail({
  from: 'app@example.com',
  to: 'user@test.com',
  subject: 'Hello from MailDev',
  text: 'It works!',
})
```

More detail, including how to switch transports per environment, in the
[Nodemailer guide](/docs/integrations/nodemailer/).

### Django

```python
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''
EMAIL_USE_TLS = False
```

See the [Django guide](/docs/integrations/django/).

### Ruby on Rails

```ruby
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: 'localhost',
  port: 1025,
  enable_starttls_auto: false
}
```

See the [Rails guide](/docs/integrations/rails/).

### Laravel

```ini
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
```

See the [Laravel guide](/docs/integrations/laravel/).

### Spring Boot

```properties
spring.mail.host=localhost
spring.mail.port=1025
spring.mail.properties.mail.smtp.auth=false
spring.mail.properties.mail.smtp.starttls.enable=false
```

## 3. Send a test message

If you would rather check MailDev before touching your app, send something by
hand. With Python's standard library:

```python
import smtplib
from email.message import EmailMessage

message = EmailMessage()
message['From'] = 'app@example.com'
message['To'] = 'user@test.com'
message['Subject'] = 'Hello from MailDev'
message.set_content('It works!')

with smtplib.SMTP('localhost', 1025) as smtp:
    smtp.send_message(message)
```

Or with `curl`, which speaks SMTP:

```console
curl smtp://localhost:1025 --mail-from app@example.com --mail-rcpt user@test.com \
  --upload-file - <<< $'Subject: Hello from MailDev\r\n\r\nIt works!'
```

## 4. Read it

Open <http://localhost:1080>. The message appears immediately — the inbox is
pushed over a websocket, so there is nothing to refresh.

For each message you get the rendered HTML, the plain-text alternative, the raw
source with full headers, attachments, and a responsive preview at phone and
tablet widths. Details in [the web inbox](/docs/web-ui/).

## Anything else

MailDev speaks plain SMTP, so any language or framework works the same way. If
your stack is not listed above, look for the setting that overrides the mail host
and port, and turn off authentication and STARTTLS.

- [REST API](/docs/reference/rest-api/) — read and assert on mail from a test suite
- [Programmatic API](/docs/reference/node-api/) — embed MailDev in a Node.js process
- [Testing email in CI](/docs/guides/testing-in-ci/) — run it as a service container
- [MCP server](/docs/ai/mcp/) — let an AI agent read the inbox

## Troubleshooting

**Connection refused.** MailDev is not running, or it is bound somewhere your app
cannot reach. Inside Docker, `localhost` is the container — use the service name
or `host.docker.internal`; see the [Docker guide](/docs/guides/docker/).

**The app hangs when sending.** Almost always a TLS mismatch: the client is
trying to negotiate STARTTLS or connect over implicit TLS. Turn encryption off
for development, or configure [SMTP TLS](/docs/guides/https/) on MailDev.

**Mail sends but the inbox is empty.** Check which port your app actually used.
Frameworks default to `25` or `587`, and a stray default will silently connect
somewhere else — or nowhere.

**Authentication failures.** MailDev accepts anonymous mail unless you set
`--incoming-user` and `--incoming-pass`. Some clients insist on sending
credentials anyway; MailDev accepts any credentials when none are configured.
