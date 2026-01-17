import type { Email } from '@maildev/core'
import { useUIStore } from '../../stores/ui'
import { cn, formatDate, truncate, getInitials } from '../../lib/utils'

interface EmailListItemProps {
  email: Email
}

export function EmailListItem({ email }: EmailListItemProps) {
  const selectedEmailId = useUIStore((state) => state.selectedEmailId)
  const setSelectedEmail = useUIStore((state) => state.setSelectedEmail)

  const isSelected = selectedEmailId === email.id
  const fromAddress = email.from?.[0]?.address ?? 'unknown'
  const fromName = email.from?.[0]?.name
  const hasAttachments = email.attachments && email.attachments.length > 0

  return (
    <button
      onClick={() => setSelectedEmail(email.id)}
      className={cn(
        'w-full px-3 py-3 text-left transition-colors',
        'hover:bg-[hsl(var(--muted)/0.5)]',
        isSelected && 'bg-[hsl(var(--muted))]',
        !email.read && 'font-medium'
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium',
            !email.read
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
          )}
        >
          {getInitials(fromAddress)}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'truncate text-sm',
                !email.read && 'text-[hsl(var(--foreground))]',
                email.read && 'text-[hsl(var(--muted-foreground))]'
              )}
            >
              {fromName || fromAddress}
            </span>
            <span className="flex-shrink-0 text-xs text-[hsl(var(--muted-foreground))]">
              {formatDate(email.time)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span
              className={cn(
                'truncate text-sm',
                !email.read
                  ? 'text-[hsl(var(--foreground))]'
                  : 'text-[hsl(var(--muted-foreground))]'
              )}
            >
              {email.subject || '(no subject)'}
            </span>
            {hasAttachments && (
              <svg
                className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--muted-foreground))]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            )}
          </div>

          {email.text && (
            <p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">
              {truncate(email.text.replace(/\s+/g, ' ').trim(), 100)}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
