/**
 * @maildev/ui
 *
 * React-based web UI for MailDev.
 */

export const VERSION = '3.0.0-alpha.0'

// Re-export components for library usage
export { App } from './App'
export { Layout } from './components/layout/Layout'
export { Header } from './components/layout/Header'
export { Sidebar } from './components/layout/Sidebar'
export { EmailList } from './components/email-list/EmailList'
export { EmailListItem } from './components/email-list/EmailListItem'
export { SearchInput } from './components/email-list/SearchInput'
export { EmailViewer } from './components/email-viewer/EmailViewer'
export { EmailHeader } from './components/email-viewer/EmailHeader'
export { EmailContent } from './components/email-viewer/EmailContent'

// Re-export hooks
export { useEmails, useEmail, useConfig, filterEmails } from './hooks/useEmails'
export { useSocket } from './hooks/useSocket'

// Re-export stores
export { useUIStore } from './stores/ui'

// Re-export utilities
export { cn, formatDate, formatSize, formatEmailAddress } from './lib/utils'

// Re-export API
export { api } from './lib/api'

// Re-export types
export type * from './types'
