import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Email } from '@maildev/core'
import { EmailContent } from './EmailContent'

// Stub the data hooks so the HTML view renders without a QueryClient or network.
vi.mock('../../hooks/useEmails', () => ({
  useEmailHtml: () => ({
    data: '<html><body><a href="https://example.com" target="_blank">link</a></body></html>',
  }),
  useEmailSource: () => ({ data: undefined }),
}))

const emailWithHtml: Email = {
  id: 'abc123',
  time: new Date(),
  read: true,
  subject: 'Hello',
  source: '/tmp/abc123.eml',
  size: 1024,
  sizeHuman: '1 KB',
  from: [{ address: 'a@example.com', name: 'A' }],
  to: [{ address: 'b@example.com', name: 'B' }],
  html: '<p>hi</p>',
  headers: {},
  attachments: [],
  envelope: {
    from: { address: 'a@example.com' },
    to: [{ address: 'b@example.com' }],
  },
}

describe('EmailContent HTML preview iframe sandbox', () => {
  it('allows target="_blank" links to open while keeping scripts disabled', () => {
    render(<EmailContent email={emailWithHtml} />)

    const iframe = screen.getByTitle('Email HTML content')
    const sandbox = iframe.getAttribute('sandbox') ?? ''
    const tokens = sandbox.split(/\s+/).filter(Boolean)

    // The sanitizer preserves `target` on links, so the sandbox must permit
    // popups or every target="_blank" link in a received email is dead.
    expect(tokens).toContain('allow-same-origin')
    expect(tokens).toContain('allow-popups')
    expect(tokens).toContain('allow-popups-to-escape-sandbox')
    // Scripts must stay off: email HTML is untrusted content.
    expect(tokens).not.toContain('allow-scripts')
  })
})
