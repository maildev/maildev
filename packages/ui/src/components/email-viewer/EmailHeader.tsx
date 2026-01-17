import type { Email } from '@maildev/core'
import { useDeleteEmail } from '../../hooks/useEmails'
import { useUIStore } from '../../stores/ui'
import { api } from '../../lib/api'
import { cn, formatDate, formatEmailAddress, getInitials } from '../../lib/utils'
import { Tooltip } from '../ui/Tooltip'

interface EmailHeaderProps {
  email: Email
}

export function EmailHeader({ email }: EmailHeaderProps) {
  const setSelectedEmail = useUIStore((state) => state.setSelectedEmail)
  const deleteMutation = useDeleteEmail()

  const fromAddress = email.from?.[0]?.address ?? 'unknown'
  const toAddresses = email.to?.map(formatEmailAddress).join(', ') ?? ''
  const ccAddresses = email.cc?.map(formatEmailAddress).join(', ')
  const bccAddresses = email.calculatedBcc?.map(formatEmailAddress).join(', ')

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this email?')) {
      await deleteMutation.mutateAsync(email.id)
      setSelectedEmail(null)
    }
  }

  const handleDownload = () => {
    window.open(api.emails.downloadUrl(email.id), '_blank')
  }

  return (
    <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          {/* Avatar */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-sm font-medium text-[hsl(var(--primary-foreground))]">
            {getInitials(fromAddress)}
          </div>

          {/* Email info */}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {email.subject || '(no subject)'}
            </h1>
            <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {email.from?.[0]?.name || fromAddress}
                </span>
                {email.from?.[0]?.name && (
                  <span className="text-xs">&lt;{fromAddress}&gt;</span>
                )}
              </div>
              <div className="mt-0.5">
                <span className="text-xs">to </span>
                <span className="text-xs">{toAddresses}</span>
              </div>
              {ccAddresses && (
                <div className="mt-0.5">
                  <span className="text-xs">cc </span>
                  <span className="text-xs">{ccAddresses}</span>
                </div>
              )}
              {bccAddresses && (
                <div className="mt-0.5">
                  <span className="text-xs">bcc </span>
                  <span className="text-xs">{bccAddresses}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs text-[hsl(var(--muted-foreground))]">
            {formatDate(email.time)}
          </span>

          {/* Download */}
          <Tooltip content="Download as .eml" position="left">
            <button
              onClick={handleDownload}
              className="rounded-md p-2 hover:bg-[hsl(var(--muted))]"
              aria-label="Download email"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
          </Tooltip>

          {/* Delete */}
          <Tooltip content="Delete this email" position="left">
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className={cn(
                'rounded-md p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
              aria-label="Delete email"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Attachments */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {email.attachments.map((attachment, index) => (
            <Tooltip key={index} content={`Download ${attachment.filename ?? 'attachment'}`}>
              <a
                href={api.emails.attachmentUrl(email.id, attachment.filename ?? `attachment-${index}`)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))]',
                  'px-2 py-1 text-xs text-[hsl(var(--foreground))]',
                  'hover:bg-[hsl(var(--muted))]'
                )}
              >
                <svg
                  className="h-3.5 w-3.5"
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
                <span>{attachment.filename ?? `attachment-${index}`}</span>
                {attachment.size && (
                  <span className="text-[hsl(var(--muted-foreground))]">
                    ({Math.round(attachment.size / 1024)}KB)
                  </span>
                )}
              </a>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  )
}
