import { useEmail } from '../../hooks/useEmails'
import { useUIStore } from '../../stores/ui'
import { EmailHeader } from './EmailHeader'
import { EmailContent } from './EmailContent'

export function EmailViewer() {
  const selectedEmailId = useUIStore((state) => state.selectedEmailId)
  const { data: email, isLoading, error } = useEmail(selectedEmailId)

  if (!selectedEmailId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-[hsl(var(--muted-foreground))]">
        <svg
          className="h-16 w-16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm">Select an email to view</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[hsl(var(--muted-foreground))]">
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
        Loading email...
      </div>
    )
  }

  if (error || !email) {
    return (
      <div className="flex h-full items-center justify-center text-[hsl(var(--destructive))]">
        Failed to load email
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <EmailHeader email={email} />
      <EmailContent email={email} />
    </div>
  )
}
