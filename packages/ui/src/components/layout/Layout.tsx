import { useSocket } from '../../hooks/useSocket'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { EmailViewer } from '../email-viewer/EmailViewer'
import { useUIStore } from '../../stores/ui'
import { cn } from '../../lib/utils'

export function Layout() {
  // Initialize socket connection for real-time updates
  useSocket()

  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed)

  return (
    <div className="flex h-screen flex-col bg-[hsl(var(--background))]">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            'flex-shrink-0 border-r border-[hsl(var(--border))] transition-all duration-200',
            sidebarCollapsed ? 'w-0' : 'w-80 lg:w-96'
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
