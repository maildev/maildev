import { useState, useEffect, useMemo, useRef } from 'react'
import { useUIStore } from '../../stores/ui'
import { useEmails, filterEmails } from '../../hooks/useEmails'
import { cn } from '../../lib/utils'
import { Tooltip } from '../ui/Tooltip'
import type { Email } from '@maildev/core'

export function SearchInput() {
  const searchQuery = useUIStore((state) => state.searchQuery)
  const setSearchQuery = useUIStore((state) => state.setSearchQuery)
  const selectedEmailId = useUIStore((state) => state.selectedEmailId)
  const setSelectedEmail = useUIStore((state) => state.setSelectedEmail)
  const [isFocused, setIsFocused] = useState(false)
  const { data: emails = [] } = useEmails()
  const prevSearchQueryRef = useRef(searchQuery)

  // Filter and sort emails the same way as the list
  const visibleEmails = useMemo(() => {
    const filtered = filterEmails(emails as Email[], searchQuery)
    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.time).getTime()
      const timeB = new Date(b.time).getTime()
      return timeB - timeA
    })
  }, [emails, searchQuery])

  // Auto-select first email when search query changes (and there are results)
  useEffect(() => {
    // Only trigger when searchQuery actually changes (not on mount)
    if (searchQuery !== prevSearchQueryRef.current) {
      prevSearchQueryRef.current = searchQuery
      if (searchQuery && visibleEmails.length > 0) {
        setSelectedEmail(visibleEmails[0].id)
      }
    }
  }, [searchQuery, visibleEmails, setSelectedEmail])

  // Handle arrow key navigation while in search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (visibleEmails.length === 0) return

    const currentIndex = visibleEmails.findIndex((email) => email.id === selectedEmailId)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = currentIndex < visibleEmails.length - 1 ? currentIndex + 1 : 0
      setSelectedEmail(visibleEmails[nextIndex].id)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleEmails.length - 1
      setSelectedEmail(visibleEmails[prevIndex].id)
    } else if (e.key === 'Escape') {
      // Blur the input on Escape
      e.currentTarget.blur()
    }
  }

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Search emails..."
        className={cn(
          'w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))]',
          'py-2 pl-10 pr-10 text-sm',
          'placeholder:text-[hsl(var(--muted-foreground))]',
          'focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]'
        )}
      />
      {/* Keyboard shortcut hint - show when not focused and no query */}
      {!isFocused && !searchQuery && (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))] font-mono">
          /
        </kbd>
      )}
      {/* Clear button - show when there's a query */}
      {searchQuery && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
          <Tooltip content="Clear search (c)" position="left">
            <button
              onClick={() => setSearchQuery('')}
              className="rounded-sm p-0.5 hover:bg-[hsl(var(--muted))]"
              aria-label="Clear search"
            >
              <svg
                className="h-4 w-4 text-[hsl(var(--muted-foreground))]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
