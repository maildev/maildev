import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Layout } from './components/layout/Layout'
import { CommandPalette } from './components/ui/CommandPalette'
import { useUIStore } from './stores/ui'
import { useEmailList } from './hooks/useEmails'
import { useFaviconBadge } from './hooks/useFaviconBadge'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

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
  // The server keeps the unread count, so it covers the whole inbox rather
  // than just the pages that happen to be loaded
  const { unread } = useEmailList()

  // Update favicon with unread count
  useFaviconBadge(unread)

  // Global keyboard shortcuts
  useKeyboardShortcuts()

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
