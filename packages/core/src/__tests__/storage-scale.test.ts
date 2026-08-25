/**
 * Guardrails against the regressions that made MailDev unusable with a large
 * inbox.
 *
 * Ingest is the one operation heavy enough to time reliably and the one that
 * used to go quadratic (every save scanned the array for an existing id), so we
 * guard it by scale rather than by wall-clock: on any given machine, filling 4x
 * the mail should cost ~4x the time if save is O(1) but ~16x if it is O(n).
 * Comparing those two ratios makes the check independent of how fast — or how
 * loaded — the CI runner happens to be.
 *
 * The remaining operations are O(1) or a single O(n) pass and run in well under
 * a millisecond even at 20,000 emails, so a very loose absolute ceiling is
 * enough to catch an accidental per-item scan. Reference timings at 20,000
 * emails:
 *
 *   operation      before    after
 *   save all       ~1070ms     41ms
 *   getById x2000   ~180ms    0.6ms
 *   markAllRead    >1000ms    0.6ms
 */
import { describe, it, expect } from 'vitest'
import { MemoryStorage } from '../storage/memory.js'
import { toSummary } from '../utils/summary.js'
import type { Email } from '../types/index.js'

/** Emails used for the scale checks */
const COUNT = 20_000

/** A quarter of the load, to measure how ingest scales with inbox size */
const SMALL = COUNT / 4

/**
 * Filling 4x the mail costs ~4x the time when save is O(1) and ~16x when it is
 * quadratic. Trip well below the quadratic factor but far enough above the
 * linear one that noise, GC and JIT can never false-fail the guard.
 *
 * The large fill runs ~4x longer than the small one, so on a loaded runner it
 * is ~4x more likely for a stray GC/scheduler stall to survive into its
 * fastest run and inflate this ratio above the true ~4x. Keep the ceiling
 * comfortably above that observed noise but still far short of the 16x that a
 * genuine O(n²) regression would produce.
 */
const MAX_SCALING = 10

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

/** Populate a store with `count` emails, returning how long it took */
async function fill(storage: MemoryStorage, count = COUNT): Promise<number> {
  const started = performance.now()
  for (let i = 0; i < count; i++) {
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

/**
 * Run an operation a few times and return the fastest.
 *
 * These guards care about algorithmic cost, not the wall-clock of any single
 * run: on a shared CI runner one measurement can be arbitrarily inflated by a
 * GC pause or the scheduler parking the process. The minimum is the run that
 * happened to dodge that contention, so it reflects the true cost — a real
 * O(n) → O(n²) regression can't produce a fast minimum, but a loaded runner
 * can no longer false-fail the check.
 */
async function fastest(
  operation: () => Promise<unknown>,
  runs = 5
): Promise<number> {
  let best = Infinity
  for (let i = 0; i < runs; i++) {
    best = Math.min(best, await timed(operation))
  }
  return best
}

/**
 * Fastest of a few fresh fills of `count` emails into a store from `make`.
 *
 * Take several samples: the large fill is long enough that a single run often
 * catches a GC/scheduler stall, and only its uncontended minimum reflects the
 * true algorithmic cost the ratio guard compares against.
 */
async function fastestFill(
  count: number,
  make: () => MemoryStorage = () => new MemoryStorage(),
  runs = 5
): Promise<number> {
  let best = Infinity
  for (let i = 0; i < runs; i++) {
    best = Math.min(best, await fill(make(), count))
  }
  return best
}

describe('MemoryStorage at scale', () => {
  it(`should ingest ${COUNT} emails without a per-save slowdown`, async () => {
    // Warm the JIT so the baseline below isn't measured cold, which would
    // shrink the ratio and could mask a regression.
    await fill(new MemoryStorage(), 1000)

    // Was quadratic: every save scanned the array to look for an existing id,
    // so 4x the mail cost ~16x the time rather than ~4x. Compare the fastest
    // fill at each size so a stray pause during the small (noisier) fill can't
    // shrink the ratio's denominator and trip the guard.
    const smallMs = await fastestFill(SMALL)
    const largeMs = await fastestFill(COUNT)

    expect(largeMs / smallMs).toBeLessThan(MAX_SCALING)

    const large = new MemoryStorage()
    await fill(large, COUNT)
    expect(await large.count()).toBe(COUNT)
  })

  it('should look emails up by id in constant time', async () => {
    const storage = new MemoryStorage()
    await fill(storage)

    const elapsed = await fastest(async () => {
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

    // Was quadratic: getAll() followed by a save() per unread email. Repeating
    // the (idempotent) pass and keeping the fastest strips out GC/scheduler
    // noise; the pass itself stays O(n) on every run.
    const elapsed = await fastest(() => storage.markAllRead())

    expect(elapsed).toBeLessThan(200)
    expect((await storage.stats()).unread).toBe(0)
  })

  it('should report stats without scanning', async () => {
    const storage = new MemoryStorage()
    await fill(storage)

    const elapsed = await fastest(() => storage.stats())

    expect(elapsed).toBeLessThan(20)
    expect(await storage.stats()).toEqual({ total: COUNT, unread: COUNT })
  })

  it('should return a page quickly', async () => {
    const storage = new MemoryStorage()
    await fill(storage)

    const elapsed = await fastest(() => storage.list({ limit: 50 }))

    expect(elapsed).toBeLessThan(150)

    const page = await storage.list({ limit: 50 })
    expect(page.items).toHaveLength(50)
    expect(page.total).toBe(COUNT)
    // Newest first
    expect(page.items[0]?.id).toBe(`email-${COUNT - 1}`)
  })

  it('should keep a summary page small regardless of how much mail is stored', async () => {
    const storage = new MemoryStorage()
    const body = 'x'.repeat(12_000)

    for (let i = 0; i < 2000; i++) {
      await storage.save({ ...createTestEmail(i), html: body, text: body })
    }

    const everything = JSON.stringify(await storage.getAll())
    const page = await storage.list({ limit: 50 })
    const summaries = JSON.stringify(page.items.map(toSummary))

    // The full listing is what the UI used to fetch every five seconds
    expect(everything.length).toBeGreaterThan(20_000_000)
    expect(summaries.length).toBeLessThan(50_000)
  })

  it('should stay within maxEmails while ingesting far more', async () => {
    // Warm the eviction path so the baseline below isn't measured cold.
    await fill(new MemoryStorage({ maxEmails: 100 }), 1000)

    const smallMs = await fastestFill(SMALL, () => new MemoryStorage({ maxEmails: 1000 }))
    const largeMs = await fastestFill(COUNT, () => new MemoryStorage({ maxEmails: 1000 }))

    // Eviction is O(1) per save, so ingest stays linear even while the store is
    // permanently full.
    expect(largeMs / smallMs).toBeLessThan(MAX_SCALING)

    const large = new MemoryStorage({ maxEmails: 1000 })
    await fill(large, COUNT)
    expect(await large.count()).toBe(1000)
    // The newest survive, the oldest are gone
    expect(await large.getById(`email-${COUNT - 1}`)).toBeDefined()
    expect(await large.getById('email-0')).toBeUndefined()
  })
})
