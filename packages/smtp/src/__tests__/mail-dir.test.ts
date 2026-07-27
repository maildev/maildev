import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, readdir, rm, writeFile, utimes } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MemoryStorage, type Email } from '@maildev/core'
import { SMTPServer } from '../server.js'

/** An email as the SMTP server would have stored it */
const createStoredEmail = (id: string, mailDir: string): Email => ({
  id,
  time: new Date(),
  read: false,
  subject: `Message ${id}`,
  source: join(mailDir, `${id}.eml`),
  size: 100,
  sizeHuman: '100 B',
  from: [{ address: 'angelo.pappas@fbi.gov' }],
  to: [{ address: 'johnny.utah@fbi.gov' }],
  headers: {},
  attachments: [],
  envelope: {
    from: { address: 'angelo.pappas@fbi.gov' },
    to: [{ address: 'johnny.utah@fbi.gov' }],
  },
})

describe('SMTPServer mail directory', () => {
  let mailDir: string
  let storage: MemoryStorage
  let server: SMTPServer

  /**
   * Write a plausible .eml plus an attachment directory.
   * `ageSeconds` backdates the file so ordering by mtime is deterministic.
   */
  async function writeEmail(id: string, ageSeconds: number): Promise<void> {
    const path = join(mailDir, `${id}.eml`)
    await writeFile(
      path,
      [
        'From: Angelo Pappas <angelo.pappas@fbi.gov>',
        'To: Johnny Utah <johnny.utah@fbi.gov>',
        `Subject: Message ${id}`,
        '',
        `Body of ${id}`,
        '',
      ].join('\n')
    )

    await mkdir(join(mailDir, id), { recursive: true })
    await writeFile(join(mailDir, id, 'attachment.txt'), 'contents')

    const when = new Date(Date.now() - ageSeconds * 1000)
    await utimes(path, when, when)
  }

  /** Names of the .eml files currently on disk */
  async function emlFiles(): Promise<string[]> {
    return (await readdir(mailDir)).filter((name) => name.endsWith('.eml')).sort()
  }

  beforeEach(async () => {
    mailDir = await mkdtemp(join(tmpdir(), 'maildev-smtp-test-'))
    storage = new MemoryStorage()
  })

  afterEach(async () => {
    await server?.stop()
    await storage.close()
    await rm(mailDir, { recursive: true, force: true })
  })

  describe('pruneMailDir', () => {
    it('should keep the newest files and delete the rest', async () => {
      server = new SMTPServer({ storage, mailDir, logger: false })

      // newest -> oldest
      await writeEmail('newest', 10)
      await writeEmail('middle', 100)
      await writeEmail('oldest', 1000)

      expect(await server.pruneMailDir(2)).toBe(1)

      expect(await emlFiles()).toEqual(['middle.eml', 'newest.eml'])
      // Attachments go with the email
      expect(existsSync(join(mailDir, 'oldest'))).toBe(false)
      expect(existsSync(join(mailDir, 'middle'))).toBe(true)
    })

    it('should do nothing when the directory is already within the limit', async () => {
      server = new SMTPServer({ storage, mailDir, logger: false })

      await writeEmail('a', 10)
      await writeEmail('b', 20)

      expect(await server.pruneMailDir(5)).toBe(0)
      expect(await emlFiles()).toEqual(['a.eml', 'b.eml'])
    })

    it('should treat a keep count of 0 as unlimited', async () => {
      server = new SMTPServer({ storage, mailDir, logger: false })

      await writeEmail('a', 10)
      await writeEmail('b', 20)

      expect(await server.pruneMailDir(0)).toBe(0)
      expect(await emlFiles()).toHaveLength(2)
    })

    it('should ignore files that are not emails', async () => {
      server = new SMTPServer({ storage, mailDir, logger: false })

      await writeEmail('a', 10)
      await writeFile(join(mailDir, 'notes.txt'), 'not an email')

      await server.pruneMailDir(1)

      expect(existsSync(join(mailDir, 'notes.txt'))).toBe(true)
    })

    it('should clear a backlog left by previous runs', async () => {
      server = new SMTPServer({ storage, mailDir, logger: false })

      for (let i = 0; i < 200; i++) {
        await writeEmail(`email-${i}`, 10_000 - i)
      }

      expect(await server.pruneMailDir(20)).toBe(180)
      expect(await emlFiles()).toHaveLength(20)
    })
  })

  describe('eviction', () => {
    it('should delete files for emails the store drops', async () => {
      storage = new MemoryStorage({ maxEmails: 2 })
      server = new SMTPServer({ storage, mailDir, logger: false })

      // Stand in for three deliveries: the SMTP server writes the files, the
      // store holds the emails
      for (const id of ['first', 'second', 'third']) {
        await writeEmail(id, 10)
        await storage.save(createStoredEmail(id, mailDir))
      }

      expect(await storage.count()).toBe(2)
      expect(await emlFiles()).toEqual(['second.eml', 'third.eml'])
      // Attachments go with the email
      expect(existsSync(join(mailDir, 'first'))).toBe(false)
    })

    it('should keep the directory bounded across many deliveries', async () => {
      storage = new MemoryStorage({ maxEmails: 5 })
      server = new SMTPServer({ storage, mailDir, logger: false })

      for (let i = 0; i < 50; i++) {
        await writeEmail(`email-${i}`, 10)
        await storage.save(createStoredEmail(`email-${i}`, mailDir))
      }

      expect(await emlFiles()).toHaveLength(5)
    })

    it('should stop cleaning up once the server is stopped', async () => {
      storage = new MemoryStorage({ maxEmails: 1 })
      server = new SMTPServer({ storage, mailDir, logger: false })
      await server.stop()

      await writeEmail('a', 10)
      await writeEmail('b', 10)
      await storage.save(createStoredEmail('a', mailDir))
      await storage.save(createStoredEmail('b', mailDir))

      // A stopped server no longer owns the directory
      expect(await emlFiles()).toEqual(['a.eml', 'b.eml'])
    })
  })

  describe('loadMailsFromDirectory', () => {
    it('should restore emails from disk', async () => {
      server = new SMTPServer({ storage, mailDir, logger: false })

      await writeEmail('restore-me', 10)
      await server.loadMailsFromDirectory()

      const email = await storage.getById('restore-me')
      expect(email?.subject).toBe('Message restore-me')
      // Restored emails start out read, so they don't look like new arrivals
      expect(email?.read).toBe(true)
    })

    it('should restore only the newest maxEmails', async () => {
      storage = new MemoryStorage({ maxEmails: 3 })
      server = new SMTPServer({ storage, mailDir, logger: false })

      // email-0 is the oldest, email-9 the newest
      for (let i = 0; i < 10; i++) {
        await writeEmail(`email-${i}`, 1000 - i * 10)
      }

      await server.loadMailsFromDirectory()

      expect(await storage.count()).toBe(3)
      const restored = (await storage.getAll()).map((email) => email.id).sort()
      expect(restored).toEqual(['email-7', 'email-8', 'email-9'])
    })

    it('should survive an unreadable email without losing the rest', async () => {
      server = new SMTPServer({ storage, mailDir, logger: false })

      await writeEmail('good', 10)
      // A directory named like an email file: reading it throws
      await mkdir(join(mailDir, 'broken.eml'), { recursive: true })

      await server.loadMailsFromDirectory()

      expect(await storage.getById('good')).toBeDefined()
    })

    it('should not fail when the mail directory is empty', async () => {
      server = new SMTPServer({ storage, mailDir, logger: false })

      await server.loadMailsFromDirectory()

      expect(await storage.count()).toBe(0)
    })
  })
})
