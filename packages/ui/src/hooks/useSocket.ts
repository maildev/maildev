import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import type { EmailSummary } from '@maildev/core'
import { useUIStore } from '../stores/ui'
import { markSummaryRead } from './useEmails'
import { getBasePath } from '../lib/basePath'

// Notification debounce - max 1 notification per 2 seconds
let lastNotificationTime = 0
const NOTIFICATION_DEBOUNCE_MS = 2000

// Collapse bursts of mail into a single refetch. Delivering a few hundred
// emails in a second would otherwise queue up one refetch per email.
const REFRESH_COALESCE_MS = 300

/**
 * Show a browser notification for a new email
 */
function showNotification(email: EmailSummary, onSelect: (id: string) => void) {
  const now = Date.now()
  if (now - lastNotificationTime < NOTIFICATION_DEBOUNCE_MS) {
    return
  }
  lastNotificationTime = now

  if ('Notification' in window && Notification.permission === 'granted') {
    const fromAddress = email.from?.[0]?.address ?? 'Unknown sender'
    const notification = new Notification(email.subject || '(no subject)', {
      body: `From: ${fromAddress}`,
      icon: '/favicon.ico',
      tag: email.id, // Prevents duplicate notifications for same email
    })

    notification.onclick = () => {
      window.focus()
      onSelect(email.id)
      notification.close()
    }

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)
  }
}

/**
 * Hook to subscribe to Socket.io events for real-time updates
 */
export function useSocket() {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  // Get settings from store
  const notificationsEnabled = useUIStore((state) => state.notificationsEnabled)
  const autoShowNewMail = useUIStore((state) => state.autoShowNewMail)
  const setSelectedEmail = useUIStore((state) => state.setSelectedEmail)

  // Store refs to avoid dependency issues
  const notificationsEnabledRef = useRef(notificationsEnabled)
  const autoShowNewMailRef = useRef(autoShowNewMail)
  const setSelectedEmailRef = useRef(setSelectedEmail)

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled
  }, [notificationsEnabled])

  useEffect(() => {
    autoShowNewMailRef.current = autoShowNewMail
  }, [autoShowNewMail])

  useEffect(() => {
    setSelectedEmailRef.current = setSelectedEmail
  }, [setSelectedEmail])

  useEffect(() => {
    // Connect to Socket.io
    const socket = io({
      path: `${getBasePath()}/socket.io`,
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    // Trailing-edge coalescing: the first event schedules a refetch and any
    // that arrive before it fires ride along with it.
    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (refreshTimer) {
        return
      }
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        queryClient.invalidateQueries({ queryKey: ['emails'] })
      }, REFRESH_COALESCE_MS)
    }

    socket.on('connect', () => {
      console.log('Socket.io connected')
    })

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected')
    })

    socket.on('newMail', (email: EmailSummary) => {
      scheduleRefresh()

      // Show browser notification if enabled
      if (notificationsEnabledRef.current) {
        showNotification(email, setSelectedEmailRef.current)
      }

      // Auto-show new mail if enabled. Replace rather than push so a stream of
      // arriving mail the user didn't act on doesn't flood browser history.
      if (autoShowNewMailRef.current) {
        setSelectedEmailRef.current(email.id, { replace: true })
      }
    })

    socket.on('deleteMail', (data: { id: string; index?: number }) => {
      scheduleRefresh()
      // Also invalidate the specific email query
      queryClient.invalidateQueries({ queryKey: ['email', data.id] })
    })

    // Another tab opened an email: flip it read in our list without a refetch.
    // Idempotent, so the tab that opened it (already updated) is a no-op.
    socket.on('readMail', (data: { id: string }) => {
      markSummaryRead(queryClient, data.id)
    })

    // Another tab marked everything read: a coalesced refetch is the cheapest
    // way to pull in the new read state and the zeroed unread count.
    socket.on('readAllMail', () => {
      scheduleRefresh()
    })

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
      }
      socket.disconnect()
    }
  }, [queryClient])

  return socketRef.current
}
