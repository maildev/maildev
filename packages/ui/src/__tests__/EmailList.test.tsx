import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { EmailList } from '../components/email-list/EmailList'
import { useUIStore } from '../stores/ui'
import type { EmailSummary } from '@maildev/core'

/** Every summary the fake server holds */
const TOTAL = 120

const allSummaries: EmailSummary[] = Array.from({ length: TOTAL }, (_, index) => ({
  id: `email-${index}`,
  time: new Date(Date.UTC(2026, 0, 1, 0, index)),
  read: false,
  subject: `Message ${index}`,
  size: 1024,
  sizeHuman: '1 KB',
  from: [{ address: `sender${index}@example.com`, name: `Sender ${index}` }],
  to: [{ address: 'johnny.utah@fbi.gov' }],
  attachmentCount: 0,
  preview: `Preview of message ${index}`,
})).reverse()

/** Requests the component made, in order */
let requestedUrls: string[] = []

/** Intersection observers created by the component, so tests can trigger them */
let observerCallbacks: IntersectionObserverCallback[] = []

function renderList(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  render(<EmailList />, { wrapper })
}

/** Pretend the sentinel scrolled into view */
async function scrollToEnd(): Promise<void> {
  await act(async () => {
    for (const callback of observerCallbacks) {
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    }
  })
}

beforeEach(() => {
  requestedUrls = []
  observerCallbacks = []
  useUIStore.setState({ searchQuery: '', selectedEmailId: null })

  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallbacks.push(callback)
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return []
      }
    }
  )

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      requestedUrls.push(input)

      const url = new URL(input, 'http://localhost')
      const skip = Number(url.searchParams.get('skip') ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? 50)
      const search = url.searchParams.get('search') ?? ''

      const matching = search
        ? allSummaries.filter((email) => email.subject.toLowerCase().includes(search.toLowerCase()))
        : allSummaries

      return {
        ok: true,
        statusText: 'OK',
        json: async () => ({
          items: matching.slice(skip, skip + limit),
          total: matching.length,
          storeTotal: allSummaries.length,
          unread: allSummaries.length,
          skip,
          limit,
        }),
      }
    })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EmailList', () => {
  it('should render only the first page of a large inbox', async () => {
    renderList()

    await screen.findByText('Message 119')

    // 120 emails available, one page rendered — the old list rendered a row
    // for every email in the store
    expect(screen.getAllByRole('button')).toHaveLength(50)
    expect(screen.queryByText('Message 60')).toBeNull()
  })

  it('should request a bounded page rather than the whole inbox', async () => {
    renderList()
    await screen.findByText('Message 119')

    expect(requestedUrls).toHaveLength(1)
    expect(requestedUrls[0]).toContain('/api/email/summary')
    expect(requestedUrls[0]).toContain('limit=50')
  })

  it('should load the next page when scrolled to the end', async () => {
    renderList()
    await screen.findByText('Message 119')

    await scrollToEnd()

    await waitFor(() => {
      expect(screen.queryByText('Message 60')).not.toBeNull()
    })
    expect(screen.getAllByRole('button')).toHaveLength(100)
    expect(requestedUrls[1]).toContain('skip=50')
  })

  it('should stop requesting pages once everything is loaded', async () => {
    renderList()
    await screen.findByText('Message 119')

    await scrollToEnd()
    await waitFor(() => expect(requestedUrls).toHaveLength(2))
    await scrollToEnd()
    await waitFor(() => expect(requestedUrls).toHaveLength(3))

    // All 120 are now loaded, so the sentinel stops fetching
    await scrollToEnd()
    expect(requestedUrls).toHaveLength(3)
  })

  it('should send the search term to the server', async () => {
    renderList()
    await screen.findByText('Message 119')

    act(() => {
      useUIStore.setState({ searchQuery: 'Message 42' })
    })

    await waitFor(() => {
      expect(requestedUrls.some((url) => url.includes('search=Message+42'))).toBe(true)
    })
    await waitFor(() => {
      expect(screen.getAllByRole('button')).toHaveLength(1)
    })
  })

  it('should show a message when a search matches nothing', async () => {
    renderList()
    await screen.findByText('Message 119')

    act(() => {
      useUIStore.setState({ searchQuery: 'nothing matches this' })
    })

    expect(await screen.findByText(/No emails match/)).toBeTruthy()
  })
})
