import { useEffect } from 'react'
import { parseEmailRoute } from '../lib/emailRoute'
import { useUIStore } from '../stores/ui'

/** Keep browser back/forward navigation in sync with the selected email. */
export function useEmailRoute(): void {
  useEffect(() => {
    const syncSelectionFromRoute = () => {
      useUIStore.getState().syncSelectedEmailFromRoute(parseEmailRoute(window.location.hash))
    }

    syncSelectionFromRoute()
    window.addEventListener('hashchange', syncSelectionFromRoute)
    return () => window.removeEventListener('hashchange', syncSelectionFromRoute)
  }, [])
}
