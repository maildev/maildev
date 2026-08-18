import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import type { Email } from '@maildev/core'
import { useUIStore } from '../stores/ui'
import { getBasePath } from '../lib/basePath'

// Notification debounce - max 1 notification per 2 seconds
let lastNotificationTime = 0
const NOTIFICATION_DEBOUNCE_MS = 2000

/**
 * Show a browser notification for a new email
 */
function showNotification(email: Email, onSelect: (id: string) => void) {
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

    socket.on('connect', () => {
      console.log('Socket.io connected')
    })

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected')
    })

    socket.on('newMail', (email: Email) => {
      console.log('New email received:', email.id)
      // Invalidate and refetch emails
      queryClient.invalidateQueries({ queryKey: ['emails'] })

      // Show browser notification if enabled
      if (notificationsEnabledRef.current) {
        showNotification(email, setSelectedEmailRef.current)
      }

      // Auto-show new mail if enabled
      if (autoShowNewMailRef.current) {
        setSelectedEmailRef.current(email.id)
      }
    })

    socket.on('deleteMail', (data: { id: string; index?: number }) => {
      console.log('Email deleted:', data.id)
      // Invalidate and refetch emails
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      // Also invalidate the specific email query
      queryClient.invalidateQueries({ queryKey: ['email', data.id] })
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient])

  return socketRef.current
}
