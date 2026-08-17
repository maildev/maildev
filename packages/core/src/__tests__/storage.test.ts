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

    it('should notify evict handlers for each email dropped by maxEmails', async () => {
      const limitedStorage = new MemoryStorage({ maxEmails: 2 })
      const evicted: string[] = []
      limitedStorage.onEvicted((email) => {
        evicted.push(email.id)
      })

      for (const id of ['1', '2', '3', '4']) {
        await limitedStorage.save(createTestEmail(id))
      }

      // Oldest first, and only the ones that actually overflowed
      expect(evicted).toEqual(['1', '2'])
    })

    it('should await async evict handlers before save resolves', async () => {
      const limitedStorage = new MemoryStorage({ maxEmails: 1 })
      const cleaned: string[] = []
      limitedStorage.onEvicted(async (email) => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        cleaned.push(email.id)
      })

      await limitedStorage.save(createTestEmail('1'))
      await limitedStorage.save(createTestEmail('2'))

      // Cleanup is complete by the time save() resolves, not merely scheduled
      expect(cleaned).toEqual(['1'])
    })

    it('should stop notifying an unregistered evict handler', async () => {
      const limitedStorage = new MemoryStorage({ maxEmails: 1 })
      const evicted: string[] = []
      const unregister = limitedStorage.onEvicted((email) => {
        evicted.push(email.id)
      })

      await limitedStorage.save(createTestEmail('1'))
      await limitedStorage.save(createTestEmail('2'))
      unregister()
      await limitedStorage.save(createTestEmail('3'))

      expect(evicted).toEqual(['1'])
    })

    it('should not evict when updating an existing email', async () => {
      const limitedStorage = new MemoryStorage({ maxEmails: 2 })
      const evicted: string[] = []
      limitedStorage.onEvicted((email) => {
        evicted.push(email.id)
      })

      await limitedStorage.save(createTestEmail('1'))
      await limitedStorage.save(createTestEmail('2'))
      await limitedStorage.save(createTestEmail('1', { read: true }))

      expect(evicted).toEqual([])
      expect(await limitedStorage.count()).toBe(2)
    })

    it('should keep an updated email in its original position', async () => {
      const limitedStorage = new MemoryStorage({ maxEmails: 2 })

      await limitedStorage.save(createTestEmail('1'))
      await limitedStorage.save(createTestEmail('2'))
      // Touching the oldest email must not make it look newest
      await limitedStorage.save(createTestEmail('1', { read: true }))
      await limitedStorage.save(createTestEmail('3'))

      const emails = await limitedStorage.getAll()
      expect(emails.map((e) => e.id)).toEqual(['2', '3'])
    })
  })

  describe('markAllRead', () => {
    it('should return 0 when everything is already read', async () => {
      await storage.save(createTestEmail('1', { read: true }))
      expect(await storage.markAllRead()).toBe(0)
    })

    it('should mark unread emails as read and return the count', async () => {
      await storage.save(createTestEmail('1'))
      await storage.save(createTestEmail('2', { read: true }))
      await storage.save(createTestEmail('3'))

      expect(await storage.markAllRead()).toBe(2)

      const emails = await storage.getAll()
      expect(emails.every((e) => e.read)).toBe(true)
      expect((await storage.stats()).unread).toBe(0)
    })
  })

  describe('stats', () => {
    it('should report zero for an empty store', async () => {
      expect(await storage.stats()).toEqual({ total: 0, unread: 0 })
    })

    it('should track unread across save, update and delete', async () => {
      await storage.save(createTestEmail('1'))
      await storage.save(createTestEmail('2'))
      expect(await storage.stats()).toEqual({ total: 2, unread: 2 })

      // Reading one
      await storage.save(createTestEmail('1', { read: true }))
      expect(await storage.stats()).toEqual({ total: 2, unread: 1 })

      // Marking it unread again
      await storage.save(createTestEmail('1', { read: false }))
      expect(await storage.stats()).toEqual({ total: 2, unread: 2 })

      await storage.delete('1')
      expect(await storage.stats()).toEqual({ total: 1, unread: 1 })

      await storage.deleteAll()
      expect(await storage.stats()).toEqual({ total: 0, unread: 0 })
    })

    it('should keep the unread count correct when emails are evicted', async () => {
      const limitedStorage = new MemoryStorage({ maxEmails: 2 })

      await limitedStorage.save(createTestEmail('1'))
      await limitedStorage.save(createTestEmail('2'))
      await limitedStorage.save(createTestEmail('3'))

      expect(await limitedStorage.stats()).toEqual({ total: 2, unread: 2 })
    })
  })

  describe('list', () => {
    const at = (minutes: number) => new Date(Date.UTC(2026, 0, 1, 0, minutes))

    beforeEach(async () => {
      // Saved out of time order on purpose, so sorting is actually exercised
      await storage.save(createTestEmail('b', { time: at(2), subject: 'Second' }))
      await storage.save(createTestEmail('a', { time: at(1), subject: 'First' }))
      await storage.save(createTestEmail('c', { time: at(3), subject: 'Third', read: true }))
    })

    it('should return everything newest first by default', async () => {
      const result = await storage.list()

      expect(result.items.map((e) => e.id)).toEqual(['c', 'b', 'a'])
      expect(result.total).toBe(3)
      expect(result.storeTotal).toBe(3)
      expect(result.unread).toBe(2)
    })

    it('should sort ascending on request', async () => {
      const result = await storage.list({ sort: 'asc' })
      expect(result.items.map((e) => e.id)).toEqual(['a', 'b', 'c'])
    })

    it('should apply skip and limit while reporting the full total', async () => {
      const result = await storage.list({ skip: 1, limit: 1 })

      expect(result.items.map((e) => e.id)).toEqual(['b'])
      expect(result.total).toBe(3)
      expect(result.skip).toBe(1)
      expect(result.limit).toBe(1)
    })

    it('should treat limit 0 as no limit', async () => {
      const result = await storage.list({ limit: 0 })
      expect(result.items).toHaveLength(3)
    })

    it('should return an empty page when skipping past the end', async () => {
      const result = await storage.list({ skip: 99, limit: 10 })

      expect(result.items).toEqual([])
      expect(result.total).toBe(3)
    })

    it('should search subject, addresses and body text', async () => {
      await storage.save(
        createTestEmail('d', {
          time: at(4),
          subject: 'Unrelated',
          text: 'mentions parachute in the body',
          from: [{ address: 'bodhi@example.com', name: 'Bodhi' }],
        })
      )

      expect((await storage.list({ search: 'third' })).items.map((e) => e.id)).toEqual(['c'])
      expect((await storage.list({ search: 'parachute' })).items.map((e) => e.id)).toEqual(['d'])
      expect((await storage.list({ search: 'bodhi@' })).items.map((e) => e.id)).toEqual(['d'])
    })

    it('should report the matching total separately from the store total', async () => {
      const result = await storage.list({ search: 'Third' })

      expect(result.total).toBe(1)
      expect(result.storeTotal).toBe(3)
    })

    it('should filter to unread only', async () => {
      const result = await storage.list({ unreadOnly: true })
      expect(result.items.map((e) => e.id)).toEqual(['b', 'a'])
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
