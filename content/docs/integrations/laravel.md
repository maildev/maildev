---
title: Laravel
description: Configure Laravel's mail driver to send development email to MailDev, use Mailable previews alongside it, and assert on delivered mail in Dusk and Pest tests.
ogTitle: Using MailDev with Laravel
---

Laravel reads its mail configuration from the environment. Add this to `.env`:

```ini
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="app@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

Then clear the config cache, or Laravel will keep using the old values:

```console
php artisan config:clear
```

:::note
Use `127.0.0.1` rather than `localhost`. On some systems `localhost` resolves to
IPv6 `::1` first, and if MailDev is bound to IPv4 only you get a connection
refused that looks like MailDev is down when it is not.
:::

Older Laravel versions use `MAIL_DRIVER` instead of `MAIL_MAILER`. If the setting
appears to have no effect, check which one `config/mail.php` reads.

## Send a test message

Tinker is the quickest path:

```console
php artisan tinker
```

```php
Mail::raw('It works!', function ($message) {
    $message->to('user@test.com')->subject('Hello from MailDev');
});
```

## Mailables

```php
class OrderShipped extends Mailable
{
    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your order has shipped');
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.orders.shipped',
            text: 'mail.orders.shipped-text',
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromPath(storage_path('invoices/' . $this->order->id . '.pdf'))
                ->as('invoice.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
```

```php
Mail::to($order->user)->send(new OrderShipped($order));
```

MailDev shows the rendered markdown-mail HTML, the text alternative, and the PDF
as a downloadable attachment — so you can confirm the invoice your job generated
is a valid file, not just that the code path ran.

## Previews versus MailDev

Laravel can render a Mailable straight from a route, which is a fast loop while
you are working on markup:

```php
Route::get('/mail/preview', fn () => new OrderShipped(Order::first()));
```

That renders a template. MailDev shows the message that was actually delivered —
final headers, both MIME parts, encoded attachments — and lets you click the links
in it. Use both.

## Queued mail

`Mail::queue()` and queued Mailables only reach MailDev once a worker processes
the job. Either run one:

```console
php artisan queue:work
```

or use the sync driver in development:

```ini
QUEUE_CONNECTION=sync
```

This is the single most common reason mail "disappears" in a Laravel app during
development.

## Sail and Docker

Laravel Sail ships with Mailpit by default. To use MailDev instead, add it as a
service in `docker-compose.yml`:

```yaml
    maildev:
        image: 'maildev/maildev'
        ports:
            - '1080:1080'
        networks:
            - sail
```

and point the app at it by **service name**, since `127.0.0.1` inside the app
container is the app container:

```ini
MAIL_HOST=maildev
MAIL_PORT=1025
```

See the [Docker guide](/docs/guides/docker/) for the general rule.

## Testing

For unit tests, `Mail::fake()` and `Mail::assertSent()` are the right tool — no
external process, and assertions on the Mailable itself.

MailDev belongs in **browser and end-to-end tests**, where mail leaves a real
server process. Read the [REST API](/docs/reference/rest-api/):

```php
function clearInbox(): void
{
    Http::delete('http://localhost:1080/api/email/all');
}

function waitForEmail(string $subject, int $timeoutMs = 10000): array
{
    $deadline = microtime(true) + $timeoutMs / 1000;

    while (microtime(true) < $deadline) {
        $items = Http::get('http://localhost:1080/api/email/summary', [
            'search' => $subject,
        ])->json('items');

        if (! empty($items)) {
            return Http::get('http://localhost:1080/api/email/' . $items[0]['id'])->json();
        }

        usleep(200_000);
    }

    throw new RuntimeException("No email matching '{$subject}' arrived");
}
```

A Pest test using them:

```php
it('emails a verification link on registration', function () {
    clearInbox();

    $this->post('/register', [
        'email' => 'new-user@test.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $email = waitForEmail('Verify');

    expect($email['subject'])->toContain('Verify')
        ->and($email['html'])->toContain('/verify-email/');
});
```

More patterns in [testing email in CI](/docs/guides/testing-in-ci/).

## Symfony Mailer directly

Laravel's mail layer sits on Symfony Mailer, so the underlying DSN form works
anywhere Symfony Mailer is used — including a plain Symfony app:

```ini
MAILER_DSN=smtp://127.0.0.1:1025
```

## Troubleshooting

**`Connection could not be established with host "127.0.0.1:1025"`** — MailDev is
not running, or you are inside a container. Check both.

**Changes to `.env` have no effect.** Run `php artisan config:clear`. A cached
config file overrides the environment.

**`Expected response code 250 but got an empty response`** — usually
`MAIL_ENCRYPTION` is set to `tls` against a plaintext listener. Set it to `null`,
or [configure TLS on MailDev](/docs/guides/https/).

**Nothing arrives from a job or notification.** No queue worker is running. Set
`QUEUE_CONNECTION=sync` or start `queue:work`.
