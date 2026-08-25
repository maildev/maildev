---
title: Testing email in CI
description: Run MailDev as a GitHub Actions service container, assert on delivered mail over the REST API, and write end-to-end email tests with Playwright, Cypress, or Vitest.
ogTitle: Testing email in CI with MailDev
---

Email is one of the easier things to test end-to-end, once you have somewhere for
it to land. MailDev gives you an SMTP endpoint your app can send to and an HTTP
API your test can read from — which means "did the signup email arrive, and does
its link work?" becomes an ordinary assertion.

## The pattern

1. Start MailDev before the suite.
2. Clear the inbox before each test that cares about mail.
3. Trigger the action in your app.
4. Poll the [REST API](/docs/reference/rest-api/) until the message shows up.
5. Assert on it — subject, recipient, body, or a link extracted from the HTML.

Step 4 needs a poll rather than a single read: SMTP delivery is asynchronous, so
the request that triggered the mail usually returns before MailDev has it.

## A reusable helper

```ts
const MAILDEV = process.env.MAILDEV_URL ?? 'http://localhost:1080'

export async function clearInbox() {
  await fetch(`${MAILDEV}/api/email/all`, { method: 'DELETE' })
}

export async function waitForEmail(
  match: { to?: string; subject?: string },
  { timeout = 10_000, interval = 200 } = {},
) {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    const params = new URLSearchParams({ limit: '50' })
    if (match.subject) params.set('search', match.subject)

    const response = await fetch(`${MAILDEV}/api/email/summary?${params}`)
    const { items } = await response.json()

    const hit = items.find(
      (email) =>
        (!match.to || email.to.some((address) => address.address === match.to)) &&
        (!match.subject || email.subject.includes(match.subject)),
    )

    if (hit) {
      // The summary is a projection; fetch the full message for its body.
      const full = await fetch(`${MAILDEV}/api/email/${hit.id}`)
      return full.json()
    }

    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`No email matching ${JSON.stringify(match)} within ${timeout}ms`)
}

export function firstLink(html: string) {
  return html.match(/href="(https?:\/\/[^"]+)"/)?.[1]
}
```

## Vitest or Jest

```ts
import { beforeEach, expect, test } from 'vitest'
import { clearInbox, firstLink, waitForEmail } from './maildev'

beforeEach(clearInbox)

test('signup sends a verification email', async () => {
  await app.post('/signup').send({ email: 'new-user@test.com' })

  const email = await waitForEmail({ to: 'new-user@test.com', subject: 'Verify' })

  expect(email.subject).toBe('Verify your email address')
  expect(email.html).toContain('Confirm my address')
  expect(firstLink(email.html)).toMatch(/\/verify\?token=/)
})
```

## Playwright

The interesting version does not stop at reading the email — it follows the link,
which tests the whole loop:

```ts
import { expect, test } from '@playwright/test'
import { clearInbox, firstLink, waitForEmail } from './maildev'

test.beforeEach(clearInbox)

test('a new user can verify their address', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('Email').fill('new-user@test.com')
  await page.getByRole('button', { name: 'Create account' }).click()

  const email = await waitForEmail({ to: 'new-user@test.com' })
  await page.goto(firstLink(email.html)!)

  await expect(page.getByText('Your address is verified')).toBeVisible()
})
```

## Cypress

Cypress runs assertions in the browser, so the API calls go through `cy.request`:

```js
Cypress.Commands.add('clearInbox', () =>
  cy.request('DELETE', `${Cypress.env('maildevUrl')}/api/email/all`),
)

Cypress.Commands.add('lastEmail', () =>
  cy
    .request(`${Cypress.env('maildevUrl')}/api/email/summary?limit=1`)
    .its('body.items.0')
    .then((summary) => {
      expect(summary, 'an email was received').to.exist
      return cy.request(`${Cypress.env('maildevUrl')}/api/email/${summary.id}`).its('body')
    }),
)
```

Cypress retries `cy.request` chains, so `cy.lastEmail()` inside a `should` block
gets polling behavior for free.

## GitHub Actions

A service container is the cleanest way to get MailDev into a workflow — it is up
before your steps run, and it goes away afterward:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      maildev:
        image: maildev/maildev
        ports:
          - 1025:1025
          - 1080:1080
        options: >-
          --health-cmd "node dist/bin/healthcheck.js"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      SMTP_HOST: localhost
      SMTP_PORT: 1025
      MAILDEV_URL: http://localhost:1080
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
```

If your job itself runs in a container, `localhost` will not reach the service —
use the service name `maildev` instead.

## GitLab CI

```yaml
test:
  image: node:22
  services:
    - name: maildev/maildev
      alias: maildev
  variables:
    SMTP_HOST: maildev
    SMTP_PORT: '1025'
    MAILDEV_URL: http://maildev:1080
  script:
    - npm ci
    - npm test
```

## Or skip the container entirely

For a Node.js test suite, starting MailDev in-process is faster and needs no
service definition at all — no ports to publish, no readiness race:

```ts
import MailDev from 'maildev'

const maildev = new MailDev({ smtp: 1025, disableWeb: true })
await maildev.start()

maildev.on('new', (email) => {
  console.log('caught', email.subject)
})

// ...run tests...
await maildev.stop()
```

The `new` event removes the polling problem completely — you get a callback the
moment a message arrives. See the
[programmatic API](/docs/reference/node-api/) for the full surface.

## Keeping CI fast

- **`--disable-web`** skips serving the UI. Nothing in CI is looking at it.
- **`--max-emails 200`** bounds memory on a long suite.
- **`--silent`** keeps the log clean; `--verbose` is what you want when a test is failing mysteriously.
- **Clear between tests, not after.** A failed test that leaves mail behind is easier to debug when the inbox is still there.
