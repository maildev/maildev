---
title: Django
description: Configure Django's email backend to send development mail to MailDev, keep production settings separate, and test outgoing email with the Django test client.
ogTitle: Using MailDev with Django
---

Django's SMTP backend needs four settings. Add them to your development settings
module:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''
EMAIL_USE_TLS = False
EMAIL_USE_SSL = False
DEFAULT_FROM_EMAIL = 'app@example.com'
```

`EMAIL_BACKEND` is the SMTP backend by default, so that line is optional — but
being explicit helps if something else in your settings chain has swapped it for
the console or locmem backend.

## Reading it from the environment

The version that also works in [Docker](/docs/guides/docker/) and
[CI](/docs/guides/testing-in-ci/), where MailDev is not on `localhost`:

```python
import os

EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 1025))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'false').lower() == 'true'
```

With `django-environ`, a single `EMAIL_URL` covers it:

```python
import environ

env = environ.Env()
vars().update(env.email_url('EMAIL_URL', default='smtp://localhost:1025'))
```

## Send a test message

The shell is the quickest check:

```console
python manage.py shell
```

```python
from django.core.mail import send_mail

send_mail(
    subject='Hello from MailDev',
    message='It works!',
    from_email='app@example.com',
    recipient_list=['user@test.com'],
)
```

Or use the management command, which exists precisely for this:

```console
python manage.py sendtestemail user@test.com
```

## HTML email

MailDev shows the HTML part, the plain-text alternative, and the raw source
separately, which makes it easy to notice that your text fallback is empty:

```python
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

context = {'name': 'Ada'}
text_body = render_to_string('emails/welcome.txt', context)
html_body = render_to_string('emails/welcome.html', context)

message = EmailMultiAlternatives(
    subject='Welcome',
    body=text_body,
    from_email='app@example.com',
    to=['user@test.com'],
)
message.attach_alternative(html_body, 'text/html')
message.send()
```

## Attachments

```python
message.attach_file('reports/summary.pdf')
message.attach('data.csv', csv_string, 'text/csv')
```

Both appear in the inbox as downloadable files, so you can open the PDF your view
actually generated rather than trusting that it worked.

## Password reset and other built-in mail

Django's auth views send through the same backend, so
`django.contrib.auth`'s password-reset flow lands in MailDev with no extra
configuration. That is the fastest way to check a customized
`registration/password_reset_email.html` — trigger the flow, read the message, and
click the link straight out of the HTML preview.

## Testing

For unit tests, Django's `locmem` backend and `mail.outbox` are the right tool —
they need no external process and the test suite sets them up automatically.

MailDev earns its place in **end-to-end** tests, where the mail is sent by a real
server process that your test cannot reach into. Point the app at MailDev and read
the [REST API](/docs/reference/rest-api/):

```python
import time
import requests

MAILDEV = 'http://localhost:1080'


def wait_for_email(subject, timeout=10):
    deadline = time.time() + timeout
    while time.time() < deadline:
        response = requests.get(f'{MAILDEV}/api/email/summary', params={'search': subject})
        items = response.json()['items']
        if items:
            return requests.get(f'{MAILDEV}/api/email/{items[0]["id"]}').json()
        time.sleep(0.2)
    raise AssertionError(f'No email matching {subject!r} arrived')


def clear_inbox():
    requests.delete(f'{MAILDEV}/api/email/all')
```

More patterns in [testing email in CI](/docs/guides/testing-in-ci/).

## Celery

If you send mail from a Celery task, the worker needs the same settings — it is a
separate process. Check that it loads the development settings module, or the
worker will silently try your production SMTP host.

## Troubleshooting

**`ConnectionRefusedError: [Errno 111]`** — MailDev is not running, or Django is
in a container and pointing at its own `localhost`.

**`SMTPNotSupportedError: STARTTLS extension not supported`** — you have
`EMAIL_USE_TLS = True` against a listener that does not require it. Set it to
`False`, or [configure TLS on MailDev](/docs/guides/https/).

**Nothing arrives and no error is raised.** Something set
`EMAIL_BACKEND` to `console` or `locmem` — check your settings chain, including
anything a test runner injects.
