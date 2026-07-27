#!/usr/bin/env node
/**
 * Development server for @maildev/api
 *
 * Starts a complete MailDev stack with SMTP, API, and WebSocket servers.
 * Used for local development and testing.
 */

import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { MemoryStorage } from '@maildev/core'
import { createSMTPServer } from '@maildev/smtp'
import { createAPIServer } from './server.js'

const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '1025', 10)
const API_PORT = parseInt(process.env.API_PORT ?? '1080', 10)
const API_HOST = process.env.API_HOST ?? '0.0.0.0'
const MAIL_DIR = process.env.MAIL_DIR ?? join(tmpdir(), 'maildev-dev')
const MAX_EMAILS = parseInt(process.env.MAX_EMAILS ?? '1000', 10)

async function main() {
  console.log('Starting MailDev development server...\n')

  // Ensure mail directory exists
  mkdirSync(MAIL_DIR, { recursive: true })

  // Create shared storage. Bounded, matching the CLI default, so a long dev
  // session or a load test can't exhaust memory or fill the mail directory.
  const storage = new MemoryStorage({ maxEmails: MAX_EMAILS })
  await storage.initialize()

  // Create and start SMTP server
  const smtp = createSMTPServer({
    port: SMTP_PORT,
    storage,
    mailDir: MAIL_DIR,
  })

  await smtp.start()
  console.log(`  SMTP server listening on port ${SMTP_PORT}`)

  // Discard .eml files left behind by earlier runs
  if (MAX_EMAILS > 0) {
    const pruned = await smtp.pruneMailDir(MAX_EMAILS)
    if (pruned > 0) {
      console.log(`  Removed ${pruned} old email(s) from ${MAIL_DIR}`)
    }
  }

  // Create and start API server with MCP enabled
  const api = createAPIServer({
    port: API_PORT,
    host: API_HOST,
    storage,
    smtp,
    mcp: { enabled: true },
  })

  await api.start()
  console.log(`  API server listening on http://localhost:${API_PORT}`)
  console.log(`  WebSocket available at ws://localhost:${API_PORT}/socket.io`)
  console.log(`  MCP server available at http://localhost:${API_PORT}/mcp\n`)

  console.log('Ready to receive emails!')
  console.log(`  Send test emails to: localhost:${SMTP_PORT}`)
  console.log(`  View API at: http://localhost:${API_PORT}/email\n`)

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...')
    await api.stop()
    await smtp.stop()
    await storage.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('Failed to start dev server:', err)
  process.exit(1)
})
