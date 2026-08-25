---
title: Programmatic API
description: >-
  Embed MailDev in a Node.js application or test suite: construct a server, listen for mail events, read and delete messages, and swap the storage backend.
ogTitle: MailDev programmatic Node.js API
permalink: /docs/reference/node-api/
sourceUrl: >-
  https://github.com/maildev/maildev/blob/main/docs/api.md
---
<!-- Vendored from maildev/maildev docs/api.md (sha256:ee4d5a68dd3d).
     Do not edit here: run `make sync-docs` after changing it upstream. -->

MailDev v3 provides a modern TypeScript API for embedding into your Node.js applications. The API uses async/await patterns throughout.

## Quick Start

```typescript
import { MailDev } from 'maildev'

const maildev = new MailDev({
  smtp: 1025,
  web: 1080,
})

await maildev.start()

// Access server instances
const servers = maildev.getServers()

// Listen for new emails
servers.smtp.on('new', (email) => {
  console.log('Received:', email.subject)
})

// Stop when done
await maildev.stop()
```

## Installation

```bash
npm install maildev
```

## MailDev Class

The `MailDev` class provides the simplest way to run MailDev programmatically.

### Constructor Options

```typescript
import { MailDev } from 'maildev'

const maildev = new MailDev({
  // SMTP Server
  smtp: 1025,              // SMTP port (default: 1025)
  ip: '::',                // SMTP bind address (default: '::')

  // Web/API Server
  web: 1080,               // Web UI port (default: 1080)
  webIp: '0.0.0.0',        // Web bind address (default: '0.0.0.0')
  disableWeb: false,       // Disable web interface
  basePathname: '/',       // Base path for web interface

  // Storage
  mailDirectory: '/tmp/maildev',  // Persist emails to disk (optional)
  maxEmails: 0,            // Keep at most this many emails (0 = unlimited, default)

  // Authentication
  incomingUser: 'user',    // SMTP auth username
  incomingPass: 'pass',    // SMTP auth password
  webUser: 'admin',        // Web UI username
  webPass: 'admin',        // Web UI password

  // Relay (outgoing mail)
  outgoingHost: 'smtp.example.com',
  outgoingPort: 587,
  outgoingUser: 'user',
  outgoingPass: 'pass',
  outgoingSecure: true,
  autoRelay: true,         // Auto-forward emails

  // Logging
  verbose: false,
  silent: false,
  logMailContents: false,

  // MCP (Claude integration)
  mcp: true,               // Enable MCP server at /mcp endpoint
})
```

### Methods

**start()** - Start all servers (async)
```typescript
const servers = await maildev.start()
// servers.smtp - SMTP server instance
// servers.storage - Storage instance
// servers.api - API server instance (if not disabled)
```

**stop()** - Stop all servers gracefully (async)
```typescript
await maildev.stop()
```

**isRunning()** - Check if servers are running
```typescript
if (maildev.isRunning()) {
  console.log('MailDev is running')
}
```

**getServers()** - Get server instances
```typescript
const servers = maildev.getServers()
```

## Working with Emails

Once MailDev is running, you can access emails through the SMTP server instance.

### Listening for New Emails

```typescript
const maildev = new MailDev()
const { smtp } = await maildev.start()

smtp.on('new', (email) => {
  console.log('New email received!')
  console.log('From:', email.from[0].address)
  console.log('To:', email.to.map(t => t.address).join(', '))
  console.log('Subject:', email.subject)
  console.log('Text:', email.text)
  console.log('HTML:', email.html)
})
```

### Limiting how many emails are kept

MailDev keeps every email by default (`maxEmails: 0`). Set a positive
`maxEmails` and it keeps the newest that many messages, discarding the oldest as
new mail arrives. When emails are persisted to disk, the `.eml` file and any
attachments are deleted along with the message, so the mail directory stays
bounded too.

```typescript
const maildev = new MailDev({
  mailDirectory: '/var/mail/maildev',
  maxEmails: 5000,
})
```

`maxEmails: 0` (the default) keeps everything. Be aware that both memory use and
the mail directory then grow without limit: with typical messages, 10,000 emails
is around 150 MB of heap, and nothing is ever removed from disk — so set a
positive limit for long-running or high-volume use.

