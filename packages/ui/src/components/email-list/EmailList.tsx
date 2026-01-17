import { useEmails, filterEmails } from '../../hooks/useEmails'
import { useUIStore } from '../../stores/ui'
import { EmailListItem } from './EmailListItem'

export function EmailList() {
  const { data: emails, isLoading, error } = useEmails()
  const searchQuery = useUIStore((state) => state.searchQuery)

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-[hsl(var(--muted-foreground))]">
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
      <div className="flex h-32 items-center justify-center text-[hsl(var(--destructive))]">
        Failed to load emails
      </div>
    )
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-[hsl(var(--muted-foreground))]">
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

  // Filter emails by search query
  const filteredEmails = filterEmails(emails, searchQuery)

  // Sort by time descending (newest first)
  const sortedEmails = [...filteredEmails].sort((a, b) => {
    const timeA = new Date(a.time).getTime()
    const timeB = new Date(b.time).getTime()
    return timeB - timeA
  })

  if (sortedEmails.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-[hsl(var(--muted-foreground))]">
        <span className="text-sm">No emails match "{searchQuery}"</span>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[hsl(var(--border))]">
      {sortedEmails.map((email) => (
        <EmailListItem key={email.id} email={email} />
      ))}
    </div>
  )
}
