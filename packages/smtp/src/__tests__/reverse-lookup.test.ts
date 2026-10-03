import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import dns from 'node:dns'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import nodemailer from 'nodemailer'
import { MemoryStorage } from '@maildev/core'
import { SMTPServer } from '../server.js'

describe('client reverse DNS lookup', () => {
  let mailDir: string
  let storage: MemoryStorage
  let server: SMTPServer

  beforeEach(async () => {
    mailDir = await mkdtemp(join(tmpdir(), 'maildev-reverse-'))
    storage = new MemoryStorage()
    await storage.initialize()
    server = new SMTPServer({ storage, mailDir, port: 0, host: '127.0.0.1' })
    await server.start()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await server.stop()
    await rm(mailDir, { recursive: true, force: true })
  })

  // Without a network the lookup never answers, and smtp-server holds back the
  // 220 greeting until it gives up on it (#104).
  it('accepts mail without reverse resolving the connecting client', async () => {
    const reverse = vi.spyOn(dns, 'reverse').mockImplementation(() => {})

    const transport = nodemailer.createTransport({
      host: '127.0.0.1',
      port: server.getPort(),
      secure: false,
    })
    await transport.sendMail({
      from: 'a@example.com',
      to: 'b@example.com',
      subject: 'offline',
      text: 'hello',
    })

    expect(await storage.getAll()).toHaveLength(1)
    expect(reverse).not.toHaveBeenCalled()
  })
})
