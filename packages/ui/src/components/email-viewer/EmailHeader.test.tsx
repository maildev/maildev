import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Email } from '@maildev/core'
import { EmailHeader } from './EmailHeader'

// Stub the data hooks so the header renders without a QueryClient or network.
vi.mock('../../hooks/useEmails', () => ({
  useDeleteEmail: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRelayEmail: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useConfig: () => ({ data: { isOutgoingEnabled: false } }),
}))

const baseEmail: Email = {
  id: 'abc123',
  time: new Date(),
  read: true,
  subject: 'Hello',
  source: '/tmp/abc123.eml',
  size: 1024,
  sizeHuman: '1 KB',
  from: [{ address: 'a@example.com', name: 'A' }],
  to: [{ address: 'b@example.com', name: 'B' }],
  headers: {},
  attachments: [],
  envelope: {
    from: { address: 'a@example.com' },
    to: [{ address: 'b@example.com' }],
  },
}

describe('EmailHeader relay status', () => {
  it('shows the relayed recipients once an email has been relayed', () => {
    render(
      <EmailHeader
        email={{
          ...baseEmail,
          relayedAt: new Date(),
          relayedTo: ['b@example.com', 'c@example.com'],
        }}
      />
    )

    const status = screen.getByTestId('email-relayed-status')
    expect(status.textContent).toContain('Relayed to')
    expect(status.textContent).toContain('b@example.com, c@example.com')
  })

  it('falls back to "original recipients" when relayedTo is empty', () => {
    render(<EmailHeader email={{ ...baseEmail, relayedAt: new Date(), relayedTo: [] }} />)

    expect(screen.getByTestId('email-relayed-status').textContent).toContain(
      'Relayed to original recipients'
    )
  })

  it('renders no relay status for an email that was never relayed', () => {
    render(<EmailHeader email={baseEmail} />)

    expect(screen.queryByTestId('email-relayed-status')).toBeNull()
  })
})
