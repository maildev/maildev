# Connect your app to MailDev

MailDev runs a local SMTP server on port **1025** and a web inbox on **1080**.
Point your framework's mail transport at `localhost:1025` — no auth needed in
development — then watch mail arrive at `http://localhost:1080`.

## Install & run

```bash
npm install -g maildev && maildev
# or
docker run -p 1080:1080 -p 1025:1025 maildev/maildev
```

## Node.js (Nodemailer)

```javascript
const transport = nodemailer.createTransport({ host: 'localhost', port: 1025 })
await transport.sendMail({ from: 'app@example.com', to: 'user@test.com', subject: 'Hello', text: 'It works!' })
```

## Django

```python
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''
EMAIL_USE_TLS = False
```

## Ruby on Rails

```ruby
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: 'localhost',
  port: 1025,
  enable_starttls_auto: false
}
```

## Spring Boot

```properties
spring.mail.host=localhost
spring.mail.port=1025
spring.mail.properties.mail.smtp.auth=false
spring.mail.properties.mail.smtp.starttls.enable=false
```

## Anything else

MailDev speaks plain SMTP, so any language works the same way: send to
`localhost:1025` with auth and TLS off.

- REST API: https://github.com/maildev/maildev/blob/main/docs/rest.md
- Programmatic API: https://github.com/maildev/maildev/blob/main/docs/api.md
- HTTPS: https://github.com/maildev/maildev/blob/main/docs/https.md
- Reading your inbox with AI agents (MCP): https://maildev.github.io/maildev/mcp.md
