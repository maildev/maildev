import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorage } from '../storage/memory.js'
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

describe('MemoryStorage', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  describe('getAll', () => {
    it('should return empty array initially', async () => {
      const emails = await storage.getAll()
      expect(emails).toEqual([])
    })

    it('should return all saved emails', async () => {
      await storage.save(createTestEmail('1'))
      await storage.save(createTestEmail('2'))

      const emails = await storage.getAll()
      expect(emails).toHaveLength(2)
    })

    it('should return a copy of the array', async () => {
      await storage.save(createTestEmail('1'))

      const emails1 = await storage.getAll()
      const emails2 = await storage.getAll()

      expect(emails1).not.toBe(emails2)
    })
  })

  describe('getById', () => {
    it('should return undefined for non-existent email', async () => {
      const email = await storage.getById('nonexistent')
      expect(email).toBeUndefined()
    })

    it('should return the email with matching ID', async () => {
      const testEmail = createTestEmail('abc123')
      await storage.save(testEmail)

      const email = await storage.getById('abc123')
      expect(email?.id).toBe('abc123')
      expect(email?.subject).toBe('Test Subject abc123')
    })
  })

  describe('save', () => {
    it('should add new emails to the store', async () => {
      await storage.save(createTestEmail('1'))
      expect(await storage.count()).toBe(1)

      await storage.save(createTestEmail('2'))
      expect(await storage.count()).toBe(2)
    })

    it('should update existing email with same ID', async () => {
      await storage.save(createTestEmail('1', { subject: 'Original' }))
      await storage.save(createTestEmail('1', { subject: 'Updated' }))

      const emails = await storage.getAll()
      expect(emails).toHaveLength(1)
      expect(emails[0]?.subject).toBe('Updated')
    })

    it('should enforce maxEmails limit', async () => {
      const limitedStorage = new MemoryStorage({ maxEmails: 3 })

      await limitedStorage.save(createTestEmail('1'))
      await limitedStorage.save(createTestEmail('2'))
      await limitedStorage.save(createTestEmail('3'))
      await limitedStorage.save(createTestEmail('4'))

      const emails = await limitedStorage.getAll()
      expect(emails).toHaveLength(3)

      // Oldest email should be removed
      expect(emails.find((e) => e.id === '1')).toBeUndefined()
      expect(emails.find((e) => e.id === '4')).toBeDefined()
    })
  })

  describe('delete', () => {
    it('should return false for non-existent email', async () => {
      const result = await storage.delete('nonexistent')
      expect(result).toBe(false)
    })

    it('should delete the email and return true', async () => {
      await storage.save(createTestEmail('1'))
      await storage.save(createTestEmail('2'))

      const result = await storage.delete('1')
      expect(result).toBe(true)

      const emails = await storage.getAll()
      expect(emails).toHaveLength(1)
      expect(emails[0]?.id).toBe('2')
    })
  })

  describe('deleteAll', () => {
    it('should return 0 when store is empty', async () => {
      const count = await storage.deleteAll()
      expect(count).toBe(0)
    })

    it('should delete all emails and return count', async () => {
      await storage.save(createTestEmail('1'))
      await storage.save(createTestEmail('2'))
      await storage.save(createTestEmail('3'))

      const count = await storage.deleteAll()
      expect(count).toBe(3)
      expect(await storage.count()).toBe(0)
    })
  })

  describe('filter', () => {
    it('should filter emails by query', async () => {
      await storage.save(createTestEmail('1', { subject: 'Hello World' }))
      await storage.save(createTestEmail('2', { subject: 'Goodbye World' }))
      await storage.save(createTestEmail('3', { subject: 'Hello Universe' }))

      const results = await storage.filter({ subject: 'Hello' })
      expect(results).toHaveLength(2)
    })

    it('should return empty array when no matches', async () => {
      await storage.save(createTestEmail('1'))

      const results = await storage.filter({ subject: 'Nonexistent' })
      expect(results).toHaveLength(0)
    })
  })

  describe('count', () => {
    it('should return 0 initially', async () => {
      expect(await storage.count()).toBe(0)
    })

    it('should return correct count after operations', async () => {
      await storage.save(createTestEmail('1'))
      expect(await storage.count()).toBe(1)

      await storage.save(createTestEmail('2'))
      expect(await storage.count()).toBe(2)

      await storage.delete('1')
      expect(await storage.count()).toBe(1)
    })
  })

  describe('initialize', () => {
    it('should be a no-op for memory storage', async () => {
      await storage.save(createTestEmail('1'))
      await storage.initialize()

      // Data should still be there
      expect(await storage.count()).toBe(1)
    })
  })

  describe('close', () => {
    it('should clear all emails', async () => {
      await storage.save(createTestEmail('1'))
      await storage.save(createTestEmail('2'))

      await storage.close()

      expect(await storage.count()).toBe(0)
    })
  })
})
