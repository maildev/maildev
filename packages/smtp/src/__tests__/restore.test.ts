import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MemoryStorage } from '@maildev/core'
import { SMTPServer } from '../server.js'

const EML = [
  'From: Angelo Pappas <angelo.pappas@fbi.gov>',
  'To: Johnny Utah <johnny.utah@fbi.gov>',
  'Subject: The ex-presidents are surfers',
  'Message-ID: <restore-test@example.com>',
  'Date: Mon, 27 Jul 2026 19:46:05 +0000',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'The wax at the bank was surfer wax!!!',
  '',
].join('\r\n')

describe('loadMailsFromDirectory', () => {
  let mailDir: string
  let storage: MemoryStorage
  let server: SMTPServer

  beforeEach(async () => {
    mailDir = await mkdtemp(join(tmpdir(), 'maildev-restore-'))
    storage = new MemoryStorage()
    await storage.initialize()
    server = new SMTPServer({ storage, mailDir })
  })

  afterEach(async () => {
    await rm(mailDir, { recursive: true, force: true })
  })

  it('restores emails persisted as .eml files into storage', async () => {
    await writeFile(join(mailDir, 'abc12345.eml'), EML)

    expect(await storage.getAll()).toHaveLength(0)

    await server.loadMailsFromDirectory()

    const emails = await storage.getAll()
    expect(emails).toHaveLength(1)
    expect(emails[0]?.id).toBe('abc12345')
    expect(emails[0]?.subject).toBe('The ex-presidents are surfers')
  })

  it('ignores non-.eml files', async () => {
    await writeFile(join(mailDir, 'notes.txt'), 'not an email')
    await writeFile(join(mailDir, 'valid.eml'), EML)

    await server.loadMailsFromDirectory()

    const emails = await storage.getAll()
    expect(emails).toHaveLength(1)
    expect(emails[0]?.id).toBe('valid')
  })

  it('does not throw when the mail directory has no emails', async () => {
    await expect(server.loadMailsFromDirectory()).resolves.toBeUndefined()
    expect(await storage.getAll()).toHaveLength(0)
  })
})
