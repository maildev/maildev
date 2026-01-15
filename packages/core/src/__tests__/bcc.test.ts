import { describe, it, expect } from 'vitest'
import { calculateBcc } from '../helpers/bcc.js'
import type { Address, EnvelopeAddress } from '../types/index.js'

describe('calculateBcc', () => {
  it('should return empty array when all recipients are in To', () => {
    const envelopeRecipients: EnvelopeAddress[] = [
      { address: 'alice@example.com', name: 'Alice' },
      { address: 'bob@example.com', name: 'Bob' },
    ]
    const toAddresses: Address[] = [
      { address: 'alice@example.com', name: 'Alice' },
      { address: 'bob@example.com', name: 'Bob' },
    ]

    const bcc = calculateBcc(envelopeRecipients, toAddresses)
    expect(bcc).toHaveLength(0)
  })

  it('should return empty array when all recipients are in CC', () => {
    const envelopeRecipients: EnvelopeAddress[] = [
      { address: 'alice@example.com', name: 'Alice' },
    ]
    const toAddresses: Address[] = []
    const ccAddresses: Address[] = [{ address: 'alice@example.com', name: 'Alice' }]

    const bcc = calculateBcc(envelopeRecipients, toAddresses, ccAddresses)
    expect(bcc).toHaveLength(0)
  })

  it('should identify BCC recipients not in To or CC', () => {
    const envelopeRecipients: EnvelopeAddress[] = [
      { address: 'alice@example.com', name: 'Alice' },
      { address: 'bob@example.com', name: 'Bob' },
      { address: 'secret@example.com', name: 'Secret' },
    ]
    const toAddresses: Address[] = [{ address: 'alice@example.com', name: 'Alice' }]
    const ccAddresses: Address[] = [{ address: 'bob@example.com', name: 'Bob' }]

    const bcc = calculateBcc(envelopeRecipients, toAddresses, ccAddresses)
    expect(bcc).toHaveLength(1)
    expect(bcc[0]?.address).toBe('secret@example.com')
    expect(bcc[0]?.name).toBe('Secret')
  })

  it('should handle case-insensitive email matching', () => {
    const envelopeRecipients: EnvelopeAddress[] = [
      { address: 'Alice@Example.COM', name: 'Alice' },
    ]
    const toAddresses: Address[] = [{ address: 'alice@example.com', name: 'Alice' }]

    const bcc = calculateBcc(envelopeRecipients, toAddresses)
    expect(bcc).toHaveLength(0)
  })

  it('should handle string recipients (from SMTP envelope)', () => {
    const envelopeRecipients = ['alice@example.com', 'bcc@example.com']
    const toAddresses: Address[] = [{ address: 'alice@example.com', name: 'Alice' }]

    const bcc = calculateBcc(envelopeRecipients, toAddresses)
    expect(bcc).toHaveLength(1)
    expect(bcc[0]?.address).toBe('bcc@example.com')
    expect(bcc[0]?.name).toBe('')
  })

  it('should handle empty envelope recipients', () => {
    const envelopeRecipients: EnvelopeAddress[] = []
    const toAddresses: Address[] = [{ address: 'alice@example.com', name: 'Alice' }]

    const bcc = calculateBcc(envelopeRecipients, toAddresses)
    expect(bcc).toHaveLength(0)
  })

  it('should handle empty To and CC with recipients', () => {
    const envelopeRecipients: EnvelopeAddress[] = [
      { address: 'alice@example.com', name: 'Alice' },
    ]
    const toAddresses: Address[] = []
    const ccAddresses: Address[] = []

    const bcc = calculateBcc(envelopeRecipients, toAddresses, ccAddresses)
    expect(bcc).toHaveLength(1)
    expect(bcc[0]?.address).toBe('alice@example.com')
  })

  it('should preserve name from envelope address', () => {
    const envelopeRecipients: EnvelopeAddress[] = [
      { address: 'bcc@example.com', name: 'BCC User' },
    ]
    const toAddresses: Address[] = []

    const bcc = calculateBcc(envelopeRecipients, toAddresses)
    expect(bcc).toHaveLength(1)
    expect(bcc[0]?.name).toBe('BCC User')
  })

  it('should handle multiple BCC recipients', () => {
    const envelopeRecipients: EnvelopeAddress[] = [
      { address: 'visible@example.com', name: 'Visible' },
      { address: 'bcc1@example.com', name: 'BCC 1' },
      { address: 'bcc2@example.com', name: 'BCC 2' },
      { address: 'bcc3@example.com', name: 'BCC 3' },
    ]
    const toAddresses: Address[] = [{ address: 'visible@example.com', name: 'Visible' }]

    const bcc = calculateBcc(envelopeRecipients, toAddresses)
    expect(bcc).toHaveLength(3)
  })

  it('should default CC to empty array', () => {
    const envelopeRecipients: EnvelopeAddress[] = [
      { address: 'alice@example.com', name: 'Alice' },
    ]
    const toAddresses: Address[] = [{ address: 'alice@example.com', name: 'Alice' }]

    // Not passing CC parameter
    const bcc = calculateBcc(envelopeRecipients, toAddresses)
    expect(bcc).toHaveLength(0)
  })
})
