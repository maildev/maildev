---
title: Ruby on Rails
description: Point Action Mailer at MailDev in development, preview mailers in the browser, and assert on delivered mail in system tests.
ogTitle: Using MailDev with Ruby on Rails
---

Add this to `config/environments/development.rb`:

```ruby
config.action_mailer.delivery_method = :smtp
config.action_mailer.perform_deliveries = true
config.action_mailer.raise_delivery_errors = true
config.action_mailer.default_url_options = { host: 'localhost', port: 3000 }

config.action_mailer.smtp_settings = {
  address: 'localhost',
  port: 1025,
  enable_starttls_auto: false
}
```

`enable_starttls_auto: false` is the line people miss. Without it, Action Mailer
opportunistically upgrades the connection, and depending on your Ruby and
OpenSSL versions that can fail against a self-signed or absent certificate.

`raise_delivery_errors = true` is worth having in development: Rails swallows
delivery failures by default, so a misconfigured host produces silence rather
than an exception.

## Reading it from the environment

```ruby
config.action_mailer.smtp_settings = {
  address: ENV.fetch('SMTP_HOST', 'localhost'),
  port: ENV.fetch('SMTP_PORT', 1025).to_i,
  enable_starttls_auto: false
}
```

Necessary as soon as Rails or MailDev runs in a container — see
[Docker](/docs/guides/docker/).

## Send a test message

```console
bin/rails console
```

```ruby
ActionMailer::Base.mail(
  from: 'app@example.com',
  to: 'user@test.com',
  subject: 'Hello from MailDev',
  body: 'It works!'
).deliver_now
```

## Mailer previews versus MailDev

Rails has built-in mailer previews at `/rails/mailers`, and they are genuinely
useful — but they render a template, they do not deliver a message. MailDev shows
you the message that actually went over the wire: final headers, the MIME
structure Rails built, both body parts, and the attachments as they were encoded.

Use previews while you iterate on markup; use MailDev to confirm what the
application really sends, and to click through the links in it.

## Multipart mail

Give a mailer both `.html.erb` and `.text.erb` templates and Action Mailer builds
a `multipart/alternative` message. MailDev shows each part separately, which is
how you notice that your text alternative is still the scaffold placeholder:

```ruby
class UserMailer < ApplicationMailer
  default from: 'app@example.com'

  def welcome(user)
    @user = user
    mail(to: @user.email, subject: 'Welcome')
  end
end
```

## Attachments

```ruby
def invoice(user, pdf)
  attachments['invoice.pdf'] = pdf
  attachments.inline['logo.png'] = File.read(Rails.root.join('app/assets/images/logo.png'))
  mail(to: user.email, subject: 'Your invoice')
end
```

Inline attachments referenced with `cid:` render in MailDev's HTML preview, so an
embedded logo shows up rather than appearing as a broken image.

## Devise

Devise sends through Action Mailer, so confirmation, password-reset, and unlock
emails land in MailDev with no additional configuration. Make sure
`config.action_mailer.default_url_options` is set — otherwise the links in those
emails have no host and are unusable.

## Active Job

If deliveries are enqueued with `deliver_later`, mail only reaches MailDev once a
job actually runs. In development, either use the inline adapter or keep a worker
running:

```ruby
config.active_job.queue_adapter = :inline
```

## System tests

For unit tests, `ActionMailer::Base.deliveries` is the right tool and needs no
external process.

MailDev is for the end-to-end case, where a real server process sends the mail.
Read the [REST API](/docs/reference/rest-api/):

```ruby
require 'net/http'
require 'json'

MAILDEV = URI('http://localhost:1080')

def clear_inbox
  Net::HTTP.start(MAILDEV.host, MAILDEV.port) do |http|
    http.request(Net::HTTP::Delete.new('/api/email/all'))
  end
end

def wait_for_email(subject, timeout: 10)
  deadline = Time.now + timeout
  while Time.now < deadline
    response = Net::HTTP.get(URI("#{MAILDEV}/api/email/summary?search=#{URI.encode_www_form_component(subject)}"))
    items = JSON.parse(response)['items']
    return JSON.parse(Net::HTTP.get(URI("#{MAILDEV}/api/email/#{items.first['id']}"))) if items.any?

    sleep 0.2
  end
  raise "No email matching #{subject.inspect} arrived"
end
```

More patterns in [testing email in CI](/docs/guides/testing-in-ci/).

## Letter Opener, and why you might still want MailDev

`letter_opener` writes each message to disk and opens it in a browser tab. It is
frictionless for a solo Rails app.

MailDev is the better fit when mail comes from more than one service, when you
want an inbox rather than a stream of tabs, when you need to assert on delivery
from a test suite over HTTP, or when you want an
[AI agent to read the mail](/docs/ai/mcp/). They also compose fine — nothing stops
you using previews, `letter_opener`, and MailDev on different environments.

## Troubleshooting

**`Errno::ECONNREFUSED`** — MailDev is not running, or the address is wrong for
your container setup.

**`EOFError` or an OpenSSL error on delivery** — `enable_starttls_auto` is still
`true`. Set it to `false`.

**Mail never arrives, no error.** Either `perform_deliveries` is `false`, or the
delivery method is still `:test` (the default in the test environment), or a
`deliver_later` job is sitting in a queue with no worker.
