/**
 * @maildev/ui
 *
 * React-based web UI for MailDev.
 */

// Dev-time placeholder. This constant is not part of the package's published
// build output (the UI ships as a bundled SPA plus the `./server` entry) and
// the version shown in the app comes from the API, so there is nothing to
// build-stamp here.
export const VERSION = 'development'

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
export { useEmailList, useEmail, useConfig, EMAIL_PAGE_SIZE } from './hooks/useEmails'
export { useSocket } from './hooks/useSocket'
export { useDebouncedValue } from './hooks/useDebouncedValue'

// Re-export stores
export { useUIStore } from './stores/ui'

// Re-export utilities
export { cn, formatDate, formatSize, formatEmailAddress } from './lib/utils'

// Re-export API
export { api } from './lib/api'

// Re-export types
export type * from './types'
