import { useState, useEffect } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { useRefreshEmails } from '../../hooks/useEmails'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { EmailViewer } from '../email-viewer/EmailViewer'
import { useUIStore } from '../../stores/ui'
import { cn } from '../../lib/utils'

export function Layout() {
  // Initialize socket connection for real-time updates
  useSocket()

  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed)
  const { isRefreshing } = useRefreshEmails()

  // Keep loading bar visible for minimum time so it's noticeable
  const [showLoadingBar, setShowLoadingBar] = useState(false)

  useEffect(() => {
    if (isRefreshing) {
      setShowLoadingBar(true)
    } else if (showLoadingBar) {
      // Keep visible for minimum 600ms after loading completes
      const timer = setTimeout(() => setShowLoadingBar(false), 600)
      return () => clearTimeout(timer)
    }
  }, [isRefreshing, showLoadingBar])

  return (
    <div className="flex h-screen flex-col bg-[hsl(var(--background))]">
      {/* Global loading bar */}
      {showLoadingBar && (
        <div className="absolute top-0 left-0 right-0 z-50 h-0.5 overflow-hidden bg-[hsl(var(--primary)/0.2)]">
          <div className="h-full w-1/3 animate-loading-bar bg-[hsl(var(--primary))]" />
        </div>
      )}
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            'flex-shrink-0 overflow-hidden border-r border-[hsl(var(--border))] transition-all duration-200',
            sidebarCollapsed ? 'w-0 border-r-0' : 'w-80 lg:w-96'
          )}
        >
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-hidden">
          <EmailViewer />
        </main>
      </div>
    </div>
  )
}