### Listing a large inbox

`smtp.getAllEmails()` materialises every email, bodies included. For listings,
use `storage.list()` instead — it returns a page of emails plus the counts
needed to paginate, so the work stays proportional to the page size rather than
the size of the store.

```typescript
const { items, total, unread } = await servers.storage.list({
  skip: 0,
  limit: 50,
  search: 'welcome',   // optional: subject, participants and body text
  sort: 'desc',        // 'desc' (default) is newest first
})
```

To drop the message bodies and headers — as the REST `/api/email/summary`
endpoint and the web UI do — map the page through `toSummary`:

```typescript
import { toSummary } from '@maildev/core'

const summaries = items.map(toSummary)
```

### Getting All Emails

```typescript
const emails = await smtp.getAllEmails()
console.log(`Total emails: ${emails.length}`)
```

### Getting a Single Email

```typescript
const email = await smtp.getEmail('email-id')
console.log(email.subject)
```

### Getting Raw Email (EML format)

```typescript
const stream = await smtp.getRawEmail('email-id')
stream.pipe(fs.createWriteStream('email.eml'))
```

### Deleting Emails

```typescript
// Delete single email
await smtp.deleteEmail('email-id')

// Delete all emails
await smtp.deleteAllEmails()
```

### Mark All as Read

```typescript
const count = await smtp.markAllRead()
console.log(`Marked ${count} emails as read`)
```

### Working with Attachments

```typescript
const email = await smtp.getEmail('email-id')

for (const attachment of email.attachments) {
  console.log(`Attachment: ${attachment.filename}`)
  console.log(`Type: ${attachment.contentType}`)
  console.log(`Size: ${attachment.size} bytes`)
}

// Get attachment content
const { contentType, stream } = await smtp.getEmailAttachment('email-id', 'filename.pdf')
stream.pipe(fs.createWriteStream('filename.pdf'))
```

## Email Object Structure

```typescript
interface Email {
  id: string
  time: Date
  read: boolean
  subject: string
  source: string
  size: number
  sizeHuman: string
  from: Address[]
  to: Address[]
  cc?: Address[]
  bcc?: Address[]
  calculatedBcc?: Address[]
  date?: Date
  html?: string
  text?: string
  headers: Record<string, string | string[]>
  inReplyTo?: string
  priority?: 'high' | 'normal' | 'low'
  attachments: Attachment[]
  envelope: Envelope
}

interface Address {
  address: string
  name?: string
}

interface Envelope {
  from: EnvelopeAddress
  to: EnvelopeAddress[]
  host?: string
  remoteAddress?: string
}

interface EnvelopeAddress extends Address {
  args?: boolean | Record<string, unknown>
}

interface Attachment {
  filename: string
  generatedFileName: string
  contentType: string
  contentDisposition: 'inline' | 'attachment'
  contentId?: string
  size?: number
  transferred?: boolean
}
```

## Relay (Forwarding) Emails

MailDev can relay emails to a real SMTP server.

### Manual Relay

```typescript
const maildev = new MailDev({
  outgoingHost: 'smtp.gmail.com',
  outgoingPort: 587,
  outgoingUser: 'you@gmail.com',
  outgoingPass: 'app-password',
  outgoingSecure: true,
})

const { smtp } = await maildev.start()

// Relay a specific email
smtp.on('new', async (email) => {
  if (email.to.some(t => t.address === 'important@example.com')) {
    await smtp.relayEmail(email.id)
    console.log('Email relayed!')
  }
})
```

### Auto-Relay

```typescript
const maildev = new MailDev({
  outgoingHost: 'smtp.example.com',
  outgoingPort: 587,
  outgoingUser: 'user',
  outgoingPass: 'pass',
  autoRelay: true,  // Relay all emails automatically
})
```

### Auto-Relay to Specific Address

```typescript
const maildev = new MailDev({
  outgoingHost: 'smtp.example.com',
  outgoingPort: 587,
  outgoingUser: 'user',
  outgoingPass: 'pass',
  autoRelay: 'catch-all@example.com',  // Override recipient
})
```

## Events

The SMTP server emits the following events:

### 'new'
Emitted when a new email is received.

