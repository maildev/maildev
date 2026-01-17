import { useState, useRef, useEffect } from 'react'
import { useConfig, useDeleteAllEmails, useMarkAllRead, useRefreshEmails } from '../../hooks/useEmails'
import { useUIStore } from '../../stores/ui'
import { cn } from '../../lib/utils'
import { Tooltip } from '../ui/Tooltip'

export function Header() {
  const { data: config } = useConfig()
  const deleteAllMutation = useDeleteAllEmails()
  const markAllReadMutation = useMarkAllRead()
  const { refresh, isRefreshing } = useRefreshEmails()

  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const notificationsEnabled = useUIStore((state) => state.notificationsEnabled)
  const setNotificationsEnabled = useUIStore((state) => state.setNotificationsEnabled)
  const autoShowNewMail = useUIStore((state) => state.autoShowNewMail)
  const setAutoShowNewMail = useUIStore((state) => state.setAutoShowNewMail)

  // Check if notifications are supported
  const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window
  const isSecureContext = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  // Close settings menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationsToggle = async () => {
    if (!notificationsEnabled) {
      // Request permission
      if (notificationsSupported && Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          setNotificationsEnabled(true)
        }
      } else if (Notification.permission === 'granted') {
        setNotificationsEnabled(true)
      }
    } else {
      setNotificationsEnabled(false)
    }
  }

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
        <Tooltip content="Toggle sidebar (s)">
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
        {/* Refresh */}
        <Tooltip content="Refresh emails (r)" position="left">
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'hover:bg-[hsl(var(--muted))]',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            aria-label="Refresh emails"
          >
            <svg
              className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </Tooltip>

        {/* Mark all read */}
        <Tooltip content="Mark all as read (a)" position="left">
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

        {/* Settings dropdown */}
        <div className="relative inline-flex" ref={settingsRef}>
          <Tooltip content="Settings" position="left">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-md p-2 hover:bg-[hsl(var(--muted))]"
              aria-label="Settings"
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </Tooltip>

          {/* Settings menu */}
          {showSettings && (
            <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-1 shadow-lg">
              {/* Browser notifications */}
              <button
                onClick={handleNotificationsToggle}
                disabled={!notificationsSupported || !isSecureContext}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-sm',
                  'hover:bg-[hsl(var(--muted))]',
                  (!notificationsSupported || !isSecureContext) && 'cursor-not-allowed opacity-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span>Browser notifications</span>
                </div>
                <div
                  className={cn(
                    'h-5 w-9 rounded-full transition-colors',
                    notificationsEnabled ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'
                  )}
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
                      notificationsEnabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                    )}
                  />
                </div>
              </button>
              {!isSecureContext && notificationsSupported && (
                <p className="px-3 pb-2 text-xs text-[hsl(var(--muted-foreground))]">
                  Requires HTTPS or localhost
                </p>
              )}

              {/* Auto-show new mail */}
              <button
                onClick={() => setAutoShowNewMail(!autoShowNewMail)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span>Auto-show new mail</span>
                </div>
                <div
                  className={cn(
                    'h-5 w-9 rounded-full transition-colors',
                    autoShowNewMail ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'
                  )}
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
                      autoShowNewMail ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                    )}
                  />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
