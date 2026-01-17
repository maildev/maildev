import { useUIStore } from '../../stores/ui'
import { cn } from '../../lib/utils'
import { Tooltip } from '../ui/Tooltip'

export function SearchInput() {
  const searchQuery = useUIStore((state) => state.searchQuery)
  const setSearchQuery = useUIStore((state) => state.setSearchQuery)

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
        placeholder="Search emails..."
        className={cn(
          'w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))]',
          'py-2 pl-10 pr-10 text-sm',
          'placeholder:text-[hsl(var(--muted-foreground))]',
          'focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]'
        )}
      />
      {searchQuery && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Tooltip content="Clear search" position="left">
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
