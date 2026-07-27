/**
 * Guardrails against the regressions that made MailDev unusable with a large
 * inbox.
 *
 * Budgets sit roughly 10x above what the current implementation needs and well
 * below what the previous array-backed store took, so they trip on an
 * algorithmic regression (a per-operation O(n) scan reappearing) rather than on
 * a slow machine. Reference timings at 20,000 emails:
 *
 *   operation      before    after
 *   save all       ~1070ms     41ms
 *   getById x2000   ~180ms    0.6ms
 *   markAllRead    >1000ms    0.6ms
 */
import { describe, it, expect } from 'vitest'
import { MemoryStorage } from '../storage/memory.js'
import type { Email } from '../types/index.js'

/** Emails used for the scale checks */
const COUNT = 20_000

const createTestEmail = (index: number): Email => ({
  id: `email-${index}`,
  time: new Date(Date.UTC(2026, 0, 1) + index * 1000),
  read: false,
  subject: `Test message ${index}`,
  source: `/tmp/email-${index}.eml`,
  size: 1024,
  sizeHuman: '1 KB',
  from: [{ address: `sender${index % 50}@example.com` }],
  to: [{ address: 'recipient@example.com' }],
  headers: {},
  attachments: [],
  envelope: {
    from: { address: `sender${index % 50}@example.com` },
    to: [{ address: 'recipient@example.com' }],
  },
  text: `Body of message ${index}`,
})

/** Populate a store with COUNT emails, returning how long it took */
async function fill(storage: MemoryStorage): Promise<number> {
  const started = performance.now()
  for (let i = 0; i < COUNT; i++) {
    await storage.save(createTestEmail(i))
  }
  return performance.now() - started
}

/** Time an async operation in milliseconds */
async function timed(operation: () => Promise<unknown>): Promise<number> {
  const started = performance.now()
  await operation()
  return performance.now() - started
}

describe('MemoryStorage at scale', () => {
  it(`should ingest ${COUNT} emails without degrading`, async () => {
    const storage = new MemoryStorage()

    // Was quadratic: every save scanned the array to look for an existing id.
    expect(await fill(storage)).toBeLessThan(400)
    expect(await storage.count()).toBe(COUNT)
  })

  it('should look emails up by id in constant time', async () => {
    const storage = new MemoryStorage()
    await fill(storage)

    const elapsed = await timed(async () => {
      for (let i = 0; i < 2000; i++) {
        // Spread across the store so a linear scan can't get lucky
        await storage.getById(`email-${(i * 7919) % COUNT}`)
      }
    })

    expect(elapsed).toBeLessThan(100)
  })

  it('should mark everything read in a single pass', async () => {
    const storage = new MemoryStorage()
    await fill(storage)

    // Was quadratic: getAll() followed by a save() per unread email.
    const elapsed = await timed(() => storage.markAllRead())

    expect(elapsed).toBeLessThan(200)
    expect((await storage.stats()).unread).toBe(0)
  })

  it('should report stats without scanning', async () => {
    const storage = new MemoryStorage()
    await fill(storage)

    const elapsed = await timed(() => storage.stats())

    expect(elapsed).toBeLessThan(20)
    expect(await storage.stats()).toEqual({ total: COUNT, unread: COUNT })
  })

  it('should return a page of summaries quickly', async () => {
    const storage = new MemoryStorage()
    await fill(storage)

    let page: Awaited<ReturnType<MemoryStorage['listSummaries']>> | undefined
    const elapsed = await timed(async () => {
      page = await storage.listSummaries({ limit: 50 })
    })

    expect(elapsed).toBeLessThan(150)
    expect(page?.items).toHaveLength(50)
    expect(page?.total).toBe(COUNT)
    // Newest first
    expect(page?.items[0]?.id).toBe(`email-${COUNT - 1}`)
  })

  it('should keep a page small regardless of how much mail is stored', async () => {
    const storage = new MemoryStorage()
    const body = 'x'.repeat(12_000)

    for (let i = 0; i < 2000; i++) {
      await storage.save({ ...createTestEmail(i), html: body, text: body })
    }

    const everything = JSON.stringify(await storage.getAll())
    const page = JSON.stringify((await storage.listSummaries({ limit: 50 })).items)

    // The full listing is what the UI used to fetch every five seconds
    expect(everything.length).toBeGreaterThan(20_000_000)
    expect(page.length).toBeLessThan(50_000)
  })

  it('should stay within maxEmails while ingesting far more', async () => {
    const storage = new MemoryStorage({ maxEmails: 1000 })

    const elapsed = await fill(storage)

    expect(elapsed).toBeLessThan(400)
    expect(await storage.count()).toBe(1000)
    // The newest survive, the oldest are gone
    expect(await storage.getById(`email-${COUNT - 1}`)).toBeDefined()
    expect(await storage.getById('email-0')).toBeUndefined()
  })
})