```typescript
smtp.on('new', (email: Email) => {
  console.log('New email:', email.subject)
})
```

### 'delete'
Emitted when an email is deleted.

```typescript
smtp.on('delete', (data: { id: string }) => {
  console.log('Deleted email:', data.id)
})
```

### 'error'
Emitted on server errors.

```typescript
smtp.on('error', (error: Error) => {
  console.error('SMTP error:', error.message)
})
```

### 'close'
Emitted when the server is closed.

```typescript
smtp.on('close', () => {
  console.log('SMTP server closed')
})
```

## Advanced Usage

### Using Individual Packages

For more control, you can use the underlying packages directly.

```typescript
import { MemoryStorage } from '@maildev/core'
import { createSMTPServer } from '@maildev/smtp'
import { createAPIServer } from '@maildev/api'

// Create storage
const storage = new MemoryStorage()
await storage.initialize()

// Create SMTP server
const smtp = createSMTPServer({
  port: 1025,
  host: '::',
  storage,
  mailDir: '/tmp/maildev',
})

await smtp.start()

// Create API server
const api = createAPIServer({
  port: 1080,
  storage,
  smtp,
  mcp: { enabled: true },
})

await api.start()
```

### Using FileStorage for Persistence

```typescript
import { FileStorage } from '@maildev/core'

const storage = new FileStorage({
  mailDirectory: '/var/mail/maildev',
  maxEmails: 1000, // optional: cap the store (0/omitted = unlimited)
})
await storage.initialize()
```

When `maxEmails` is exceeded, the oldest email is dropped and its files are
deleted. To clean up anything else you wrote alongside an email, register an
evict handler — `save()` awaits it, so once it resolves the email is fully gone:

```typescript
storage.onEvicted(async (email) => {
  await removeMyIndexEntry(email.id)
})
```

### Custom Logger

```typescript
import { MailDev, createLogger } from 'maildev'

const logger = createLogger({
  verbose: true,
  silent: false,
})

// The MailDev class uses the logger internally
const maildev = new MailDev({
  verbose: true,
})
```

### Middleware Integration

You can run MailDev behind a proxy or within an existing Express/Fastify app:

```typescript
const maildev = new MailDev({
  basePathname: '/maildev',
  web: 3001,
})

await maildev.start()
// MailDev UI now available at http://localhost:3001/maildev
```

Then proxy requests to MailDev:

```typescript
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

const app = express()

app.use('/maildev', createProxyMiddleware({
  target: 'http://localhost:3001',
  ws: true,
}))

app.listen(3000)
// MailDev accessible at http://localhost:3000/maildev
```

## TypeScript Support

MailDev v3 is written in TypeScript and exports all types:

```typescript
import type {
  MailDevConfig,
  Email,
  EmailSummary,
  Address,
  Attachment,
  Storage,
  ListOptions,
  ListResult,
} from 'maildev'

import type {
  SMTPServer,
  SMTPServerOptions,
  RelayConfig,
} from '@maildev/smtp'

import type {
  APIServer,
  APIServerOptions,
} from '@maildev/api'
```

## Migration from v2

### Key Changes

1. **Promise-based API**: All methods are now async/await
2. **No callbacks**: Replace callback patterns with promises
3. **Package structure**: Core functionality split into `@maildev/core`, `@maildev/smtp`, `@maildev/api`
4. **TypeScript**: Full type definitions included
5. **Events unchanged**: Event names and payloads are compatible

### Example Migration

**v2 (callbacks):**
```javascript
const MailDev = require('maildev')

const maildev = new MailDev()

maildev.listen(function(err) {
  if (err) throw err
  console.log('MailDev running')
})

maildev.on('new', function(email) {
  console.log('New email:', email.subject)
})

maildev.getAllEmail(function(err, emails) {
  console.log('Total:', emails.length)
})
```

**v3 (async/await):**
```typescript
import { MailDev } from 'maildev'

const maildev = new MailDev()

const { smtp } = await maildev.start()
console.log('MailDev running')

smtp.on('new', (email) => {
  console.log('New email:', email.subject)
})

const emails = await smtp.getAllEmails()
console.log('Total:', emails.length)
```
