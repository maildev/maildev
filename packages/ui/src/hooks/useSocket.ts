import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import type { Email } from '@maildev/core'

/**
 * Hook to subscribe to Socket.io events for real-time updates
 */
export function useSocket() {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Connect to Socket.io
    const socket = io({
      path: '/socket.io',
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
