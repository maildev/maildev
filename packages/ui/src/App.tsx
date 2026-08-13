import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Layout } from './components/layout/Layout'
import { CommandPalette } from './components/ui/CommandPalette'
import { useUIStore } from './stores/ui'
import { useEmails } from './hooks/useEmails'
import { useFaviconBadge } from './hooks/useFaviconBadge'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useEmailRoute } from './hooks/useEmailRoute'
import type { Email } from '@maildev/core'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: true,
    },
  },
})

function AppContent() {
  const theme = useUIStore((state) => state.theme)
  const openCommandPalette = useUIStore((state) => state.openCommandPalette)
  const { data: emails = [] } = useEmails()

  // Count unread emails
  const unreadCount = useMemo(() => {
    return (emails as Email[]).filter((email) => !email.read).length
  }, [emails])

  // Update favicon with unread count
  useFaviconBadge(unreadCount)

  // Global keyboard shortcuts
  useKeyboardShortcuts()

  // Deep-link the selected email and follow browser back/forward navigation
  useEmailRoute()

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Global keyboard shortcut for command palette (Cmd+K / Ctrl+K)
  // Listen on window to also catch events forwarded from iframes
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        openCommandPalette()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openCommandPalette])

  return (
    <>
      <Layout />
      <CommandPalette />
    </>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
