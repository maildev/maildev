import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { APIServer, createAPIServer } from '../server.js'
import { MemoryStorage, type Email } from '@maildev/core'

const createTestEmail = (id: string, overrides: Partial<Email> = {}): Email => ({
  id,
  time: new Date(Date.UTC(2026, 0, 1)),
  read: false,
  subject: `Subject ${id}`,
  source: `/path/${id}.eml`,
  size: 1024,
  sizeHuman: '1 KB',
  from: [{ address: 'angelo.pappas@fbi.gov', name: 'Angelo Pappas' }],
  to: [{ address: 'johnny.utah@fbi.gov', name: 'Johnny Utah' }],
  headers: {},
  attachments: [],
  envelope: {
    from: { address: 'angelo.pappas@fbi.gov' },
    to: [{ address: 'johnny.utah@fbi.gov' }],
  },
  calculatedBcc: [],
  ...overrides,
})

describe('GET /api/email/summary', () => {
  let server: APIServer
  let storage: MemoryStorage

  /** Fetch a page and return the parsed body */
  async function getPage(query = ''): Promise<{
    items: Array<Record<string, unknown>>
    total: number
    storeTotal: number
    unread: number
    skip: number
    limit: number
  }> {
    const response = await server.server.inject({
      method: 'GET',
      url: `/api/email/summary${query}`,
    })
    expect(response.statusCode).toBe(200)
    return response.json()
  }

  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.initialize()
    server = createAPIServer({ storage, port: 0 })
    await server.registerPlugins()
  })

  afterEach(async () => {
    await server.stop()
    await storage.close()
  })

  it('should return an empty page when there are no emails', async () => {
    const page = await getPage()

    expect(page.items).toEqual([])
    expect(page.total).toBe(0)
    expect(page.storeTotal).toBe(0)
    expect(page.unread).toBe(0)
  })

  it('should return summaries newest first', async () => {
    const at = (minutes: number) => new Date(Date.UTC(2026, 0, 1, 0, minutes))
    await storage.save(createTestEmail('a', { time: at(1) }))
    await storage.save(createTestEmail('c', { time: at(3) }))
    await storage.save(createTestEmail('b', { time: at(2) }))

    const page = await getPage()

    expect(page.items.map((item) => item.id)).toEqual(['c', 'b', 'a'])
  })

  it('should leave message bodies out of the response', async () => {
    await storage.save(
      createTestEmail('1', {
        html: '<p>body</p>',
        text: 'plain body',
        headers: { 'x-big': 'x'.repeat(500) },
      })
    )

    const page = await getPage()
    const summary = page.items[0]!

    expect(summary).not.toHaveProperty('html')
    expect(summary).not.toHaveProperty('text')
    expect(summary).not.toHaveProperty('headers')
    expect(summary.preview).toBe('plain body')
  })

  it('should paginate with skip and limit', async () => {
    for (let i = 0; i < 10; i++) {
      await storage.save(
        createTestEmail(`email-${i}`, { time: new Date(Date.UTC(2026, 0, 1, 0, i)) })
      )
    }

    const page = await getPage('?skip=2&limit=3')

    expect(page.items.map((item) => item.id)).toEqual(['email-7', 'email-6', 'email-5'])
    expect(page.total).toBe(10)
    expect(page.skip).toBe(2)
    expect(page.limit).toBe(3)
  })

  it('should default to a bounded page size', async () => {
    for (let i = 0; i < 120; i++) {
      await storage.save(createTestEmail(`email-${i}`))
    }

    const page = await getPage()

    expect(page.items).toHaveLength(50)
    expect(page.total).toBe(120)
  })

  it('should clamp an oversized limit', async () => {
    for (let i = 0; i < 400; i++) {
      await storage.save(createTestEmail(`email-${i}`))
    }

    // No single request may ask the server to serialise the whole inbox
    const page = await getPage('?limit=100000')

    expect(page.items).toHaveLength(200)
  })

  it('should ignore malformed pagination parameters', async () => {
    await storage.save(createTestEmail('1'))

    const page = await getPage('?skip=abc&limit=-5')

    expect(page.items).toHaveLength(1)
    expect(page.skip).toBe(0)
  })

  it('should treat limit=0 as a page, not as unlimited', async () => {
    for (let i = 0; i < 120; i++) {
      await storage.save(createTestEmail(`email-${i}`))
    }

    // Storage reads limit 0 as unbounded; this endpoint must not pass it
    // through, or a single request could serialise the whole inbox
    const page = await getPage('?limit=0')

    expect(page.items).toHaveLength(50)
  })

  it('should sort ascending on request', async () => {
    const at = (minutes: number) => new Date(Date.UTC(2026, 0, 1, 0, minutes))
    await storage.save(createTestEmail('a', { time: at(1) }))
    await storage.save(createTestEmail('b', { time: at(2) }))

    const page = await getPage('?sort=asc')

    expect(page.items.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('should search on the server', async () => {
    await storage.save(createTestEmail('1', { subject: 'Ex-presidents are surfers' }))
    await storage.save(createTestEmail('2', { subject: 'Unrelated', text: 'surfer wax' }))
    await storage.save(createTestEmail('3', { subject: 'Nothing to see' }))

    const page = await getPage('?search=surf')

    expect(page.items.map((item) => item.id)).toEqual(['1', '2'])
    expect(page.total).toBe(2)
    // The store total is unaffected by the search
    expect(page.storeTotal).toBe(3)
  })

  it('should filter to unread', async () => {
    await storage.save(createTestEmail('1', { read: true }))
    await storage.save(createTestEmail('2'))

    const page = await getPage('?unread=true')

    expect(page.items.map((item) => item.id)).toEqual(['2'])
  })

  it('should report the unread count for the whole store', async () => {
    for (let i = 0; i < 10; i++) {
      await storage.save(createTestEmail(`email-${i}`, { read: i < 4 }))
    }

    const page = await getPage('?limit=2')

    expect(page.items).toHaveLength(2)
    expect(page.unread).toBe(6)
  })

  it('should win over the :id route for an email literally called "summary"', async () => {
    await storage.save(createTestEmail('summary'))

    const response = await server.server.inject({
      method: 'GET',
      url: '/api/email/summary',
    })
    const body = response.json()

    // A page, not the email itself
    expect(body).toHaveProperty('items')
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(['summary'])
  })

  it('should stay small no matter how much mail is stored', async () => {
    const body = 'x'.repeat(12_000)
    for (let i = 0; i < 500; i++) {
      await storage.save(createTestEmail(`email-${i}`, { html: body, text: body }))
    }

    const summaryResponse = await server.server.inject({
      method: 'GET',
      url: '/api/email/summary',
    })
    const fullResponse = await server.server.inject({ method: 'GET', url: '/api/email' })

    // This gap is the whole point: the list view used to fetch the second one
    // every five seconds.
    expect(fullResponse.body.length).toBeGreaterThan(5_000_000)
    expect(summaryResponse.body.length).toBeLessThan(50_000)
  })
})

describe('GET /api/email pagination', () => {
  let server: APIServer
  let storage: MemoryStorage

  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.initialize()
    // Saved oldest-first, so arrival order and time order agree
    for (let i = 0; i < 10; i++) {
      await storage.save(
        createTestEmail(`email-${i}`, { time: new Date(Date.UTC(2026, 0, 1, 0, i)) })
      )
    }
    server = createAPIServer({ storage, port: 0 })
    await server.registerPlugins()
  })

  afterEach(async () => {
    await server.stop()
    await storage.close()
  })

  it('should still return everything by default, for backwards compatibility', async () => {
    const response = await server.server.inject({ method: 'GET', url: '/api/email' })

    expect(response.json()).toHaveLength(10)
  })

  it('should honour limit', async () => {
    const response = await server.server.inject({ method: 'GET', url: '/api/email?limit=3' })

    expect(response.json()).toHaveLength(3)
  })

  it('should honour skip together with limit', async () => {
    const response = await server.server.inject({
      method: 'GET',
      url: '/api/email?skip=8&limit=5',
    })

    expect(response.json()).toHaveLength(2)
  })

  it('should not treat limit or sort as email filter fields', async () => {
    const response = await server.server.inject({
      method: 'GET',
      url: '/api/email?limit=3&sort=desc',
    })

    // Regression guard: if these leaked into the filter query, nothing would
    // match and the response would be empty
    expect(response.json()).toHaveLength(3)
  })

  it('should keep arrival order when sort is omitted', async () => {
    const response = await server.server.inject({ method: 'GET', url: '/api/email?limit=2' })

    expect(response.json().map((email: { id: string }) => email.id)).toEqual(['email-0', 'email-1'])
  })

  it('should return the newest emails with sort=desc', async () => {
    const response = await server.server.inject({
      method: 'GET',
      url: '/api/email?limit=2&sort=desc',
    })

    expect(response.json().map((email: { id: string }) => email.id)).toEqual(['email-9', 'email-8'])
  })

  it('should return the oldest emails with sort=asc', async () => {
    const response = await server.server.inject({
      method: 'GET',
      url: '/api/email?limit=2&sort=asc',
    })

    expect(response.json().map((email: { id: string }) => email.id)).toEqual(['email-0', 'email-1'])
  })
})

describe('PATCH /api/email/read-all', () => {
  let server: APIServer
  let storage: MemoryStorage

  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.initialize()
    server = createAPIServer({ storage, port: 0 })
    await server.registerPlugins()
  })

  afterEach(async () => {
    await server.stop()
    await storage.close()
  })

  it('should mark everything read and report the count', async () => {
    for (let i = 0; i < 5; i++) {
      await storage.save(createTestEmail(`email-${i}`, { read: i < 2 }))
    }

    const response = await server.server.inject({
      method: 'PATCH',
      url: '/api/email/read-all',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toBe(3)
    expect((await storage.stats()).unread).toBe(0)
  })

  it('should handle a large inbox in one pass', async () => {
    for (let i = 0; i < 10_000; i++) {
      await storage.save(createTestEmail(`email-${i}`))
    }

    // Was O(n^2): a full getAll() followed by a save() per unread email
    const started = performance.now()
    const response = await server.server.inject({
      method: 'PATCH',
      url: '/api/email/read-all',
    })
    const elapsed = performance.now() - started

    expect(response.json()).toBe(10_000)
    expect(elapsed).toBeLessThan(500)
  })
})
