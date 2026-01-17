import { useMemo, type ReactNode } from 'react'
import {
  useRefreshEmails,
  useDeleteAllEmails,
  useMarkAllRead,
  useConfig,
  useEmails,
} from './useEmails'
import { useUIStore } from '../stores/ui'
import { api } from '../lib/api'
import type { Email } from '@maildev/core'

export interface Command {
  id: string
  title: string
  description?: string
  category: 'email' | 'navigation' | 'settings'
  icon: ReactNode
  action: () => void
  keywords?: string[]
  shortcut?: string
  available?: boolean
}

// Icons as simple SVG components
function RefreshIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}

function SidebarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  )
}

function EyeIcon() {
  return (
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
  )
}

function SendIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  )
}

/**
 * Hook to get all available commands
 */
export function useCommands(): Command[] {
  const { refresh } = useRefreshEmails()
  const deleteAllMutation = useDeleteAllEmails()
  const markAllReadMutation = useMarkAllRead()
  const { data: config } = useConfig()
  const { data: emails = [] } = useEmails()

  const selectedEmailId = useUIStore((s) => s.selectedEmailId)
  const setSelectedEmail = useUIStore((s) => s.setSelectedEmail)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const notificationsEnabled = useUIStore((s) => s.notificationsEnabled)
  const setNotificationsEnabled = useUIStore((s) => s.setNotificationsEnabled)
  const autoShowNewMail = useUIStore((s) => s.autoShowNewMail)
  const setAutoShowNewMail = useUIStore((s) => s.setAutoShowNewMail)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)

  return useMemo(() => {
    const emailList = emails as Email[]
    const currentIndex = emailList.findIndex((e) => e.id === selectedEmailId)

    const commands: Command[] = [
      // Email actions
      {
        id: 'refresh',
        title: 'Refresh emails',
        description: 'Manually refresh the email list',
        category: 'email',
        icon: <RefreshIcon />,
        action: refresh,
        keywords: ['reload', 'sync', 'fetch'],
        shortcut: 'r',
      },
      {
        id: 'mark-all-read',
        title: 'Mark all as read',
        description: 'Mark all emails as read',
        category: 'email',
        icon: <CheckIcon />,
        action: () => markAllReadMutation.mutate(),
        keywords: ['read', 'seen'],
        shortcut: 'a',
      },
      {
        id: 'delete-all',
        title: 'Delete all emails',
        description: 'Delete all emails in the inbox',
        category: 'email',
        icon: <TrashIcon />,
        action: () => {
          if (window.confirm('Are you sure you want to delete all emails?')) {
            deleteAllMutation.mutate()
          }
        },
        keywords: ['remove', 'clear', 'empty'],
      },
      {
        id: 'download-email',
        title: 'Download email',
        description: 'Download selected email as .eml file',
        category: 'email',
        icon: <DownloadIcon />,
        action: () => {
          if (selectedEmailId) {
            window.open(api.emails.downloadUrl(selectedEmailId), '_blank')
          }
        },
        keywords: ['export', 'save', 'eml'],
        available: !!selectedEmailId,
      },
      {
        id: 'delete-email',
        title: 'Delete email',
        description: 'Delete the selected email',
        category: 'email',
        icon: <TrashIcon />,
        action: () => {
          if (selectedEmailId && window.confirm('Delete this email?')) {
            api.emails.delete(selectedEmailId).then(() => {
              setSelectedEmail(null)
              refresh()
            })
          }
        },
        keywords: ['remove'],
        shortcut: 'Del',
        available: !!selectedEmailId,
      },

      // Navigation
      {
        id: 'toggle-sidebar',
        title: 'Toggle sidebar',
        description: 'Show or hide the sidebar',
        category: 'navigation',
        icon: <SidebarIcon />,
        action: toggleSidebar,
        keywords: ['menu', 'panel', 'hide', 'show'],
        shortcut: 's',
      },
      {
        id: 'focus-search',
        title: 'Focus search',
        description: 'Focus the search input',
        category: 'navigation',
        icon: <SearchIcon />,
        action: () => {
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder="Search emails..."]'
          )
          searchInput?.focus()
        },
        keywords: ['find', 'filter'],
        shortcut: '/',
      },
      {
        id: 'next-email',
        title: 'Select next email',
        description: 'Navigate to the next email',
        category: 'navigation',
        icon: <ArrowDownIcon />,
        action: () => {
          if (emailList.length > 0) {
            const nextIndex = currentIndex < emailList.length - 1 ? currentIndex + 1 : 0
            setSelectedEmail(emailList[nextIndex].id)
          }
        },
        keywords: ['down', 'forward'],
        shortcut: 'j',
        available: emailList.length > 0,
      },
      {
        id: 'prev-email',
        title: 'Select previous email',
        description: 'Navigate to the previous email',
        category: 'navigation',
        icon: <ArrowUpIcon />,
        action: () => {
          if (emailList.length > 0) {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : emailList.length - 1
            setSelectedEmail(emailList[prevIndex].id)
          }
        },
        keywords: ['up', 'back'],
        shortcut: 'k',
        available: emailList.length > 0,
      },

      // Settings
      {
        id: 'toggle-theme',
        title: 'Toggle dark mode',
        description: 'Switch between light and dark theme',
        category: 'settings',
        icon: <MoonIcon />,
        action: toggleTheme,
        keywords: ['light', 'dark', 'theme', 'appearance'],
      },
      {
        id: 'toggle-notifications',
        title: notificationsEnabled ? 'Disable notifications' : 'Enable notifications',
        description: 'Toggle browser notifications for new emails',
        category: 'settings',
        icon: <BellIcon />,
        action: () => setNotificationsEnabled(!notificationsEnabled),
        keywords: ['alert', 'notify'],
      },
      {
        id: 'toggle-auto-show',
        title: autoShowNewMail ? 'Disable auto-show' : 'Enable auto-show',
        description: 'Toggle auto-showing new emails when they arrive',
        category: 'settings',
        icon: <EyeIcon />,
        action: () => setAutoShowNewMail(!autoShowNewMail),
        keywords: ['automatic', 'new mail'],
      },
      {
        id: 'clear-search',
        title: 'Clear search',
        description: 'Clear the current search query',
        category: 'navigation',
        icon: <SearchIcon />,
        action: () => setSearchQuery(''),
        keywords: ['reset', 'filter'],
        shortcut: 'c',
      },
    ]

    // Add relay command if outgoing is enabled
    if (config?.isOutgoingEnabled && selectedEmailId) {
      commands.push({
        id: 'relay-email',
        title: 'Relay email',
        description: `Relay to original recipients via ${config.outgoingHost}`,
        category: 'email',
        icon: <SendIcon />,
        action: () => {
          if (window.confirm('Relay this email to the original recipients?')) {
            api.emails.relay(selectedEmailId).then(() => {
              // Could add success notification here
            })
          }
        },
        keywords: ['forward', 'send'],
        available: true,
      })
    }

    return commands
  }, [
    refresh,
    deleteAllMutation,
    markAllReadMutation,
    config,
    emails,
    selectedEmailId,
    setSelectedEmail,
    toggleTheme,
    toggleSidebar,
    notificationsEnabled,
    setNotificationsEnabled,
    autoShowNewMail,
    setAutoShowNewMail,
    setSearchQuery,
  ])
}

/**
 * Filter commands by search query
 */
export function filterCommands(commands: Command[], query: string): Command[] {
  // Filter out unavailable commands
  const availableCommands = commands.filter((cmd) => cmd.available !== false)

  if (!query.trim()) {
    return availableCommands
  }

  const lowerQuery = query.toLowerCase()

  return availableCommands.filter((cmd) => {
    // Match title
    if (cmd.title.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Match description
    if (cmd.description?.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Match keywords
    if (cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))) {
      return true
    }

    return false
  })
}
