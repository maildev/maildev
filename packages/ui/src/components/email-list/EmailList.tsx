import { useEffect, useRef } from 'react'
import { useEmailList } from '../../hooks/useEmails'
import { useUIStore } from '../../stores/ui'
import { EmailListItem } from './EmailListItem'

/** How far ahead of the end of the list to start loading the next page */
const PREFETCH_MARGIN = '400px'

export function EmailList() {
  const { items, total, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useEmailList()
  const searchQuery = useUIStore((state) => state.searchQuery)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Load the next page as the sentinel approaches the viewport. Only what has
  // been scrolled to is ever rendered, so a 10,000 email inbox costs the same
  // as a 50 email one until the user actually scrolls.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: PREFETCH_MARGIN }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <div
        data-testid="email-list-loading"
        className="flex h-32 items-center justify-center text-[hsl(var(--muted-foreground))]"
      >
        <svg
          className="mr-2 h-5 w-5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div
        data-testid="email-list-error"
        className="flex h-32 items-center justify-center text-[hsl(var(--destructive))]"
      >
        Failed to load emails
      </div>
    )
  }

  if (items.length === 0) {
    if (searchQuery.trim()) {
      return (
        <div
          data-testid="email-list-no-results"
          className="flex h-32 items-center justify-center text-[hsl(var(--muted-foreground))]"
        >
          <span className="text-sm">No emails match "{searchQuery}"</span>
        </div>
      )
    }

    return (
      <div
        data-testid="email-list-empty"
        className="flex h-32 flex-col items-center justify-center gap-2 text-[hsl(var(--muted-foreground))]"
      >
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span className="text-sm">No emails yet</span>
        <span className="text-xs">Send an email to localhost:1025</span>
      </div>
    )
  }

  return (
    <div data-testid="email-list" className="divide-y divide-[hsl(var(--border))]">
      {items.map((email) => (
        <EmailListItem key={email.id} email={email} />
      ))}

      <div ref={sentinelRef} aria-hidden="true" />

      {isFetchingNextPage && (
        <div className="p-3 text-center text-xs text-[hsl(var(--muted-foreground))]">
          Loading more...
        </div>
      )}

      {!hasNextPage && total > items.length && (
        <div className="p-3 text-center text-xs text-[hsl(var(--muted-foreground))]">
          Showing {items.length} of {total}
        </div>
      )}
    </div>
  )
}
