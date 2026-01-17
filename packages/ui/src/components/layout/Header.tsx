import { useConfig, useDeleteAllEmails, useMarkAllRead } from '../../hooks/useEmails'
import { useUIStore } from '../../stores/ui'
import { cn } from '../../lib/utils'
import { Tooltip } from '../ui/Tooltip'

export function Header() {
  const { data: config } = useConfig()
  const deleteAllMutation = useDeleteAllEmails()
  const markAllReadMutation = useMarkAllRead()

  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete all emails?')) {
      deleteAllMutation.mutate()
    }
  }

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4">
      <div className="flex items-center gap-3">
        <Tooltip content="Toggle sidebar">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 hover:bg-[hsl(var(--muted))]"
            aria-label="Toggle sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </Tooltip>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-[hsl(var(--primary))]">MailDev</span>
          {config?.version && (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              v{config.version}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mark all read */}
        <Tooltip content="Mark all as read" position="left">
          <button
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'hover:bg-[hsl(var(--muted))]',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            aria-label="Mark all as read"
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
                d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
              />
            </svg>
          </button>
        </Tooltip>

        {/* Delete all */}
        <Tooltip content="Delete all emails" position="left">
          <button
            onClick={handleDeleteAll}
            disabled={deleteAllMutation.isPending}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            aria-label="Delete all emails"
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

        {/* Theme toggle */}
        <Tooltip content={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} position="left">
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 hover:bg-[hsl(var(--muted))]"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            )}
          </button>
        </Tooltip>
      </div>
    </header>
  )
}
