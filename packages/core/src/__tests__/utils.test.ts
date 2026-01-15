import { describe, it, expect } from 'vitest'
import { makeId, formatBytes, clone, delay, filterEmails } from '../utils/index.js'
import type { Email } from '../types/index.js'

describe('makeId', () => {
  it('should generate an ID of default length 8', () => {
    const id = makeId()
    expect(id).toHaveLength(8)
  })

  it('should generate an ID of specified length', () => {
    expect(makeId(4)).toHaveLength(4)
    expect(makeId(16)).toHaveLength(16)
    expect(makeId(1)).toHaveLength(1)
  })

  it('should only contain lowercase alphanumeric characters', () => {
    const id = makeId(100)
    expect(id).toMatch(/^[a-z0-9]+$/)
  })

  it('should generate unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(makeId())
    }
    // With 36^8 combinations, 100 IDs should all be unique
    expect(ids.size).toBe(100)
  })
})

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
  })

  it('should format negative bytes as 0', () => {
    expect(formatBytes(-100)).toBe('0 Bytes')
  })

  it('should format bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 Bytes')
  })

  it('should format kilobytes correctly', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(2560)).toBe('2.5 KB')
  })

  it('should format megabytes correctly', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(1572864)).toBe('1.5 MB')
  })

  it('should format gigabytes correctly', () => {
    expect(formatBytes(1073741824)).toBe('1 GB')
  })

  it('should respect decimal places parameter', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB')
    expect(formatBytes(1536, 1)).toBe('1.5 KB')
    expect(formatBytes(1536, 3)).toBe('1.5 KB')
  })
})

describe('clone', () => {
  it('should deep clone an object', () => {
    const original = { a: 1, b: { c: 2 } }
    const cloned = clone(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.b).not.toBe(original.b)
  })

  it('should clone arrays', () => {
    const original = [1, 2, { a: 3 }]
    const cloned = clone(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned[2]).not.toBe(original[2])
  })

  it('should handle null and primitives', () => {
    expect(clone(null)).toBeNull()
    expect(clone(42)).toBe(42)
    expect(clone('hello')).toBe('hello')
    expect(clone(true)).toBe(true)
  })
})

describe('delay', () => {
  it('should delay for the specified time', async () => {
    const start = Date.now()
    await delay(50)
    const elapsed = Date.now() - start

    // Allow some tolerance for timing
    expect(elapsed).toBeGreaterThanOrEqual(45)
    expect(elapsed).toBeLessThan(100)
  })

  it('should resolve with void', async () => {
    const result = await delay(1)
    expect(result).toBeUndefined()
  })
})

describe('filterEmails', () => {
  const createTestEmail = (overrides: Partial<Email> = {}): Email => ({
    id: 'test123',
    time: new Date(),
    read: false,
    subject: 'Test Subject',
    source: '/tmp/test.eml',
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

  it('should return all emails when query is empty', () => {
    const emails = [createTestEmail({ id: '1' }), createTestEmail({ id: '2' })]
    expect(filterEmails(emails, {})).toHaveLength(2)
  })

  it('should filter by simple property', () => {
    const emails = [
      createTestEmail({ id: '1', subject: 'Hello' }),
      createTestEmail({ id: '2', subject: 'World' }),
    ]

    const result = filterEmails(emails, { subject: 'Hello' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('1')
  })

  it('should filter by nested property using dot notation', () => {
    const emails = [
      createTestEmail({
        id: '1',
        from: [{ address: 'alice@example.com', name: 'Alice' }],
      }),
      createTestEmail({
        id: '2',
        from: [{ address: 'bob@example.com', name: 'Bob' }],
      }),
    ]

    const result = filterEmails(emails, { 'from.0.address': 'alice@example.com' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('1')
  })

  it('should support case-insensitive string matching', () => {
    const emails = [createTestEmail({ subject: 'Hello World' })]

    expect(filterEmails(emails, { subject: 'hello' })).toHaveLength(1)
    expect(filterEmails(emails, { subject: 'WORLD' })).toHaveLength(1)
  })

  it('should match if any array element matches', () => {
    const emails = [
      createTestEmail({
        from: [
          { address: 'alice@example.com', name: 'Alice' },
          { address: 'bob@example.com', name: 'Bob' },
        ],
      }),
    ]

    expect(filterEmails(emails, { 'from.address': 'bob@example.com' })).toHaveLength(1)
  })

  it('should return empty array when no matches', () => {
    const emails = [createTestEmail({ subject: 'Hello' })]
    expect(filterEmails(emails, { subject: 'Goodbye' })).toHaveLength(0)
  })

  it('should handle multiple query conditions (AND logic)', () => {
    const emails = [
      createTestEmail({ id: '1', subject: 'Hello', read: true }),
      createTestEmail({ id: '2', subject: 'Hello', read: false }),
      createTestEmail({ id: '3', subject: 'World', read: true }),
    ]

    const result = filterEmails(emails, { subject: 'Hello', read: true })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('1')
  })
})
