import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FileStorage } from '../storage/file.js'
import type { Email } from '../types/index.js'

const createTestEmail = (id: string, overrides: Partial<Email> = {}): Email => ({
  id,
  time: new Date(),
  read: false,
  subject: `Test Subject ${id}`,
  source: `/tmp/${id}.eml`,
  size: 1024,
  sizeHuman: '1 KB',
  from: [{ address: 'sender@example.com', name: 'Sender' }],
  to: [{ address: 'recipient@example.com', name: 'Recipient' }],
  headers: {},
  attachments: [],
  envelope: {
    from: { address: 'sender@example.com' },
    to: [{ address: 'recipient@example.com' }],
  },
  ...overrides,
})

describe('FileStorage', () => {
  let mailDirectory: string
  let storage: FileStorage

  /** Stand in for the .eml file and attachments the SMTP server would write */
  async function writeEmailFiles(id: string): Promise<void> {
    await writeFile(join(mailDirectory, `${id}.eml`), `Subject: ${id}\n\nbody`)
    await mkdir(join(mailDirectory, id), { recursive: true })
    await writeFile(join(mailDirectory, id, 'attachment.txt'), 'contents')
  }

  beforeEach(async () => {
    mailDirectory = await mkdtemp(join(tmpdir(), 'maildev-test-'))
  })

  afterEach(async () => {
    await storage?.close()
    await rm(mailDirectory, { recursive: true, force: true })
  })

  describe('delete', () => {
    it('should remove the .eml file and attachment directory', async () => {
      storage = new FileStorage({ mailDirectory })
      await storage.initialize()

      await storage.save(createTestEmail('keep'))
      await storage.save(createTestEmail('drop'))
      await writeEmailFiles('keep')
      await writeEmailFiles('drop')

      expect(await storage.delete('drop')).toBe(true)

      expect(existsSync(join(mailDirectory, 'drop.eml'))).toBe(false)
      expect(existsSync(join(mailDirectory, 'drop'))).toBe(false)
      expect(existsSync(join(mailDirectory, 'keep.eml'))).toBe(true)
    })

    it('should return false without touching the directory for an unknown id', async () => {
      storage = new FileStorage({ mailDirectory })
      await storage.initialize()
      await writeEmailFiles('kept')

      expect(await storage.delete('never-existed')).toBe(false)
      expect(existsSync(join(mailDirectory, 'kept.eml'))).toBe(true)
    })
  })

  describe('deleteAll', () => {
    it('should clear .eml files and attachment directories', async () => {
      storage = new FileStorage({ mailDirectory })
      await storage.initialize()

      for (const id of ['a', 'b', 'c']) {
        await storage.save(createTestEmail(id))
        await writeEmailFiles(id)
      }

      expect(await storage.deleteAll()).toBe(3)
      expect(await readdir(mailDirectory)).toEqual([])
    })
  })

  describe('maxEmails eviction', () => {
    it('should delete the files of evicted emails', async () => {
      storage = new FileStorage({ mailDirectory, maxEmails: 2 })
      await storage.initialize()

      for (const id of ['first', 'second']) {
        await storage.save(createTestEmail(id))
        await writeEmailFiles(id)
      }

      // Pushes 'first' out of the store
      await storage.save(createTestEmail('third'))
      await writeEmailFiles('third')

      expect(existsSync(join(mailDirectory, 'first.eml'))).toBe(false)
      expect(existsSync(join(mailDirectory, 'first'))).toBe(false)
      expect(existsSync(join(mailDirectory, 'second.eml'))).toBe(true)
      expect(existsSync(join(mailDirectory, 'third.eml'))).toBe(true)
    })

    it('should keep the directory bounded across many deliveries', async () => {
      storage = new FileStorage({ mailDirectory, maxEmails: 5 })
      await storage.initialize()

      for (let i = 0; i < 50; i++) {
        await storage.save(createTestEmail(`email-${i}`))
        await writeEmailFiles(`email-${i}`)
      }

      // This is the regression that forced a manual wipe of the mail
      // directory: the store stayed small while the directory kept growing.
      const emlFiles = (await readdir(mailDirectory)).filter((name) => name.endsWith('.eml'))
      expect(emlFiles).toHaveLength(5)
      expect(await storage.count()).toBe(5)
    })
  })

  describe('metadata sidecar', () => {
    it('persists relay status to a sidecar and reads it back', async () => {
      storage = new FileStorage({ mailDirectory })
      await storage.initialize()

      const relayedAt = new Date('2026-01-02T03:04:05.000Z')
      await storage.save(
        createTestEmail('relayed', { relayedAt, relayedTo: ['b@example.com'] })
      )
      await writeEmailFiles('relayed')

      expect(existsSync(join(mailDirectory, 'relayed.meta.json'))).toBe(true)

      const meta = await storage.readMetadata('relayed')
      expect(meta?.relayedAt).toEqual(relayedAt)
      expect(meta?.relayedTo).toEqual(['b@example.com'])
    })

    it('writes no sidecar for an email with no persisted metadata', async () => {
      storage = new FileStorage({ mailDirectory })
      await storage.initialize()

      await storage.save(createTestEmail('plain'))

      expect(existsSync(join(mailDirectory, 'plain.meta.json'))).toBe(false)
      expect(await storage.readMetadata('plain')).toBeNull()
    })

    it('removes the sidecar when the email is deleted', async () => {
      storage = new FileStorage({ mailDirectory })
      await storage.initialize()

      await storage.save(
        createTestEmail('gone', { relayedAt: new Date(), relayedTo: ['b@example.com'] })
      )
      expect(existsSync(join(mailDirectory, 'gone.meta.json'))).toBe(true)

      await storage.delete('gone')
      expect(existsSync(join(mailDirectory, 'gone.meta.json'))).toBe(false)
    })

    it('sweeps sidecars on deleteAll and eviction', async () => {
      storage = new FileStorage({ mailDirectory, maxEmails: 1 })
      await storage.initialize()

      await storage.save(
        createTestEmail('first', { relayedAt: new Date(), relayedTo: ['b@example.com'] })
      )
      await writeEmailFiles('first')
      // Evicts 'first', whose sidecar must go with it
      await storage.save(
        createTestEmail('second', { relayedAt: new Date(), relayedTo: ['c@example.com'] })
      )
      await writeEmailFiles('second')
      expect(existsSync(join(mailDirectory, 'first.meta.json'))).toBe(false)

      await storage.deleteAll()
      expect(await readdir(mailDirectory)).toEqual([])
    })
  })

  describe('source path', () => {
    it('should point source at the storage directory', async () => {
      storage = new FileStorage({ mailDirectory })
      await storage.initialize()

      await storage.save(createTestEmail('abc'))

      const email = await storage.getById('abc')
      expect(email?.source).toBe(join(mailDirectory, 'abc.eml'))
    })
  })
})
