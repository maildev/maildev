import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Layout } from './components/layout/Layout'
import { useUIStore } from './stores/ui'
import { useEmails } from './hooks/useEmails'
import { useFaviconBadge } from './hooks/useFaviconBadge'
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
  const { data: emails = [] } = useEmails()

  // Count unread emails
  const unreadCount = useMemo(() => {
    return (emails as Email[]).filter((email) => !email.read).length
  }, [emails])

  // Update favicon with unread count
  useFaviconBadge(unreadCount)

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <Layout />
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
