---
title: Quick start
description: Point your app's mail transport at localhost:1025, send a message, and read it at localhost:1080. Copy-paste configuration for Node.js, Django, Rails, Laravel, Spring Boot, and anything else that speaks SMTP.
ogTitle: Connect your app to MailDev
permalink: /docs/quickstart/
updated: 2026-09-16
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
TLS off. Pick your stack below — the choice follows you through the rest of
this page, and other pages remember it too.

::::tabs framework
:::tab Nodemailer

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

:::
:::tab Django

```python
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''
EMAIL_USE_TLS = False
```

See the [Django guide](/docs/integrations/django/).

:::
:::tab Rails

```ruby
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: 'localhost',
  port: 1025,
  enable_starttls_auto: false
}
```

See the [Rails guide](/docs/integrations/rails/).

:::
:::tab Laravel

```ini
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
```

See the [Laravel guide](/docs/integrations/laravel/).

:::
:::tab Spring Boot

```properties
spring.mail.host=localhost
spring.mail.port=1025
spring.mail.properties.mail.smtp.auth=false
spring.mail.properties.mail.smtp.starttls.enable=false
```

:::
::::

## 3. Send a test message

If you would rather check MailDev before touching your app, send something by
hand — using the same stack you picked above:

::::tabs framework
:::tab Nodemailer

```js
// save as send-test.js, then: node send-test.js
const nodemailer = require('nodemailer')

const transport = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
})

transport.sendMail({
  from: 'app@example.com',
  to: 'user@test.com',
  subject: 'Hello from MailDev',
  text: 'It works!',
}).then(() => console.log('Sent — check http://localhost:1080'))
```

:::
:::tab Django

```console
python manage.py shell
```

```python
from django.core.mail import send_mail

send_mail(
    'Hello from MailDev',
    'It works!',
    'app@example.com',
    ['user@test.com'],
)
```

:::
:::tab Rails

```console
bin/rails runner
```

```ruby
ActionMailer::Base.mail(
  from: 'app@example.com',
  to: 'user@test.com',
  subject: 'Hello from MailDev',
  body: 'It works!'
).deliver_now
```

:::
:::tab Laravel

```console
php artisan tinker
```

```php
Mail::raw('It works!', function ($message) {
    $message->to('user@test.com')
        ->from('app@example.com')
        ->subject('Hello from MailDev');
});
```

:::
:::tab Spring Boot

```java
// With spring-boot-starter-mail on the classpath, run from a test or a
// CommandLineRunner:
@Autowired JavaMailSender mailSender;

// ...
SimpleMailMessage message = new SimpleMailMessage();
message.setFrom("app@example.com");
message.setTo("user@test.com");
message.setSubject("Hello from MailDev");
message.setText("It works!");
mailSender.send(message);
```

:::
::::

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
